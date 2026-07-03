// vpn-blocker.js
// ============================================================
// Blocks VPN/proxy/hosting-provider traffic and traffic from
// blocked countries (India, by default config). Every IP's
// decision is cached in memory AND persisted to a JSON file on
// disk, so once an IP has been checked once, it is never checked
// again via the API until its cache entry expires (default 30
// days — see vpn-blocker-config.js).
//
// Bypass is IP-whitelist only. There are no per-route exemptions
// for admin/employee pages — if you want an employee's connection
// to always get through, put their IP in ALWAYS_ALLOWED_IPS in
// vpn-blocker-config.js (or use manage-ips.js to add it live).
// ============================================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const config = require("./vpn-blocker-config");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "ip-access.json");

// ------------------------------------------------------------
// In-memory state (source of truth while the process is running)
// ------------------------------------------------------------
// decisions: Map<ip, { blocked: boolean, reason: string, timestamp: number }>
const decisions = new Map();

// whitelist / blocklist that can grow at runtime (via manage-ips.js
// or the optional admin endpoint below), on top of the static
// config lists. These never expire.
const runtimeWhitelist = new Set();
const runtimeBlocklist = new Set();

let dirty = false; // set true whenever in-memory state changes and needs a disk flush

// ------------------------------------------------------------
// Load persisted state at startup
// ------------------------------------------------------------
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        { decisions: {}, runtimeWhitelist: [], runtimeBlocklist: [] },
        null,
        2
      )
    );
  }
}

function loadFromDisk() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (parsed.decisions) {
      for (const [ip, val] of Object.entries(parsed.decisions)) {
        decisions.set(ip, val);
      }
    }
    (parsed.runtimeWhitelist || []).forEach((ip) => runtimeWhitelist.add(ip));
    (parsed.runtimeBlocklist || []).forEach((ip) => runtimeBlocklist.add(ip));

    console.log(
      `🗂️  VPN blocker loaded ${decisions.size} cached IP decisions, ` +
        `${runtimeWhitelist.size} whitelisted, ${runtimeBlocklist.size} blocklisted (from disk)`
    );
  } catch (err) {
    console.error("❌ VPN blocker: failed to load ip-access.json, starting fresh:", err.message);
  }
}

function saveToDisk() {
  if (!dirty) return;
  try {
    const payload = {
      decisions: Object.fromEntries(decisions),
      runtimeWhitelist: Array.from(runtimeWhitelist),
      runtimeBlocklist: Array.from(runtimeBlocklist),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
    dirty = false;
  } catch (err) {
    console.error("❌ VPN blocker: failed to save ip-access.json:", err.message);
  }
}

// Flush to disk periodically (every 15s) instead of on every single
// request, so we don't hammer the disk under load.
const flushInterval = setInterval(saveToDisk, 15 * 1000);
flushInterval.unref(); // don't keep the process alive just for this timer

// Flush on graceful shutdown so we don't lose the last few minutes
// of decisions.
process.on("SIGINT", () => {
  saveToDisk();
  process.exit(0);
});
process.on("SIGTERM", () => {
  saveToDisk();
  process.exit(0);
});

// Clean expired decisions out of memory once an hour.
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [ip, val] of decisions.entries()) {
    if (now - val.timestamp > config.DECISION_TTL_MS) {
      decisions.delete(ip);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    dirty = true;
    console.log(`🧹 VPN blocker: removed ${cleaned} expired IP decisions`);
  }
}, 60 * 60 * 1000).unref();

loadFromDisk();

// ------------------------------------------------------------
// Rate limiting for outbound geolocation API calls
// ------------------------------------------------------------
let apiCallCount = 0;
let windowStart = Date.now();

function canMakeApiCall() {
  const now = Date.now();
  if (now - windowStart > 60 * 1000) {
    apiCallCount = 0;
    windowStart = now;
  }
  if (apiCallCount >= config.MAX_API_CALLS_PER_MINUTE) {
    return false;
  }
  apiCallCount++;
  return true;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function getClientIp(req) {
  // Requires app.set('trust proxy', 1) in server.js so Express
  // parses X-Forwarded-For correctly behind Nginx.
  let ip = req.ip || req.socket.remoteAddress || "";
  // Normalize IPv6-mapped IPv4 addresses like ::ffff:1.2.3.4
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip.trim();
}

function isPrivateOrLocalIp(ip) {
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function shouldSkipStatic(reqPath) {
  return config.STATIC_SKIP_PATHS.some((p) => reqPath.startsWith(p));
}

function isStaticWhitelisted(ip) {
  return config.ALWAYS_ALLOWED_IPS.includes(ip) || runtimeWhitelist.has(ip);
}

function isStaticBlocklisted(ip) {
  return config.ALWAYS_BLOCKED_IPS.includes(ip) || runtimeBlocklist.has(ip);
}

function recordDecision(ip, blocked, reason) {
  decisions.set(ip, { blocked, reason, timestamp: Date.now() });
  dirty = true;
}

function sendBlocked(req, res) {
  return res
    .status(403)
    .sendFile(path.join(__dirname, "public", "restricted.html"));
}

// ------------------------------------------------------------
// The middleware
// ------------------------------------------------------------
async function vpnCountryBlocker(req, res, next) {
  try {
    if (shouldSkipStatic(req.path)) return next();

    const clientIp = getClientIp(req);
    if (!clientIp) return next(); // can't identify IP, fail open

    if (isPrivateOrLocalIp(clientIp)) return next();

    // 1. Manual blocklist wins over everything.
    if (isStaticBlocklisted(clientIp)) {
      console.log(`🚫 Blocklisted IP: ${clientIp}`);
      return sendBlocked(req, res);
    }

    // 2. Manual whitelist bypasses all checks.
    if (isStaticWhitelisted(clientIp)) {
      return next();
    }

    // 3. Cached decision (memory, backed by disk) — no API call needed.
    const cached = decisions.get(clientIp);
    if (cached && Date.now() - cached.timestamp < config.DECISION_TTL_MS) {
      if (cached.blocked) {
        console.log(`🚫 Blocked (cached, ${cached.reason}): ${clientIp}`);
        return sendBlocked(req, res);
      }
      return next();
    }

    // 4. No usable cache entry — check rate limit before calling the API.
    if (!canMakeApiCall()) {
      console.warn(`⚠️ VPN blocker: rate limit hit, allowing ${clientIp} unchecked this time`);
      return next(); // don't cache — we'll properly check it on a later request
    }

    // 5. Call the geolocation/proxy-detection API.
    //    ip-api.com free endpoint returns both country and proxy/hosting
    //    flags in a single call, so one request covers both checks.
    let apiData;
    try {
      const response = await axios.get(
        `http://ip-api.com/json/${clientIp}?fields=status,message,countryCode,proxy,hosting`,
        { timeout: 5000 }
      );
      apiData = response.data;
    } catch (err) {
      console.error(`⏱️ VPN blocker: API call failed for ${clientIp}:`, err.message);
      if (config.FAIL_OPEN_ON_API_ERROR) return next();
      return sendBlocked(req, res);
    }

    if (apiData.status === "fail") {
      console.error(`❌ VPN blocker: API returned fail for ${clientIp}: ${apiData.message}`);
      if (config.FAIL_OPEN_ON_API_ERROR) return next();
      return sendBlocked(req, res);
    }

    const isVpnOrHosting = apiData.proxy === true || apiData.hosting === true;
    const isBlockedCountry = config.BLOCKED_COUNTRY_CODES.includes(apiData.countryCode);

    if (isVpnOrHosting || isBlockedCountry) {
      const reason = isVpnOrHosting ? "vpn/proxy" : `country:${apiData.countryCode}`;
      recordDecision(clientIp, true, reason);
      console.log(`🚫 Blocked (${reason}): ${clientIp}`);
      return sendBlocked(req, res);
    }

    recordDecision(clientIp, false, "allowed");
    console.log(`✅ Allowed: ${clientIp} (${apiData.countryCode})`);
    return next();
  } catch (err) {
    // Anything unexpected: fail open so a bug here never takes the
    // whole site down for legitimate customers.
    console.error("❌ VPN blocker: unexpected error, allowing request:", err.message);
    return next();
  }
}

// ------------------------------------------------------------
// Small helpers exposed for other parts of the app (e.g. /retry route)
// ------------------------------------------------------------
function clearIpDecision(ip) {
  if (decisions.delete(ip)) dirty = true;
}

function addToWhitelist(ip) {
  runtimeWhitelist.add(ip);
  runtimeBlocklist.delete(ip);
  decisions.delete(ip);
  dirty = true;
  saveToDisk();
}

function addToBlocklist(ip) {
  runtimeBlocklist.add(ip);
  runtimeWhitelist.delete(ip);
  decisions.delete(ip);
  dirty = true;
  saveToDisk();
}

function removeFromLists(ip) {
  runtimeWhitelist.delete(ip);
  runtimeBlocklist.delete(ip);
  decisions.delete(ip);
  dirty = true;
  saveToDisk();
}

module.exports = {
  vpnCountryBlocker,
  clearIpDecision,
  addToWhitelist,
  addToBlocklist,
  removeFromLists,
  _saveToDisk: saveToDisk, // exposed for the CLI script
};