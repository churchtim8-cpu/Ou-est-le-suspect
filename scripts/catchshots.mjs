// Screenshots of every catch in a case: node scripts/catchshots.mjs <url> <out dir> [case] [level] [seed]
import { chromium } from '@playwright/test';
const [url = 'http://localhost:4174/', out = 'shots', caseId = 'c1-1', level = 'easy', seed = 'gang'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const wait = (ms) => page.waitForTimeout(ms);
const phase = (p) => page.waitForFunction((p) => window.__suspect?.phase === p, p, { timeout: 30000 });
await page.goto(`${url}?case=${caseId}&level=${level}&seed=${seed}`);
await phase('intro');
await wait(600);
await page.screenshot({ path: `${out}/${caseId}-${level}-0-intro.png` });
await page.mouse.click(790, 520);
await wait(700);
await page.screenshot({ path: `${out}/${caseId}-${level}-1-runaway.png` });
let n = 0;
for (;;) {
  await page.waitForFunction(() => ['search', 'report'].includes(window.__suspect?.phase), null, { timeout: 30000 });
  if (await page.evaluate(() => window.__suspect.phase) === 'report') break;
  await wait(300);
  if (n === 0) await page.screenshot({ path: `${out}/${caseId}-${level}-${seed}-clue.png` });
  const t = await page.evaluate(() => window.__suspect.target);
  await page.evaluate((t) => window.__suspect.look(t.x), t);
  await wait(400);
  await page.evaluate((t) => window.__suspect.tap(t.x, t.y), t);
  await wait(900);
  await page.screenshot({ path: `${out}/${caseId}-${level}-${seed}-catch${n}.png` });
  n++;
  await page.waitForFunction(() => window.__suspect?.phase !== 'found', null, { timeout: 30000 });
}
await wait(1800);
await page.screenshot({ path: `${out}/${caseId}-${level}-9-report.png` });
console.log(caseId, level, 'caught', n);
await browser.close();
