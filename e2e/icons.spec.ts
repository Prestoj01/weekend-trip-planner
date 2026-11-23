// Generates PWA icons from the favicon. Run with: MEDIA=1 npx playwright test e2e/icons.spec.ts --project=desktop
import fs from 'node:fs';
import { test } from './fixtures';

test.skip(!process.env.MEDIA, 'set MEDIA=1 to regenerate icons');

for (const [size, maskable] of [
  [192, false],
  [512, false],
  [512, true],
] as const) {
  test(`icon ${size}${maskable ? ' maskable' : ''}`, async ({ page }) => {
    const svg = fs.readFileSync('public/favicon.svg', 'utf8');
    // Maskable icons need the art inside the central 80% "safe zone" on a full-bleed background.
    const pad = maskable ? size * 0.2 : size * 0.06;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0;background:${maskable ? '#fbf3e4' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">
        <div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
    );
    await page.screenshot({
      path: `public/icon-${size}${maskable ? '-maskable' : ''}.png`,
      omitBackground: !maskable,
    });
  });
}
