// manage-ips.js
// ============================================================
// Small command-line helper to manage the runtime whitelist /
// blocklist without touching code or restarting the server.
//
// Usage (run from the same folder as server.js on your VPS):
//   node manage-ips.js allow 203.0.113.10
//   node manage-ips.js block 1.2.3.4
//   node manage-ips.js remove 203.0.113.10
//   node manage-ips.js list
//
// This edits data/ip-access.json directly. If the server is
// running, restart it (pm2 restart <name>) after making changes
// so the running process picks up the new file. (The main
// vpn-blocker.js module only re-reads this file at startup.)
// ============================================================

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "ip-access.json");

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return { decisions: {}, runtimeWhitelist: [], runtimeBlocklist: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function main() {
  const [, , cmd, ip] = process.argv;
  const data = load();
  data.runtimeWhitelist = data.runtimeWhitelist || [];
  data.runtimeBlocklist = data.runtimeBlocklist || [];
  data.decisions = data.decisions || {};

  if (cmd === "list") {
    console.log("Whitelisted IPs:", data.runtimeWhitelist);
    console.log("Blocklisted IPs:", data.runtimeBlocklist);
    console.log(`Cached decisions: ${Object.keys(data.decisions).length} IPs`);
    return;
  }

  if (!ip) {
    console.log("Usage: node manage-ips.js <allow|block|remove|list> [ip]");
    process.exit(1);
  }

  if (cmd === "allow") {
    data.runtimeWhitelist = [...new Set([...data.runtimeWhitelist, ip])];
    data.runtimeBlocklist = data.runtimeBlocklist.filter((x) => x !== ip);
    delete data.decisions[ip];
    save(data);
    console.log(`✅ ${ip} added to whitelist`);
  } else if (cmd === "block") {
    data.runtimeBlocklist = [...new Set([...data.runtimeBlocklist, ip])];
    data.runtimeWhitelist = data.runtimeWhitelist.filter((x) => x !== ip);
    delete data.decisions[ip];
    save(data);
    console.log(`🚫 ${ip} added to blocklist`);
  } else if (cmd === "remove") {
    data.runtimeWhitelist = data.runtimeWhitelist.filter((x) => x !== ip);
    data.runtimeBlocklist = data.runtimeBlocklist.filter((x) => x !== ip);
    delete data.decisions[ip];
    save(data);
    console.log(`➖ ${ip} removed from both lists and cache`);
  } else {
    console.log("Usage: node manage-ips.js <allow|block|remove|list> [ip]");
    process.exit(1);
  }

  console.log("⚠️  Restart the server for the running process to pick up this change:");
  console.log("    pm2 restart <your-app-name>");
}

main();