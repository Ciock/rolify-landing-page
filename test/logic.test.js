import { test } from "node:test";
import assert from "node:assert/strict";
import { storeLinks, needsConsent } from "../js/logic.js";

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
