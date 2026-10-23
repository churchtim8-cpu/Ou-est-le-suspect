import { expect, test } from '@playwright/test';

type Hook = { phase: string; target: { x: number; y: number }; tap(x: number, y: number): void; wrongSpot(): { x: number; y: number } | null };

test('title screen loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});

test('a case can be played to the report', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?case=c1-1&seed=e2e');
  await page.waitForFunction(() => (window as unknown as { __suspect?: Hook }).__suspect?.phase === 'intro', null, { timeout: 30_000 });
  await page.mouse.click(790, 520); // START
  await page.waitForFunction(() => (window as unknown as { __suspect?: Hook }).__suspect?.phase === 'search', null, { timeout: 30_000 });
  const wrong = await page.evaluate(() => (window as unknown as { __suspect: Hook }).__suspect.wrongSpot());
  expect(wrong).not.toBeNull();
  await page.evaluate((w) => (window as unknown as { __suspect: Hook }).__suspect.tap(w.x, w.y), wrong!);
  // Catch the whole gang (3 on Easy), one radio message at a time.
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => (window as unknown as { __suspect?: Hook }).__suspect?.phase === 'search', null, { timeout: 30_000 });
    await page.evaluate(() => {
      const h = (window as unknown as { __suspect: Hook }).__suspect;
      h.tap(h.target.x, h.target.y);
    });
  }
  await page.waitForFunction(() => (window as unknown as { __suspect?: Hook }).__suspect?.phase === 'report', null, { timeout: 30_000 });
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('suspect.profile') ?? '{}'));
  expect(saved.best['c1-1'].stars).toBe(2);
  expect(errors).toEqual([]);
});
