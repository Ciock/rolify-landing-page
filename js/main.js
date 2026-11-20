import { storeLinks, needsConsent, detectPlatform } from "./logic.js";

const PIXEL_ID = "a2_joi0e8mo3n5p";
const CONSENT_KEY = "rolify-consent";

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function saveConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {}
}

function conversionId() {
  // randomUUID is missing on Safari < 15.4.
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadRedditPixel() {
  if (window.rdt) return;
  const rdt = (window.rdt = function () {
    rdt.sendEvent ? rdt.sendEvent.apply(rdt, arguments) : rdt.callQueue.push(arguments);
  });
  rdt.callQueue = [];
  const script = document.createElement("script");
  script.src = "https://www.redditstatic.com/ads/pixel.js";
  script.async = true;
  document.head.appendChild(script);
  rdt("init", PIXEL_ID);
  rdt("track", "PageVisit", { conversionId: conversionId() });
}

const links = storeLinks(location.search);
for (const anchor of document.querySelectorAll("[data-store]")) {
  const store = anchor.dataset.store;
  // Android phones open the Play Store app directly so the install keeps its referrer.
  anchor.href = store === "android" && detectPlatform(navigator.userAgent, navigator.maxTouchPoints) === "android"
    ? links.androidIntent
    : links[store];
  anchor.addEventListener("click", (event) => {
    if (!window.rdt || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    window.rdt("track", "Custom", { customEventName: `${store}_click`, conversionId: conversionId() });
    // Give the pixel request time to leave before the store takes over the page.
    setTimeout(() => location.assign(anchor.href), 300);
  });
}

// Some WebViews refuse intent:// links and stay put. If the page is still
// visible and never lost focus shortly after the redirect, use the https link.
function watchForBlockedIntent() {
  let left = false;
  const markLeft = () => { left = true; };
  window.addEventListener("pagehide", markLeft);
  window.addEventListener("blur", markLeft);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") markLeft();
  });
  setTimeout(() => {
    if (!left && document.visibilityState === "visible") location.replace(links.android);
  }, 1500);
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const consent = readConsent();
const pixelAllowed = consent === "accepted" || (consent !== "declined" && !needsConsent(timeZone));
const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);

if (pixelAllowed) loadRedditPixel();

if (platform !== "desktop") {
  // Phones and tablets go straight to their store; only desktop stays here.
  // replace() keeps the landing page out of the back-button history.
  // Without consent there is no pixel and no banner, so leave at once.
  const target = platform === "android" ? links.androidIntent : links[platform];
  const go = () => {
    location.replace(target);
    if (platform === "android") watchForBlockedIntent();
  };
  if (pixelAllowed) {
    window.rdt("track", "Custom", { customEventName: `${platform}_redirect`, conversionId: conversionId() });
    setTimeout(go, 300); // let the pixel requests leave first
  }
  else go();
} else if (!pixelAllowed && consent !== "declined") {
  const bar = document.querySelector(".consent");
  bar.hidden = false;
  bar.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-consent]")?.dataset.consent;
    if (!choice) return;
    saveConsent(choice);
    bar.hidden = true;
    if (choice === "accepted") loadRedditPixel();
  });
}
