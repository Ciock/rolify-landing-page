// Regenerates assets/qr.svg, the QR shown on the desktop hero.
//
//   npm i --no-save qrcode   # generator only, not a repo dependency
//   node scripts/qr.mjs
//
// Pass a different address to point the QR somewhere else:
//
//   node scripts/qr.mjs "https://example.com/?utm_source=reddit"
//
// Settings below reproduce the original file byte for byte, so a domain change
// is the only thing a regenerated QR ever shows in the diff.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const SITE_URL = "https://rolify-app.pages.dev/";
const DEFAULT_TARGET = `${SITE_URL}?utm_source=reddit&utm_campaign=desktop_qr`;
const PROLOG =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

const target = process.argv[2] ?? DEFAULT_TARGET;

// Resolved at run time so the repo keeps no permanent dependency.
const require = createRequire(import.meta.url);
let QRCode;
try {
  QRCode = require("qrcode");
} catch {
  console.error("qrcode is not installed. Run: npm i --no-save qrcode");
  process.exit(1);
}

const svg = await QRCode.toString(target, {
  type: "svg",
  margin: 2,
  errorCorrectionLevel: "M",
});

writeFileSync(new URL("../assets/qr.svg", import.meta.url), PROLOG + svg.trimEnd());
console.log(`assets/qr.svg -> ${target}`);
