const crypto = require("crypto");

// /lib/slugGenerator.js

function generateRandomAlphanumeric(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function toSlug(name = "") {
  return name
    .toString()
    .toLowerCase()
    .normalize("NFKD") // decompose accents
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alnum => hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // collapse multiple hyphens
}

function generateSlug(name, suffixLength = 6) {
  const slugBase = toSlug(name);
  const suffix = generateRandomAlphanumeric(suffixLength);
  return slugBase ? `${slugBase}-${suffix}` : suffix;
}

module.exports = generateSlug;
