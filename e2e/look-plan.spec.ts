// Ad-hoc: SHOTS_DIR=... npx playwright test e2e/look-plan.spec.ts --project=desktop
import { test } from './fixtures';

const dir = process.env.SHOTS_DIR;
test.skip(!dir, 'set SHOTS_DIR');

test('planner result', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('combobox').fill('Ashe');
  await page.getByRole('option', { name: /Asheville/ }).click();
  await page.getByRole('button', { name: 'Start planning' }).click();
  await page.getByRole('button', { name: 'Plan my weekend' }).click();
  await page.waitForTimeout(2500);
  await page.locator('.trip-grid-layout').screenshot({ path: `${dir}/plan.png` });
});
