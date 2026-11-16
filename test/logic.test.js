import { test } from "node:test";
import assert from "node:assert/strict";
import { storeLinks, needsConsent, detectPlatform } from "../js/logic.js";

test("store links default to reddit source without a campaign", () => {
  const { ios, android } = storeLinks("");
  assert.equal(ios, "https://apps.apple.com/app/id1511308478?ct=reddit");
  const url = new URL(android);
  assert.equal(url.searchParams.get("id"), "com.lucaoropallo.rolify");
  assert.equal(url.searchParams.get("referrer"), "utm_source=reddit&utm_medium=paid_social");
});

test("utm_campaign is forwarded to both stores", () => {
  const { ios, android } = storeLinks("?utm_campaign=dm_tavern");
  assert.equal(new URL(ios).searchParams.get("ct"), "reddit-dm_tavern");
  const referrer = new URLSearchParams(new URL(android).searchParams.get("referrer"));
  assert.equal(referrer.get("utm_source"), "reddit");
  assert.equal(referrer.get("utm_campaign"), "dm_tavern");
});

test("utm_source overrides the reddit default", () => {
  const { ios, android } = storeLinks("?utm_source=discord");
  assert.equal(new URL(ios).searchParams.get("ct"), "discord");
  const referrer = new URLSearchParams(new URL(android).searchParams.get("referrer"));
  assert.equal(referrer.get("utm_source"), "discord");
});

test("app store campaign token is capped at 40 characters", () => {
  const { ios } = storeLinks("?utm_campaign=" + "x".repeat(60));
  assert.equal(new URL(ios).searchParams.get("ct").length, 40);
});

test("campaign values with special characters stay encoded", () => {
  const { android } = storeLinks("?utm_campaign=a%26b%3Dc");
  const referrer = new URLSearchParams(new URL(android).searchParams.get("referrer"));
  assert.equal(referrer.get("utm_campaign"), "a&b=c");
  assert.equal(referrer.get("utm_medium"), "paid_social");
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
