// Generates marketing assets. Run with: MEDIA=1 npx playwright test e2e/media.spec.ts --project=desktop
import { expect, mockApis, test } from './fixtures';

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

test.describe('README media', () => {
  test.use({ viewport: { width: 1100, height: 690 } });

  test('screenshots (docs/*.png)', async ({ page }) => {
    await page.unrouteAll();
    await mockApis(page, { realTiles: true });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: 'docs/home.png' });
    await page.getByRole('button', { name: /sample trip/i }).click();
    await page.waitForTimeout(3500);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'docs/trip-dusk.png' });
  });

  test('demo GIF (docs/demo.gif)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.unrouteAll();
    await mockApis(page, { realTiles: true });
    await page.emulateMedia({ colorScheme: 'light' });
    const { PNG } = await import('pngjs');
    const mod = await import('gifenc');
    // gifenc ships CommonJS; under ESM interop its exports may sit on `default`.
    const { GIFEncoder, quantize, applyPalette } = ((mod as unknown as { default?: typeof mod }).default ?? mod);
    const fs = await import('node:fs');
    const W = 720;
    const H = 452;
    const K = W / 1100;
    const gif = GIFEncoder();
    const frame = async (delay = 90) => {
      const shot = PNG.sync.read(await page.screenshot({ scale: 'css' }));
      // Downscale 1100x690 -> 720x452 with nearest-neighbour sampling.
      const data = new Uint8Array(W * H * 4);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const si = (Math.floor(y / K) * shot.width + Math.floor(x / K)) * 4;
          data.set(shot.data.subarray(si, si + 4), (y * W + x) * 4);
        }
      const palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), W, H, { palette, delay });
    };
    const record = async (ms: number, every = 140) => {
      for (let t = 0; t < ms; t += every) await frame(every);
    };

    await page.goto('./');
    // Paper grain is per-pixel noise that GIF can't compress; hide it for the recording.
    await page.addStyleTag({ content: 'body::before{display:none!important}' });
    await record(2600);
    await page.getByRole('button', { name: /sample trip/i }).click();
    await page.addStyleTag({ content: 'body::before{display:none!important}' });
    await record(3200);
    await page.mouse.wheel(0, 420);
    await record(1600);
    await page.getByRole('button', { name: 'Plan my weekend' }).scrollIntoViewIfNeeded();
    await page.locator('.day').nth(1).getByRole('button', { name: /Edit River Arts/ }).waitFor();
    await page.getByRole('button', { name: 'Plan my weekend' }).click();
    await record(2400);
    await frame(1800);
    gif.finish();
    fs.writeFileSync('docs/demo.gif', gif.bytes());
  });
});
