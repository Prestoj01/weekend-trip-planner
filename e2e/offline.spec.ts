import { expect, test } from '@playwright/test';
import { forecastFixture, geocodeFixture, overpassFixture } from './fixtures';

test.use({ serviceWorkers: 'allow' });

test('saved trips open with no connection', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser is enough');
  // context.route also intercepts requests made by the service worker.
  await context.route('https://geocoding-api.open-meteo.com/**', (r) => r.fulfill({ json: geocodeFixture }));
  await context.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: forecastFixture() }));
  await context.route(/overpass/, (r) => r.fulfill({ json: overpassFixture }));
  await context.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204 }));

  await page.goto('./');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  await page.getByRole('button', { name: /sample trip/i }).click();
  await expect(page.getByRole('textbox', { name: 'Trip name' })).toHaveValue('Blue Ridge Getaway');
  const tripUrl = page.url();
  await page.waitForTimeout(1500); // let the lazy map chunk and forecast land in the caches

  await context.setOffline(true);
  await page.goto(tripUrl);
  await expect(page.getByRole('textbox', { name: 'Trip name' })).toHaveValue('Blue Ridge Getaway');
  await expect(page.getByText('Biltmore Estate').first()).toBeVisible();
  await expect(page.locator('.forecast li').first()).toBeVisible();
});
