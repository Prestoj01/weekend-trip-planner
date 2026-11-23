// Ad-hoc: SHOTS_DIR=... npx playwright test e2e/look-banner.spec.ts --project=desktop
import { forecastFixture, test } from './fixtures';

const dir = process.env.SHOTS_DIR;
test.skip(!dir, 'set SHOTS_DIR');

const cases: [name: string, elevation: number, code: number, scheme: 'light' | 'dark'][] = [
  ['mountain-snow', 650, 71, 'light'],
  ['hills-sunny', 200, 0, 'light'],
  ['lowland-rain', 5, 63, 'light'],
  ['lowland-storm-dark', 5, 95, 'dark'],
];

for (const [name, elevation, code, scheme] of cases) {
  test(`banner ${name}`, async ({ page }) => {
    await page.unroute('https://api.open-meteo.com/**');
    await page.route('https://api.open-meteo.com/**', (r) => {
      const f = forecastFixture();
      f.elevation = elevation;
      f.daily.weather_code = f.daily.weather_code.map(() => code);
      return r.fulfill({ json: f });
    });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('./');
    await page.getByRole('button', { name: /sample trip/i }).click();
    await page.waitForTimeout(2200);
    await page.locator('.poster-banner').screenshot({ path: `${dir}/banner-${name}.png` });
  });
}
