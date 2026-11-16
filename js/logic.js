const APP_STORE_URL = "https://apps.apple.com/app/id1511308478";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details";
const ANDROID_PACKAGE = "com.lucaoropallo.rolify";
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

export function storeLinks(search) {
  const params = new URLSearchParams(search);
  const source = params.get("utm_source") || "reddit";
  const campaign = params.get("utm_campaign");

  const ct = (campaign ? `${source}-${campaign}` : source).slice(0, APP_STORE_CT_MAX);
  const ios = `${APP_STORE_URL}?${new URLSearchParams({ ct })}`;

  const referrer = new URLSearchParams({ utm_source: source, utm_medium: "paid_social" });
  if (campaign) referrer.set("utm_campaign", campaign);
  const android = `${PLAY_STORE_URL}?${new URLSearchParams({ id: ANDROID_PACKAGE, referrer: referrer.toString() })}`;

  return { ios, android };
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
