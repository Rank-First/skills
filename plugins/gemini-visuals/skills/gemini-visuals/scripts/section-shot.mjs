// Screenshot ONE element (a whole landing section) by CSS selector, reliably.
// Uses element.screenshot() (not viewport clips), so a global body `zoom` or
// sticky header never throws off the crop.
//   node section-shot.mjs <url> "<css-selector>" <out.png> [--w 1440] [--scale 2]
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [url, selector, out] = args;
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const width = parseInt(flag("--w", "1440"), 10);
const scale = parseFloat(flag("--scale", "2"));
const hideSel = flag("--hide", "");
if (!url || !selector || !out) {
  console.error('usage: section-shot.mjs <url> "<selector>" <out.png> [--w 1440] [--scale 2] [--hide "<css>"]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: scale });
// domcontentloaded + a SHORT idle wait: `networkidle` never fires on dev servers
// with an open HMR websocket, so don't block on it.
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
// Nudge lazy content + wait for images to decode.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
  window.scrollTo(0, 0);
  // Bounded wait: a lazy off-screen image can fire neither load nor error, so cap it.
  const decoded = Promise.all(Array.from(document.images).map(i => i.complete && i.naturalWidth > 0 ? 0 : new Promise(r => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); })));
  await Promise.race([decoded, new Promise(r => setTimeout(r, 2500))]);
});
await page.waitForTimeout(400);
// Hide overlays that would composite over the element screenshot: every
// position:fixed / position:sticky node (a sticky site header, a cookie bar),
// plus anything named with --hide. element.screenshot clips to the element's
// box but still PAINTS fixed/sticky layers that fall within that screen region,
// so a section shot otherwise gets the navbar baked over its top.
await page.evaluate((hideSel) => {
  const kill = (el) => el.style.setProperty("display", "none", "important");
  for (const el of document.querySelectorAll("body *")) {
    const pos = getComputedStyle(el).position;
    if (pos === "fixed" || pos === "sticky") kill(el);
  }
  if (hideSel) document.querySelectorAll(hideSel).forEach(kill);
}, hideSel);
const el = await page.$(selector);
if (!el) { console.error("SELECTOR NOT FOUND:", selector); await browser.close(); process.exit(2); }
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await el.screenshot({ path: out });
const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(JSON.stringify({ out, selector, width, overflowX }));
await browser.close();
