// vpn-blocker-config.js
// ============================================================
// Static, hand-edited config. Safe to edit any time — no restart
// logic depends on file parsing tricks, just plain JS.
// ============================================================

module.exports = {
  // IPs that should ALWAYS be let through, no matter what the
  // geolocation/VPN check says (your office, your own home IP,
  // monitoring services, etc). Add as many as you want.
  // Find your current IP at https://www.whatismyipaddress.com/
  ALWAYS_ALLOWED_IPS: [
    // "203.0.113.10",
    // "198.51.100.25",
  ],

  // IPs that should ALWAYS be blocked, no matter what.
  ALWAYS_BLOCKED_IPS: [
    // "1.2.3.4",
  ],

  // Country codes to block (ISO 3166-1 alpha-2). India = "IN".
  BLOCKED_COUNTRY_CODES: ["IN"],

  // How long an auto-detected decision (allow or block) is trusted
  // before we re-check that IP with the geolocation API again.
  // IPs get reassigned between people over time, so this shouldn't
  // be "forever" — 30 days is a reasonable balance between saving
  // API calls and not permanently mis-judging an IP.
  DECISION_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 days

  // ip-api.com free tier allows 45 requests/minute per IP of your
  // server. We stay under that.
  MAX_API_CALLS_PER_MINUTE: 40,

  // If the geolocation API fails or times out, should we allow or
  // block the request? "true" = fail-open (allow). Fail-open avoids
  // locking out real customers during an API outage, at the cost of
  // occasionally letting an unchecked visitor through temporarily.
  FAIL_OPEN_ON_API_ERROR: true,

  // Paths that are pure static infrastructure (not a "route" in the
  // business sense) and must stay reachable even for blocked users,
  // otherwise the restricted page itself can't load its CSS/JS/images.
  STATIC_SKIP_PATHS: [
    "/assets/",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/restricted.html",
    "/retry",
  ],
};