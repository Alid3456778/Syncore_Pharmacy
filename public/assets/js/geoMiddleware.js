const geoip = require("geoip-lite");

const allowedCountries = [
  "US", // United States
  "AU", // Australia
  "GB", "FR", "DE", "IT", "ES", "NL", "SE", "CH", "BE", "AT", "IE", "NO", "DK", "FI", "PT", "GR" 
  // Add more European country codes if needed
];

const geoMiddleware = (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);

  if (!geo || !allowedCountries.includes(geo.country)) {
    return res.redirect("/restricted");
  }

  next();
};

module.exports = geoMiddleware;
