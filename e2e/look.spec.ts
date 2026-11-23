// Ad-hoc visual check: SHOTS_DIR=/path npx playwright test e2e/look.spec.ts
import { test } from './fixtures';

const dir = process.env.SHOTS_DIR;
test.skip(!dir, 'set SHOTS_DIR to capture screenshots');

for (const scheme of ['light', 'dark'] as const) {
  test(`look ${scheme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('./');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/${info.project.name}-${scheme}-home.png`, fullPage: true });
    await page.getByRole('button', { name: /sample trip/i }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/${info.project.name}-${scheme}-trip.png`, fullPage: true });
  });
}
