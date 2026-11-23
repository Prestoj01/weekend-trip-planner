import { expect, test } from './fixtures';

test('creates a trip from a destination search', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your next weekend, planned on one ticket');
  await page.getByRole('combobox').fill('Ashe');
  await page.getByRole('option', { name: /Asheville/ }).click();
  await page.getByRole('button', { name: 'Start planning' }).click();

  await expect(page).toHaveURL(/#\/trip\//);
  await expect(page.getByRole('textbox', { name: 'Trip name' })).toHaveValue('Weekend in Asheville');
  await expect(page.getByRole('heading', { name: 'Weather in Asheville' })).toBeVisible();
  await expect(page.getByText('Nothing planned yet.').first()).toBeVisible();
});

test.describe('sample trip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: /sample trip/i }).click();
    await expect(page.getByRole('textbox', { name: 'Trip name' })).toHaveValue('Blue Ridge Getaway');
  });

  test('adds and edits an activity', async ({ page }) => {
    const friday = page.locator('.day').first();
    await friday.getByRole('button', { name: '+ Add activity' }).click();
    await friday.getByRole('textbox', { name: 'Activity' }).fill('Sunset at Mount Pisgah');
    await friday.getByLabel('Time').fill('18:15');
    await friday.getByRole('spinbutton', { name: 'Cost' }).fill('12');
    await friday.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(friday.getByText('Sunset at Mount Pisgah')).toBeVisible();

    await friday.getByRole('button', { name: 'Edit Sunset at Mount Pisgah' }).click();
    await friday.getByRole('textbox', { name: 'Activity' }).fill('Sunset picnic');
    await friday.getByRole('button', { name: 'Save' }).click();
    await expect(friday.getByText('Sunset picnic')).toBeVisible();
    await expect(page.getByText('$697')).toBeVisible(); // 685 + 12
  });

  test('deleting an activity can be undone', async ({ page }) => {
    const friday = page.locator('.day').first();
    await friday.getByRole('button', { name: 'Edit Check in downtown' }).click();
    await friday.getByRole('button', { name: 'Delete' }).click();
    await expect(friday.getByText('Check in downtown')).toHaveCount(0);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
    await expect(friday.getByText('Check in downtown')).toBeVisible();
  });

  test('deleting a trip can be undone', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByText('Blue Ridge Getaway')).toHaveCount(0);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
    await expect(page).toHaveURL(/#\/trip\//);
    await expect(page.getByRole('textbox', { name: 'Trip name' })).toHaveValue('Blue Ridge Getaway');
  });

  test('adds a nearby suggestion to a day', async ({ page }) => {
    const suggestions = page.locator('.suggestions');
    await expect(suggestions.getByText('Asheville Art Museum')).toBeVisible();
    await suggestions.getByRole('button', { name: 'Add Asheville Art Museum' }).click();
    await expect(suggestions.getByRole('button', { name: 'Asheville Art Museum added' })).toBeDisabled();
    await expect(page.locator('.day').first().getByText('Asheville Art Museum')).toBeVisible();
  });

  test('sample trip still has suggestions when OpenStreetMap is down', async ({ page }) => {
    await page.unroute(/overpass/);
    await page.route(/overpass/, (r) => r.fulfill({ status: 503, body: 'down' }));
    await page.getByRole('tab', { name: /Outdoors/ }).click();
    await expect(page.locator('.suggestions').getByText('North Carolina Arboretum')).toBeVisible();
  });

  test('shows the forecast and celebrates a fully packed bag', async ({ page }) => {
    await expect(page.locator('.forecast li')).toHaveCount(3);
    const boxes = page.locator('.checklist input[type=checkbox]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    await expect(page.getByText(`${n}/${n} packed`)).toBeVisible();
    await expect(page.getByText(/All packed/)).toBeVisible();
  });

  test('share link opens a read-only copy that can be saved', async ({ page, context, browserName }, info) => {
    test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'clipboard flow is desktop-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('status')).toContainText(/copied/i);
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain('#/share/');

    await page.goto(url);
    await expect(page.getByText('Someone shared this trip with you.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Blue Ridge Getaway' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add activity' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Save a copy to edit' }).click();
    await expect(page).toHaveURL(/#\/trip\//);
  });
});
