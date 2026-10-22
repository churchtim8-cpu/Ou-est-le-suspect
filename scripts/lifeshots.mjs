// Screenshots of the street life (runaway opening, walkers' legs, recruit running): node scripts/lifeshots.mjs <url> <out dir>
import { chromium } from '@playwright/test';
const [url = 'http://localhost:4174/', out = 'shots'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(url + '?case=c1-1&seed=life');
await page.waitForFunction(() => window.__suspect?.phase === 'intro');
await wait(800);
await page.mouse.click(790, 520);
for (const [i, ms] of [[1, 250], [2, 500], [3, 600]]) { await wait(ms); await page.screenshot({ path: `${out}/run-${i}.png` }); }
await page.waitForFunction(() => window.__suspect?.phase === 'search');
for (let i = 0; i < 6; i++) { await wait(110); await page.screenshot({ path: `${out}/legs-${i}.png` }); }
await page.keyboard.down('ArrowRight');
await wait(500);
await page.screenshot({ path: `${out}/recruit-run-1.png` });
await wait(140);
await page.screenshot({ path: `${out}/recruit-run-2.png` });
await page.keyboard.up('ArrowRight');
await wait(1200);
await page.screenshot({ path: `${out}/recruit-stand.png` });
const t = await page.evaluate(() => window.__suspect.target);
await page.evaluate((t) => window.__suspect.look(t.x), t);
await wait(1500);
await page.evaluate((t) => window.__suspect.tap(t.x, t.y), t);
await wait(1100);
await page.screenshot({ path: `${out}/found.png` });
await browser.close();
