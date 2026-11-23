import QRCode from 'qrcode';
import type { Trip } from '../types';
import { eachDay, formatDay, formatRange, formatTime } from './dates';
import { encodeTrip, encodeTripCompact } from './storage';
import { computeBudget, DAY_COLORS, formatMoney, sortActivities } from './trip';

const W = 1080;
const H = 1350;
const INK = '#3d2c4d';
const CREAM = '#fbf3e4';
const PAPER = '#fff9ef';
const ORANGE = '#e4572e';
const DISPLAY = '"Alfa Slab One", Rockwell, serif';
const HEAD = '"Oswald Variable", Oswald, Impact, sans-serif';
const BODY = '"Work Sans Variable", system-ui, sans-serif';

/** Absolute link that opens a read-only copy of the trip. */
export function shareUrl(trip: Trip, { compact = false } = {}): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/share/${compact ? encodeTripCompact(trip) : encodeTrip(trip)}`;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Draws the trip as a 1080×1350 "admit one" ticket (Instagram-portrait size) with a QR code
 * that opens the shared itinerary. Returns a PNG blob.
 */
export async function renderTicket(trip: Trip): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`80px ${DISPLAY}`),
    document.fonts.load(`600 30px ${HEAD}`),
    document.fonts.load(`500 28px ${BODY}`),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Page
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // Ticket body with a hard print shadow
  const X = 60;
  const Y = 60;
  const TW = W - 120;
  const TH = H - 130;
  ctx.fillStyle = INK;
  roundRect(ctx, X + 12, Y + 12, TW, TH, 28);
  ctx.fill();
  ctx.fillStyle = PAPER;
  roundRect(ctx, X, Y, TW, TH, 28);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Header band with a sunset and mountains
  ctx.save();
  roundRect(ctx, X, Y, TW, 330, 28);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, Y, 0, Y + 330);
  sky.addColorStop(0, '#f6a07a');
  sky.addColorStop(1, '#fbe3c8');
  ctx.fillStyle = sky;
  ctx.fillRect(X, Y, TW, 330);
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.arc(X + TW - 190, Y + 270, 96, 0, Math.PI * 2);
  ctx.fill();
  const ridge = (color: string, pts: [number, number][]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(X, Y + 330);
    pts.forEach(([px, py]) => ctx.lineTo(X + px * TW, Y + py));
    ctx.lineTo(X + TW, Y + 330);
    ctx.fill();
  };
  // Kept low so the date line above stays on clear sky.
  ridge('#c06c84', [[0, 290], [0.18, 262], [0.34, 284], [0.52, 248], [0.7, 280], [0.86, 236], [1, 270]]);
  ridge('#6c5b7b', [[0, 312], [0.22, 288], [0.45, 310], [0.66, 284], [0.88, 306], [1, 296]]);
  ctx.restore();

  ctx.fillStyle = INK;
  ctx.font = `600 28px ${HEAD}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('FRIDAY TICKET · ADMIT ONE', X + 48, Y + 70);
  ctx.letterSpacing = '0px';

  // Destination, poster style
  ctx.font = `96px ${DISPLAY}`;
  const dest = fit(ctx, trip.destination.name.toUpperCase(), TW - 96);
  ctx.fillStyle = INK;
  ctx.fillText(dest, X + 54, Y + 186);
  ctx.fillStyle = PAPER;
  ctx.fillText(dest, X + 48, Y + 180);

  ctx.font = `600 32px ${HEAD}`;
  ctx.fillStyle = INK;
  ctx.fillText(formatRange(trip.startDate, trip.endDate).toUpperCase(), X + 48, Y + 236);

  // Perforation with punched notches
  const perf = (y: number) => {
    ctx.setLineDash([4, 14]);
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(X + 40, y);
    ctx.lineTo(X + TW - 40, y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const nx of [X, X + TW]) {
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.arc(nx, y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(nx, y, 22, nx === X ? -Math.PI / 2 : Math.PI / 2, nx === X ? Math.PI / 2 : (3 * Math.PI) / 2);
      ctx.stroke();
    }
  };
  perf(Y + 330);

  // Itinerary
  const days = eachDay(trip.startDate, trip.endDate);
  const stubTop = Y + TH - 280;
  const perDayBudget = Math.max(3, Math.floor((stubTop - (Y + 380) - days.length * 70) / days.length / 44));
  let y = Y + 392;
  days.forEach((date, i) => {
    if (y > stubTop - 80) return;
    const { weekday, label } = formatDay(date);
    const color = DAY_COLORS[i % DAY_COLORS.length];
    ctx.fillStyle = color;
    roundRect(ctx, X + 48, y - 34, 170, 46, 6);
    ctx.fill();
    ctx.fillStyle = PAPER;
    ctx.font = `600 26px ${HEAD}`;
    ctx.fillText(`DAY ${String(i + 1).padStart(2, '0')} · ${weekday.slice(0, 3).toUpperCase()}`, X + 62, y - 2);
    ctx.fillStyle = '#6b5670';
    ctx.font = `500 26px ${BODY}`;
    ctx.fillText(label, X + 236, y - 2);
    y += 52;

    const items = sortActivities(trip.activities.filter((a) => a.date === date));
    const shown = items.slice(0, perDayBudget);
    if (shown.length === 0) {
      ctx.fillStyle = '#6b5670';
      ctx.font = `italic 400 26px ${BODY}`;
      ctx.fillText('Free day', X + 62, y);
      y += 44;
    }
    for (const a of shown) {
      if (y > stubTop - 40) break;
      ctx.fillStyle = '#6b5670';
      ctx.font = `500 26px ${BODY}`;
      ctx.fillText(a.time ? formatTime(a.time) : '—', X + 62, y);
      ctx.fillStyle = INK;
      ctx.font = `600 28px ${BODY}`;
      ctx.fillText(fit(ctx, a.title, TW - 300), X + 220, y);
      y += 44;
    }
    if (items.length > shown.length) {
      ctx.fillStyle = '#6b5670';
      ctx.font = `500 24px ${BODY}`;
      ctx.fillText(`+ ${items.length - shown.length} more`, X + 220, y);
      y += 40;
    }
    y += 26;
  });

  // Stub: totals and QR code
  perf(stubTop);
  const { total, perPerson } = computeBudget(trip);
  ctx.fillStyle = INK;
  ctx.font = `600 26px ${HEAD}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('ESTIMATED COST', X + 48, stubTop + 70);
  ctx.letterSpacing = '0px';
  ctx.font = `64px ${DISPLAY}`;
  ctx.fillText(formatMoney(total), X + 48, stubTop + 146);
  ctx.font = `500 28px ${BODY}`;
  ctx.fillStyle = '#6b5670';
  ctx.fillText(
    `${formatMoney(perPerson)} each · ${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}`,
    X + 48,
    stubTop + 194,
  );

  // Whole-pixel modules (no resampling) keep the code crisp enough for phone cameras.
  const url = shareUrl(trip, { compact: true });
  const modules = QRCode.create(url, { errorCorrectionLevel: 'L' }).modules.size + 2;
  const scale = Math.max(2, Math.floor(256 / modules));
  const qrSize = modules * scale;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, {
    scale,
    margin: 1,
    errorCorrectionLevel: 'L',
    color: { dark: INK, light: PAPER },
  });
  const qx = X + TW - qrSize - 48;
  const qy = stubTop + 16;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, qx, qy);
  // Label runs up the left edge of the code, like a ticket stub's fine print.
  ctx.save();
  ctx.translate(qx - 18, qy + qrSize);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `600 20px ${HEAD}`;
  ctx.fillStyle = INK;
  ctx.letterSpacing = '4px';
  ctx.fillText('SCAN TO OPEN', 0, 0);
  ctx.restore();
  ctx.letterSpacing = '0px';

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render ticket'))), 'image/png'),
  );
}
