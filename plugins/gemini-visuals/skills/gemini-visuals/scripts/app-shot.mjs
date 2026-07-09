// Log into a web app, navigate to a route, and screenshot it — for authenticated
// in-app screens. Credentials come from env APP_EMAIL / APP_PASSWORD (never hard-code).
//   APP_EMAIL=.. APP_PASSWORD=.. node app-shot.mjs <base> <path> <out.png> [--tab "Label"] [--sel css] [--w 1440] [--fill '[["css","text"],...]']
// Adapt the login selectors below to your app's login form if they differ.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [base, path, out] = args;
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const width = parseInt(flag("--w", "1440"), 10);
const tab = flag("--tab", "");
const sel = flag("--sel", "");
const fill = flag("--fill", ""); // JSON: [["css selector","text"], ...] filled after the tab click
const email = process.env.APP_EMAIL, password = process.env.APP_PASSWORD;
if (!base || !path || !out || !email || !password) {
  console.error('usage: APP_EMAIL=.. APP_PASSWORD=.. node app-shot.mjs <base> <path> <out.png> [--tab ".."] [--sel css] [--w 1440]');
  process.exit(1);
}

const B = base.replace(/\/$/, "");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });

// --- Login. Tweak these selectors to match your app's login form. ---
await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);

// --- Navigate to the target screen and screenshot it. ---
await page.goto(`${B}/${path.replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1200);
if (tab) { await page.getByRole("button", { name: tab, exact: true }).click().catch(() => page.getByText(tab, { exact: true }).click()); await page.waitForTimeout(800); }
if (fill) {
  // Stage an empty screen "in use" by injecting realistic content before the shot.
  for (const [css, text] of JSON.parse(fill)) {
    await page.fill(css, text).catch((e) => console.error("fill failed:", css, e.message));
  }
  await page.waitForTimeout(400);
}

if (sel) {
  const el = await page.$(sel);
  if (!el) { console.error("SELECTOR NOT FOUND:", sel); await browser.close(); process.exit(2); }
  await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await el.screenshot({ path: out });
} else {
  await page.screenshot({ path: out });
}
console.log(JSON.stringify({ out, path, tab: tab || null }));
await browser.close();
