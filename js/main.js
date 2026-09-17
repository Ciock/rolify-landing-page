import { storeLinks, needsConsent } from "./logic.js";

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
  anchor.href = links[store];
  anchor.addEventListener("click", (event) => {
    if (!window.rdt || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    window.rdt("track", "Custom", { customEventName: `${store}_click`, conversionId: conversionId() });
    // Give the pixel request time to leave before the store takes over the page.
    setTimeout(() => location.assign(anchor.href), 300);
  });
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const consent = readConsent();

if (consent === "accepted" || (consent !== "declined" && !needsConsent(timeZone))) {
  loadRedditPixel();
} else if (consent !== "declined") {
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
