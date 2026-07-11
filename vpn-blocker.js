// vpn-blocker.js
//
// Self-contained VPN + Country (India) blocking middleware for Express.
//
// HOW IT WORKS (fast -> slow, so almost no requests ever hit a rate-limited API):
//   1. Static assets / the block page / retry route are always allowed through.
//   2. Private/localhost IPs are always allowed (dev machines).
//   3. Manually whitelisted IPs (employees/admins) always pass - no checks, ever.
//   4. If we've already decided about this browser (cookie) -> instant decision.
//   5. If we've already decided about this exact IP (persistent cache) -> instant decision.
//   6. Otherwise check the IP against locally-held CIDR lists (India + known VPN
//      networks). These lists are downloaded from public GitHub-hosted mirrors,
//      refreshed automatically every few days, and checked in-memory with zero
//      network calls - free and effectively unlimited.
//   7. Only if step 6 is inconclusive (residential proxy, unlisted range, IPv6...)
//      do we fall back to the proxycheck.io API, which is rate-limited, so its
//      result is cached (until TTL) and we never ask about that IP again for a while.
//
// Everything decided (blocked or allowed) is written to disk
// (data/ip-cache.json) so restarts don't lose the work, on top of the in-memory
// cache used for speed.
//
// ENV VARS (all optional):
//   PROXYCHECK_API_KEY   - free key from proxycheck.io. Without it you still get
//                           100 free lookups/day (shared per server IP); with a
//                           free key you get 1000/day. The local CIDR lists
//                           absorb the vast majority of traffic, so either is
//                           normally plenty for a small-to-medium storefront.
//   ALLOWED_IPS           - comma-separated list of IPs that always bypass every
//                           check (employees, office, etc). Merged with
//                           data/allowed-ips.json.
//   BLOCK_DATACENTER_IPS  - "true" to also block generic datacenter/hosting IPs
//                           (broader net, small risk of false positives on
//                           corporate NAT gateways). Default: off. VPN-specific
//                           ranges are always blocked regardless of this flag.

const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ============================================================
// 👉 YOUR WHITELISTED IPs — edit this array directly, no other
//    file needs to change. These IPs always bypass every VPN/
//    country check, no exceptions. Restart the server after
//    editing this for it to take effect.
//
//    Example:
//    const MANUALLY_ALLOWED_IPS = [
//      "203.0.113.10",   // my home IP
//      "198.51.100.20",  // office IP
//    ];
//
//    Don't know your IP? Visit https://www.whatismyipaddress.com/
//    from the connection you want to whitelist.
// ============================================================
const MANUALLY_ALLOWED_IPS = [
  // "203.0.113.10",
  "106.193.223.165",
];

// ============================================================
// CONFIG
// ============================================================
const DATA_DIR = path.join(__dirname, "data");
const LISTS_DIR = path.join(DATA_DIR, "lists");
const ALLOWED_IPS_FILE = path.join(DATA_DIR, "allowed-ips.json");
const IP_CACHE_FILE = path.join(DATA_DIR, "ip-cache.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const LIST_URLS = {
  india: "https://raw.githubusercontent.com/ipverse/rir-ip/master/country/in/ipv4-aggregated.txt",
  vpn: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt",
  datacenter: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt",
};

const BLOCK_DATACENTER_IPS = process.env.BLOCK_DATACENTER_IPS === "true";
const LIST_REFRESH_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // refresh CIDR lists every 3 days
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h for confirmed allow/block verdicts
const CACHE_TTL_ON_ERROR_MS = 30 * 60 * 1000; // short TTL when we fail-open due to an error
const MAX_CACHE_ENTRIES = 50000; // LRU cap so memory/disk can't grow unbounded
const SAVE_DEBOUNCE_MS = 5000;

const PROXYCHECK_API_KEY = process.env.PROXYCHECK_API_KEY || "";
const PROXYCHECK_TIMEOUT_MS = 4000;
const MAX_API_CALLS_PER_DAY = PROXYCHECK_API_KEY ? 900 : 90; // margin under the 1000/100 free limits

const STATIC_EXT_RE =
  /\.(css|js|mjs|map|png|jpe?g|gif|svg|ico|webp|avif|bmp|woff2?|ttf|eot|otf|mp4|webm|txt|xml|json|pdf)$/i;
const ALWAYS_ALLOW_PATHS = new Set(["/restricted.html", "/retry"]);

// ============================================================
// SETUP DIRS
// ============================================================
for (const dir of [DATA_DIR, LISTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============================================================
// IP <-> INTEGER HELPERS + CIDR RANGE TABLES
// ============================================================
function ipToLong(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function parseCidrLine(line) {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;
  const [ipPart, prefixPart] = line.split("/");
  const ipLong = ipToLong(ipPart);
  if (ipLong === null) return null;
  const prefix = prefixPart === undefined ? 32 : parseInt(prefixPart, 10);
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const start = (ipLong & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return [start, end];
}

// Builds a sorted, merged, disjoint range table from raw CIDR text so lookups
// can use a simple binary search.
function buildRangeTable(rawText) {
  const ranges = [];
  for (const line of rawText.split("\n")) {
    const r = parseCidrLine(line);
    if (r) ranges.push(r);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) {
      if (end > last[1]) last[1] = end;
    } else {
      merged.push([start, end]);
    }
  }

  const starts = new Uint32Array(merged.length);
  const ends = new Uint32Array(merged.length);
  merged.forEach(([s, e], i) => {
    starts[i] = s;
    ends[i] = e;
  });
  return { starts, ends };
}

function ipInTable(ipLong, table) {
  if (!table || table.starts.length === 0) return false;
  let lo = 0,
    hi = table.starts.length - 1,
    ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (table.starts[mid] <= ipLong) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans === -1) return false;
  return ipLong <= table.ends[ans];
}

// ============================================================
// CIDR LIST LOADING / AUTO-REFRESH (India + VPN + Datacenter)
// ============================================================
const tables = { india: null, vpn: null, datacenter: null };

async function refreshList(name, url) {
  const file = path.join(LISTS_DIR, `${name}.txt`);
  try {
    const res = await axios.get(url, {
      timeout: 20000,
      headers: { "User-Agent": "vpn-blocker/1.0" },
    });
    fs.writeFileSync(file, res.data);
    tables[name] = buildRangeTable(res.data);
    console.log(`IP list refreshed: ${name} (${tables[name].starts.length} ranges)`);
    return true;
  } catch (err) {
    console.error(`Failed to download ${name} list: ${err.message}`);
    // Fall back to whatever we last saved to disk, if anything.
    if (!tables[name] && fs.existsSync(file)) {
      try {
        tables[name] = buildRangeTable(fs.readFileSync(file, "utf8"));
        console.log(`Using cached-on-disk ${name} list (${tables[name].starts.length} ranges)`);
      } catch (readErr) {
        console.error(`Could not read cached ${name} list either: ${readErr.message}`);
      }
    }
    return false;
  }
}

async function refreshAllLists() {
  await Promise.all([
    refreshList("india", LIST_URLS.india),
    refreshList("vpn", LIST_URLS.vpn),
    BLOCK_DATACENTER_IPS ? refreshList("datacenter", LIST_URLS.datacenter) : Promise.resolve(),
  ]);
}

// Kick off an initial load immediately (don't block server startup on it -
// until it resolves, local-list checks simply miss and fall through to the
// API layer, which fails open on error anyway).
refreshAllLists();
setInterval(refreshAllLists, LIST_REFRESH_INTERVAL_MS);

// ============================================================
// PERSISTENT STORES: employee/manual allow-list + auto-decision cache
// ============================================================
function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`Could not read ${file}: ${err.message}`);
  }
  return fallback;
}

// ---- Manual allow-list (permanent, never expires, never re-checked) ----
// Merges three sources, in this order: the MANUALLY_ALLOWED_IPS array at the
// top of this file, the ALLOWED_IPS env var, and data/allowed-ips.json
// (written to automatically when addAllowedIp() is called from code).
const allowedIpSet = new Set();

function isValidIpFormat(ip) {
  // Accepts IPv4 and basic IPv6 — just enough validation to catch typos
  // (extra spaces, missing octets, stray characters) without crashing.
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || ip.includes(":");
}

(function loadAllowedIps() {
  let skippedInvalid = 0;

  for (const ip of MANUALLY_ALLOWED_IPS) {
    const trimmed = String(ip).trim();
    if (!trimmed) continue;
    if (!isValidIpFormat(trimmed)) {
      skippedInvalid++;
      console.warn(`⚠️  Skipping invalid entry in MANUALLY_ALLOWED_IPS: "${ip}"`);
      continue;
    }
    allowedIpSet.add(trimmed);
  }

  const stored = loadJson(ALLOWED_IPS_FILE, {});
  for (const ip of Object.keys(stored)) allowedIpSet.add(ip);

  const fromEnv = (process.env.ALLOWED_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const ip of fromEnv) allowedIpSet.add(ip);

  console.log(
    `👔 Loaded ${allowedIpSet.size} whitelisted IP(s)` +
      (skippedInvalid ? ` (${skippedInvalid} invalid entr${skippedInvalid === 1 ? "y" : "ies"} skipped)` : "")
  );
})();

function addAllowedIp(ip, label = "manually added") {
  allowedIpSet.add(ip);
  const stored = loadJson(ALLOWED_IPS_FILE, {});
  stored[ip] = { addedAt: Date.now(), label };
  fs.writeFileSync(ALLOWED_IPS_FILE, JSON.stringify(stored, null, 2));
}

// ---- Auto-decision cache (allowed/blocked verdicts, LRU + TTL, persisted) ----
const ipCache = new Map(); // ip -> { status: 'allowed'|'blocked', reason, ts, ttl }
(function loadCache() {
  const stored = loadJson(IP_CACHE_FILE, {});
  for (const [ip, entry] of Object.entries(stored)) {
    ipCache.set(ip, entry);
  }
  console.log(`Loaded ${ipCache.size} cached IP verdict(s)`);
})();

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const obj = Object.fromEntries(ipCache);
    fs.writeFile(IP_CACHE_FILE, JSON.stringify(obj), (err) => {
      if (err) console.error(`Could not persist IP cache: ${err.message}`);
    });
  }, SAVE_DEBOUNCE_MS);
}

function setCacheEntry(ip, status, reason, ttl) {
  // Re-inserting moves the key to the "end" of Map's iteration order, which
  // combined with deleting the oldest key on overflow gives us simple LRU.
  if (ipCache.has(ip)) ipCache.delete(ip);
  ipCache.set(ip, { status, reason, ts: Date.now(), ttl });
  if (ipCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = ipCache.keys().next().value;
    ipCache.delete(oldestKey);
  }
  scheduleSave();
}

// Clean expired entries once an hour so the persisted file doesn't bloat.
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [ip, entry] of ipCache.entries()) {
    const ttl = entry.ttl || CACHE_TTL_MS;
    if (now - entry.ts > ttl) {
      ipCache.delete(ip);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`IP cache cleaned: ${cleaned} expired entries removed`);
    scheduleSave();
  }
}, 60 * 60 * 1000);

// ============================================================
// PROXYCHECK.IO FALLBACK (only for IPs the local lists can't resolve)
// ============================================================
let apiCallsToday = 0;
let apiCallDay = new Date().toDateString();

function canMakeApiCall() {
  const today = new Date().toDateString();
  if (today !== apiCallDay) {
    apiCallDay = today;
    apiCallsToday = 0;
  }
  if (apiCallsToday >= MAX_API_CALLS_PER_DAY) return false;
  apiCallsToday++;
  return true;
}

// Returns 'blocked' | 'allowed' | 'unknown' (unknown = couldn't determine, fail open)
async function checkWithProxyCheckApi(ip) {
  if (!canMakeApiCall()) {
    console.warn(`proxycheck.io daily quota reached, allowing ${ip} without an API check`);
    return "unknown";
  }
  try {
    const keyParam = PROXYCHECK_API_KEY ? `&key=${PROXYCHECK_API_KEY}` : "";
    const url = `https://proxycheck.io/v2/${ip}?vpn=1&asn=0${keyParam}`;
    const res = await axios.get(url, { timeout: PROXYCHECK_TIMEOUT_MS });
    const data = res.data && res.data[ip];
    if (!data) return "unknown";

    if (data.proxy === "yes") return "blocked"; // covers VPN, proxy, TOR, etc.
    if (data.isocode === "IN") return "blocked"; // belt-and-suspenders on country
    return "allowed";
  } catch (err) {
    console.error(`proxycheck.io check failed for ${ip}: ${err.message}`);
    return "unknown";
  }
}

// ============================================================
// MIDDLEWARE
// ============================================================
function isPrivateOrLocalIp(ip) {
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function getClientIp(req) {
  let ip = (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    req.connection?.remoteAddress ||
    ""
  ).trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

async function vpnCountryBlocker(req, res, next) {
  try {
    // 1) Always-allowed paths (the block page itself, retry, and static assets)
    if (ALWAYS_ALLOW_PATHS.has(req.path) || STATIC_EXT_RE.test(req.path)) {
      return next();
    }

    const ip = getClientIp(req);
    if (!ip) return next(); // can't determine IP -- fail open rather than lock everyone out

    // 2) Dev/local IPs
    if (isPrivateOrLocalIp(ip)) {
      return next();
    }

    // 3) Manual employee/admin whitelist -- always wins, no cookies, no cache needed
    if (allowedIpSet.has(ip)) {
      return next();
    }

    // 4) Cookie shortcuts (avoids even a Map lookup on repeat requests)
    if (req.cookies.access_blocked === "true") {
      return res.status(403).sendFile(path.join(PUBLIC_DIR, "restricted.html"));
    }
    if (req.cookies.access_allowed === "true") {
      return next();
    }

    // 5) Persistent/in-memory verdict cache
    const cached = ipCache.get(ip);
    if (cached && Date.now() - cached.ts < (cached.ttl || CACHE_TTL_MS)) {
      if (cached.status === "blocked") {
        res.cookie("access_blocked", "true", { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
        console.log(`Blocked (cached, ${cached.reason}): ${ip}`);
        return res.status(403).sendFile(path.join(PUBLIC_DIR, "restricted.html"));
      }
      res.cookie("access_allowed", "true", { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
      return next();
    }

    // 6) Local CIDR list check -- free, instant, unlimited
    let verdict = null;
    let reason = null;
    const ipLong = ip.includes(":") ? null : ipToLong(ip);

    if (ipLong !== null) {
      if (ipInTable(ipLong, tables.india)) {
        verdict = "blocked";
        reason = "country:IN";
      } else if (ipInTable(ipLong, tables.vpn)) {
        verdict = "blocked";
        reason = "vpn";
      } else if (BLOCK_DATACENTER_IPS && ipInTable(ipLong, tables.datacenter)) {
        verdict = "blocked";
        reason = "datacenter";
      }
    }

    // 7) Ambiguous -> fall back to the rate-limited API (residential proxies,
    //    unlisted ranges, IPv6 addresses)
    if (verdict === null) {
      const apiVerdict = await checkWithProxyCheckApi(ip);
      if (apiVerdict === "unknown") {
        // Fail open, but re-check soon rather than trusting this permanently
        setCacheEntry(ip, "allowed", "api-unavailable", CACHE_TTL_ON_ERROR_MS);
        return next();
      }
      verdict = apiVerdict;
      reason = apiVerdict === "blocked" ? "api:vpn-or-country" : "api:clean";
    }

    setCacheEntry(ip, verdict, reason, CACHE_TTL_MS);

    if (verdict === "blocked") {
      res.cookie("access_blocked", "true", { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
      console.log(`Blocked (${reason}): ${ip}`);
      return res.status(403).sendFile(path.join(PUBLIC_DIR, "restricted.html"));
    }

    res.cookie("access_allowed", "true", { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    console.log(`Allowed: ${ip}`);
    return next();
  } catch (err) {
    console.error("vpn-blocker middleware error:", err.message);
    return next(); // fail open -- never take the whole site down over a bug here
  }
}

// ============================================================
// /retry ROUTE HANDLER -- clears cookies + cache so a user can re-check
// (e.g. after turning their VPN off)
// ============================================================
function retryHandler(req, res) {
  const ip = getClientIp(req);
  if (ip) {
    ipCache.delete(ip);
    scheduleSave();
  }
  res.clearCookie("access_blocked");
  res.clearCookie("access_allowed");
  console.log(`Retry requested for ${ip}`);
  res.redirect("/");
}

module.exports = {
  vpnCountryBlocker,
  retryHandler,
  addAllowedIp,
  // exposed for debugging/monitoring only
  _stats: () => ({
    cacheSize: ipCache.size,
    allowedIpCount: allowedIpSet.size,
    apiCallsToday,
    listsSizes: {
      india: tables.india ? tables.india.starts.length : 0,
      vpn: tables.vpn ? tables.vpn.starts.length : 0,
      datacenter: tables.datacenter ? tables.datacenter.starts.length : 0,
    },
  }),
};