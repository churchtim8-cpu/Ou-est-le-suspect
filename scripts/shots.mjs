// Screenshots of the main screens for checking proportions: node scripts/shots.mjs <url> <out dir>
import { chromium } from '@playwright/test';
const [url = 'http://localhost:4174/', out = 'shots'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const click = (x, y) => page.mouse.click(x, y);
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(url + '?seed=demo');
await wait(2500);
await page.screenshot({ path: `${out}/1-title.png` });
await click(640, 360); // PLAY
await wait(900);
await page.screenshot({ path: `${out}/2-chapter.png` });
await click(40 + 0 + 120, 370); // first card (approx)
await wait(900);
await page.screenshot({ path: `${out}/3-intro.png` });
await click(640 + 150, 520); // START
await wait(2600);
await page.screenshot({ path: `${out}/4-search.png` });
const wrong = await page.evaluate(() => window.__suspect.wrongSpot());
const target = await page.evaluate(() => window.__suspect.target);
console.log('target', JSON.stringify(target));
// jump the camera to the target and show a wrong tap first
await page.evaluate((t) => { const g = window.Phaser?.GAMES?.[0]; }, target);
await page.evaluate((w) => window.__suspect.tap(w.x, w.y), wrong);
await wait(500);
await page.screenshot({ path: `${out}/5-wrong.png` });
await page.evaluate((t) => window.__suspect.tap(t.x, t.y), target);
await wait(1200);
await page.screenshot({ path: `${out}/6-found.png` });
await wait(2500);
await page.screenshot({ path: `${out}/7-report.png` });
await browser.close();
