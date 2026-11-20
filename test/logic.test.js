import { test } from "node:test";
import assert from "node:assert/strict";
import { storeLinks, needsConsent, detectPlatform } from "../js/logic.js";

const referrerOf = (android) => new URLSearchParams(new URL(android).searchParams.get("referrer"));
const ctOf = (ios) => new URL(ios).searchParams.get("ct");

test("no params defaults to reddit / paid_social", () => {
  const { ios, android } = storeLinks("");
  assert.equal(ios, "https://apps.apple.com/app/id1511308478?ct=reddit");
  const url = new URL(android);
  assert.equal(url.searchParams.get("id"), "com.lucaoropallo.rolify");
  assert.equal(url.searchParams.get("referrer"), "utm_source=reddit&utm_medium=paid_social");
});

test("all five utm params reach both stores", () => {
  const { ios, android } = storeLinks(
    "?utm_source=reddit&utm_medium=paid&utm_campaign=nov-videos&utm_content=layers-v&utm_term=ag1",
  );
  assert.equal(ctOf(ios), "reddit-nov-videos-layers-v");
  assert.equal(
    new URL(android).searchParams.get("referrer"),
    "utm_source=reddit&utm_medium=paid&utm_campaign=nov-videos&utm_content=layers-v&utm_term=ag1",
  );
});

test("only utm_source present keeps the other defaults and omits missing params", () => {
  const { ios, android } = storeLinks("?utm_source=discord");
  assert.equal(ctOf(ios), "discord");
  const referrer = referrerOf(android);
  assert.equal(referrer.get("utm_source"), "discord");
  assert.equal(referrer.get("utm_medium"), "paid_social");
  for (const key of ["utm_campaign", "utm_content", "utm_term"]) assert.equal(referrer.has(key), false);
});

test("ct skips a missing campaign or content", () => {
  assert.equal(ctOf(storeLinks("?utm_campaign=dm_tavern").ios), "reddit-dm_tavern");
  assert.equal(ctOf(storeLinks("?utm_content=layers-v").ios), "reddit-layers-v");
});

test("long campaign is shortened so the content survives, ct <= 40", () => {
  const content = "layers-v";
  const { ios } = storeLinks(`?utm_campaign=${"c".repeat(60)}&utm_content=${content}`);
  const ct = ctOf(ios);
  assert.ok(ct.length <= 40);
  assert.ok(ct.endsWith(`-${content}`));
  assert.ok(ct.startsWith("reddit-c"));
});

test("ct is hard-capped when source and content alone are too long", () => {
  const { ios } = storeLinks(`?utm_campaign=abc&utm_content=${"x".repeat(60)}`);
  const ct = ctOf(ios);
  assert.equal(ct.length, 40);
  assert.equal(ct.includes("abc"), false);
});

test("spaces and symbols: ct sanitized, referrer keeps the raw value encoded", () => {
  const { ios, android } = storeLinks("?utm_campaign=a%20b%26c&utm_content=x%2Fy%3Dz");
  assert.equal(ctOf(ios), "reddit-a-b-c-x-y-z");
  const referrer = referrerOf(android);
  assert.equal(referrer.get("utm_campaign"), "a b&c");
  assert.equal(referrer.get("utm_content"), "x/y=z");
});

test("consent needed only for European time zones", () => {
  assert.equal(needsConsent("Europe/Rome"), true);
  assert.equal(needsConsent("Europe/London"), true);
  assert.equal(needsConsent("Atlantic/Canary"), true);
  assert.equal(needsConsent("Asia/Nicosia"), true);
  assert.equal(needsConsent("Africa/Ceuta"), true);
  assert.equal(needsConsent("Indian/Reunion"), true);
  assert.equal(needsConsent("America/New_York"), false);
  assert.equal(needsConsent("Asia/Tokyo"), false);
});

test("unknown time zone asks for consent", () => {
  assert.equal(needsConsent(undefined), true);
  assert.equal(needsConsent(""), true);
});

test("phones are sent to their own store", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
  const pixel = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  assert.equal(detectPlatform(iphone, 5), "ios");
  assert.equal(detectPlatform(pixel, 5), "android");
});

test("iPadOS posing as a Mac counts as ios, a real Mac stays desktop", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
  assert.equal(detectPlatform(mac, 5), "ios");
  assert.equal(detectPlatform(mac, 0), "desktop");
});

test("desktop and missing user agent stay on the landing page", () => {
  const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
  assert.equal(detectPlatform(win, 0), "desktop");
  assert.equal(detectPlatform(), "desktop");
});
