// Ad-hoc: SHOTS_DIR=... SEL='.day' npx playwright test e2e/look-element.spec.ts --project=desktop
import { test } from './fixtures';

const dir = process.env.SHOTS_DIR;
test.skip(!dir || !process.env.SEL, 'set SHOTS_DIR and SEL');

test('element shot', async ({ page }) => {
  await page.emulateMedia({ colorScheme: (process.env.SCHEME as 'light' | 'dark') ?? 'light' });
  await page.goto('./');
  await page.getByRole('button', { name: /sample trip/i }).click();
  await page.waitForTimeout(2500);
  const els = page.locator(process.env.SEL!);
  const n = Math.min(await els.count(), 3);
  for (let i = 0; i < n; i++) await els.nth(i).screenshot({ path: `${dir}/el-${i}.png` });
});
