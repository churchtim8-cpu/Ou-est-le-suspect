// Screenshot each case's search and catch: node scripts/caseshots.mjs <url> <out dir> [seed]
import { chromium } from '@playwright/test';
const [url = 'http://localhost:4174/', out = 'shots', seed = 'demo'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
for (const id of ['c1-1', 'c1-2', 'c1-3', 'c1-4', 'c1-5']) {
  await page.goto(`${url}?case=${id}&seed=${seed}`);
  await page.waitForTimeout(1800);
  await page.mouse.click(790, 520);
  await page.waitForTimeout(2600);
  const t = await page.evaluate(() => window.__suspect.target);
  console.log(id, t.id);
  await page.evaluate((x) => window.__suspect.look(x), t.x);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${id}-search.png` });
  await page.evaluate((t) => window.__suspect.tap(t.x, t.y), t);
  await page.waitForTimeout(1150);
  await page.screenshot({ path: `${out}/${id}-found.png` });
}
await browser.close();
