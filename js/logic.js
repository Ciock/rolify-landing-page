const APP_STORE_URL = "https://apps.apple.com/app/id1511308478";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details";
const ANDROID_PACKAGE = "com.lucaoropallo.rolify";
const PLAY_STORE_APP_PACKAGE = "com.android.vending";
const APP_STORE_CT_MAX = 40;

// EU/EEA/UK territories whose IANA zones live outside Europe/*.
const EUROPEAN_OUTLIERS = new Set([
  "Africa/Ceuta",
  "America/Cayenne",
  "America/Guadeloupe",
  "America/Martinique",
  "America/Marigot",
  "Asia/Famagusta",
  "Asia/Nicosia",
  "Indian/Mayotte",
  "Indian/Reunion",
  "Atlantic/Azores",
  "Atlantic/Canary",
  "Atlantic/Faroe",
  "Atlantic/Madeira",
  "Atlantic/Reykjavik",
  "Arctic/Longyearbyen",
]);

// App Store Connect accepts only letters, digits, "-", "_" and "." in ct.
const ctSafe = (value) => value.replace(/[^A-Za-z0-9\-_.]/g, "-");

// "<source>-<campaign>-<content>", at most APP_STORE_CT_MAX chars. When too
// long the campaign is shortened first so the ad (content) survives.
function appStoreCampaignToken(source, campaign, content) {
  const head = ctSafe(source);
  const tail = content ? ctSafe(content) : "";
  let mid = campaign ? ctSafe(campaign) : "";
  const separators = 1 * Boolean(mid) + 1 * Boolean(tail);
  const room = APP_STORE_CT_MAX - head.length - tail.length - separators;
  mid = room > 0 ? mid.slice(0, room) : "";
  return [head, mid, tail].filter(Boolean).join("-").slice(0, APP_STORE_CT_MAX);
}

export function storeLinks(search) {
  const params = new URLSearchParams(search);
  const source = params.get("utm_source") || "reddit";
  const campaign = params.get("utm_campaign");
  const content = params.get("utm_content");
  const term = params.get("utm_term");

  const ct = appStoreCampaignToken(source, campaign, content);
  const ios = `${APP_STORE_URL}?${new URLSearchParams({ ct })}`;

  const referrer = new URLSearchParams({
    utm_source: source,
    utm_medium: params.get("utm_medium") || "paid_social",
  });
  if (campaign) referrer.set("utm_campaign", campaign);
  if (content) referrer.set("utm_content", content);
  if (term) referrer.set("utm_term", term);
  const playQuery = new URLSearchParams({ id: ANDROID_PACKAGE, referrer: referrer.toString() }).toString();
  const android = `${PLAY_STORE_URL}?${playQuery}`;

  // Opens the Play Store app directly. Inside in-app browsers the https link
  // often lands on the Play web page, whose installs carry no install referrer.
  // The query is the same string as the https link, so the referrer is encoded once.
  const androidIntent =
    `intent://details?${playQuery}#Intent;scheme=market;package=${PLAY_STORE_APP_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(android)};end`;

  return { ios, android, androidIntent };
}

export function needsConsent(timeZone) {
  if (!timeZone) return true;
  return timeZone.startsWith("Europe/") || EUROPEAN_OUTLIERS.has(timeZone);
}

// "ios" | "android" | "desktop". iPadOS 13+ reports a Mac user agent, so a
// touch-capable "Macintosh" is treated as an iPad.
export function detectPlatform(userAgent = "", maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}
