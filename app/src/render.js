// Renders a cover onto a canvas: the photo panels, the colour grade, the
// caption band with its bold lettering, and the finishing grain and vignette.
import { panelRects, bandRect } from './layouts.js';

const BACKDROP = '#0d0a12';

/** A photo transform: zoom (1 and up) and a pan offset in fractions of the rect. */
export function freshTransform() {
  return { zoom: 1, ox: 0, oy: 0 };
}

/** Draws one photo cover-fitting rect (x, y, w, h), honouring its transform. */
export function drawPhotoInto(ctx, photo, rx, ry, rw, rh, t) {
  const base = Math.max(rw / photo.naturalWidth, rh / photo.naturalHeight);
  const scale = base * t.zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const cx = rx + rw / 2 + t.ox * rw * 0.3;
  const cy = ry + rh / 2 + t.oy * rh * 0.3;
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
}

let grainTile = null;

/** A small tiled noise canvas, made once, for the film grain finish. */
export function grainCanvas() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const g = tile.getContext('2d');
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/**
 * Renders the whole cover. State: { layout, grade, mode ('span' | 'split'),
 * spanPhoto, photos: [{img, zoom, ox, oy} | null], panelPhoto: [photoIndex],
 * title, subtitle, titleSize (multiplier), titleColor }.
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = state.layout;
  const grade = state.grade;
  const rects = panelRects(layout, w, h);
  const band = bandRect(layout, w, h);

  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  if (grade.filter !== 'none') ctx.filter = grade.filter;
  if (state.mode === 'span') {
    const slot = state.photos[state.spanPhoto];
    if (slot && slot.img) {
      drawPhotoInto(ctx, slot.img, 0, 0, w, band.y, slot);
    }
  } else {
    rects.forEach((r, i) => {
      const slot = state.photos[state.panelPhoto[i] ?? 0];
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      if (slot && slot.img) {
        drawPhotoInto(ctx, slot.img, r.x, r.y, r.w, r.h, slot);
      } else {
        const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
        g.addColorStop(0, '#2a1e3d');
        g.addColorStop(1, '#120d1a');
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
    });
  }
  ctx.restore();

  // Gutters: in span mode one photo sits under the panel seams, so the seams
  // are painted back on as dark bars centred in the gaps between panels.
  if (state.mode === 'span') {
    const gutter = Math.max(4, w * 0.008);
    ctx.fillStyle = BACKDROP;
    for (let i = 0; i < rects.length; i++) {
      for (let j = 0; j < rects.length; j++) {
        if (i === j) continue;
        const a = rects[i];
        const b = rects[j];
        const gapX = b.x - (a.x + a.w);
        if (gapX >= 0 && gapX <= w * 0.03) {
          const top = Math.max(a.y, b.y);
          const bottom = Math.min(a.y + a.h, b.y + b.h);
          if (bottom > top) {
            ctx.fillRect(a.x + a.w + gapX / 2 - gutter / 2, top, gutter, bottom - top);
          }
        }
        const gapY = b.y - (a.y + a.h);
        if (gapY >= 0 && gapY <= h * 0.03) {
          const left = Math.max(a.x, b.x);
          const right = Math.min(a.x + a.w, b.x + b.w);
          if (right > left) {
            ctx.fillRect(left, a.y + a.h + gapY / 2 - gutter / 2, right - left, gutter);
          }
        }
      }
    }
  }

  // Colour grade wash over the photo area.
  if (grade.stops.length > 0) {
    const wash = ctx.createLinearGradient(0, 0, 0, band.y);
    for (const [at, color] of grade.stops) wash.addColorStop(at, color);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, band.y);
  }

  // Vignette and grain over the photo area.
  const vig = ctx.createRadialGradient(
    w / 2, band.y / 2, Math.min(w, band.y) * 0.35,
    w / 2, band.y / 2, Math.max(w, band.y) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, band.y);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat');
  ctx.fillRect(0, 0, w, band.y);
  ctx.restore();

  // Caption band.
  ctx.fillStyle = grade.band;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.fillStyle = grade.bandLine;
  ctx.fillRect(band.x, band.y, band.w, Math.max(3, h * 0.004));

  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim().toUpperCase();
  const cx = w / 2;
  let size = band.h * 0.52 * state.titleSize;
  if (title) {
    ctx.font = `400 ${size}px Anton, 'Arial Narrow', sans-serif`;
    while (ctx.measureText(title).width > w * 0.92 && size > 12) {
      size -= 2;
      ctx.font = `400 ${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    const titleY = subtitle
      ? band.y + band.h * 0.56
      : band.y + band.h * 0.5;
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = state.titleColor;
    ctx.fillText(title, cx, titleY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    let subSize = band.h * 0.19;
    ctx.font = `400 ${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    while (ctx.measureText(subtitle).width > w * 0.88 && subSize > 10) {
      subSize -= 1;
      ctx.font = `400 ${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.bandLine;
    try {
      ctx.letterSpacing = `${Math.max(2, subSize * 0.28)}px`;
    } catch {
      // letterSpacing is Chrome-only; the subtitle still draws without it.
    }
    ctx.fillText(subtitle, cx, band.y + band.h * 0.2);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Reset for the next draw.
    }
  }
}
