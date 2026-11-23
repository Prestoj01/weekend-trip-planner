// Generates marketing assets. Run with: MEDIA=1 npx playwright test e2e/media.spec.ts --project=desktop
import { expect, test } from './fixtures';

test.skip(!process.env.MEDIA, 'set MEDIA=1 to regenerate images');

test('social preview image (public/og.png)', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('./');
  await page.addStyleTag({
    content: `.topbar{display:none}.hero{padding:0}.home{max-width:none;padding:0}
      .poster{height:630px;border:0;border-radius:0;box-shadow:none}
      .poster-copy{padding:72px 64px 0}.poster h1{font-size:84px}.lede,.home-grid,.footer{display:none}`,
  });
  await page.evaluate(() => {
    const tag = document.createElement('div');
    tag.textContent = 'Friday Ticket · free weekend trip planner';
    tag.style.cssText =
      'position:absolute;left:64px;bottom:22px;font:600 26px "Oswald Variable";letter-spacing:.08em;text-transform:uppercase;color:#fbf3e4';
    document.querySelector('.poster')!.append(tag);
  });
  await expect(page.locator('.poster h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/og.png' });
});
