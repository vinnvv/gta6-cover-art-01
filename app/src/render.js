// Renders a high-impact GTA-style multi-panel cover onto a canvas:
// bold comic-poster framing, clipped photo panels (rectangular or slanted),
// portrait-safe upper-bias framing so faces never clip in wide/square panels,
// layered Vice sunset/neon grading, atmospheric flare, deterministic grain,
// and an extruded poster title lockup with dual-tone neon trim.
import { panelRects, bandRect, outerFrame } from './layouts.js';

const BACKDROP = '#09070e';

/** A photo transform: zoom (1 and up) and a pan offset in fractions of the rect. */
export function freshTransform() {
  return { zoom: 1, ox: 0, oy: 0 };
}

/**
 * Draws one photo cover-fitting rect (x, y, w, h), honouring its transform.
 * Uses portrait-safe upper-bias vertical anchoring (~14% from top instead of
 * 50% center crop) whenever the photo is taller than the panel, so heads and
 * faces stay cleanly framed in wide (1920x1080), square, and Skyline panels.
 */
export function drawPhotoInto(ctx, photo, rx, ry, rw, rh, t) {
  const base = Math.max(rw / photo.naturalWidth, rh / photo.naturalHeight);
  const scale = base * t.zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const extraX = Math.max(0, pw - rw);
  const extraY = Math.max(0, ph - rh);
  const baseX = rx - extraX * 0.5;
  const baseY = ry - extraY * 0.14;
  const panRangeX = Math.max(rw * 0.3, extraX * 0.5);
  const panRangeY = Math.max(rh * 0.3, extraY * 0.5);
  const dx = baseX + t.ox * panRangeX;
  const dy = baseY + t.oy * panRangeY;
  ctx.drawImage(photo, dx, dy, pw, ph);
}

let grainTile = null;

/** Deterministic tiled film-grain noise canvas for consistent crisp exports. */
export function grainCanvas() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const g = tile.getContext('2d');
  const data = g.createImageData(128, 128);
  let seed = 133791;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = (seed >>> 24) & 255;
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Builds the clip/stroke path for a panel (rectangle or slanted polygon). */
function tracePanelPath(ctx, r) {
  ctx.beginPath();
  if (r.poly) {
    r.poly.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  } else {
    ctx.rect(r.x, r.y, r.w, r.h);
  }
}

/** Draws a stylish placeholder gradient inside an unloaded panel. */
function drawEmptyPanel(ctx, r, idx, grade) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, '#2a183f');
  g.addColorStop(0.55, '#19102b');
  g.addColorStop(1, '#0e0a18');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // Subtle diagonal Vice stripes in empty panels
  ctx.save();
  ctx.strokeStyle = grade.bandLine || '#ff5a8a';
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = Math.max(8, r.w * 0.04);
  for (let offset = -r.h; offset < r.w + r.h; offset += Math.max(36, r.w * 0.18)) {
    ctx.beginPath();
    ctx.moveTo(r.x + offset, r.y);
    ctx.lineTo(r.x + offset - r.h * 0.5, r.y + r.h);
    ctx.stroke();
  }
  ctx.restore();

  // Panel number watermark
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.font = `400 ${Math.round(Math.min(r.w, r.h) * 0.16)}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${idx + 1}`, r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

/** Draws a small crisp 5-point star (pure geometric accent). */
function drawStar(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
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
  const pad = outerFrame(w, h);
  const rects = panelRects(layout, w, h);
  const band = bandRect(layout, w, h);
  const photoAreaW = w - pad * 2;
  const photoAreaH = band.y - pad * 2;

  // 1. Solid obsidian poster backdrop (forms outer border & thick comic gutters).
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, w, h);

  // 2. Render each panel clipped cleanly into its frame (both span & split modes).
  const spanSlot = state.photos[state.spanPhoto];
  rects.forEach((r, i) => {
    const slot = state.mode === 'span'
      ? spanSlot
      : state.photos[state.panelPhoto[i] ?? 0];

    ctx.save();
    tracePanelPath(ctx, r);
    ctx.clip();

    if (slot && slot.img) {
      if (grade.filter && grade.filter !== 'none') ctx.filter = grade.filter;
      if (state.mode === 'span') {
        drawPhotoInto(ctx, slot.img, pad, pad, photoAreaW, photoAreaH, slot);
      } else {
        drawPhotoInto(ctx, slot.img, r.x, r.y, r.w, r.h, slot);
      }
      ctx.filter = 'none';
    } else {
      drawEmptyPanel(ctx, r, i, grade);
    }

    // Per-panel subtle inner shadow so each panel feels recessed like printed art.
    const edgeGrad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.14)');
    edgeGrad.addColorStop(0.14, 'rgba(0, 0, 0, 0)');
    edgeGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0)');
    edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.restore();
  });

  // 3. Colour grade atmospheric wash + sun/neon flare clipped to the panels only.
  ctx.save();
  ctx.beginPath();
  rects.forEach((r) => {
    if (r.poly) {
      r.poly.forEach(([px, py], idx) => {
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    } else {
      ctx.rect(r.x, r.y, r.w, r.h);
    }
  });
  ctx.clip();

  if (grade.stops && grade.stops.length > 0) {
    const wash = ctx.createLinearGradient(0, pad, w * 0.25, band.y - pad);
    for (const [at, color] of grade.stops) wash.addColorStop(at, color);
    ctx.fillStyle = wash;
    ctx.fillRect(pad, pad, photoAreaW, photoAreaH);
  }

  if (grade.flare) {
    const fx = pad + photoAreaW * grade.flare.x;
    const fy = pad + photoAreaH * grade.flare.y;
    const fr = Math.max(photoAreaW, photoAreaH) * grade.flare.r;
    const flare = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    flare.addColorStop(0, grade.flare.color);
    flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = flare;
    ctx.fillRect(pad, pad, photoAreaW, photoAreaH);
    ctx.restore();
  }

  // Vignette across the photo mosaic
  const vig = ctx.createRadialGradient(
    w / 2, band.y / 2, Math.min(w, band.y) * 0.34,
    w / 2, band.y / 2, Math.max(w, band.y) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(6,3,12,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(pad, pad, photoAreaW, photoAreaH);

  // Subtle film grain texture
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat');
  ctx.fillRect(pad, pad, photoAreaW, photoAreaH);
  ctx.restore();

  ctx.restore(); // end panel clip

  // 4. Crisp inner highlight rim on each panel for glossy print definition
  ctx.save();
  ctx.strokeStyle = grade.rim || 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.0022);
  rects.forEach((r) => {
    tracePanelPath(ctx, r);
    ctx.stroke();
  });
  ctx.restore();

  // 5. Caption Band with rich dark gradient + glowing dual-tone neon rule
  const bandGrad = ctx.createLinearGradient(0, band.y, 0, h);
  bandGrad.addColorStop(0, grade.bandTop || grade.band);
  bandGrad.addColorStop(1, grade.bandBottom || '#07050b');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Subtle ambient horizon glow bleeding softly into top of caption band
  const bandGlow = ctx.createRadialGradient(
    w / 2, band.y, 10,
    w / 2, band.y, w * 0.55,
  );
  bandGlow.addColorStop(0, grade.accentGlow || 'rgba(255, 90, 138, 0.32)');
  bandGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = bandGlow;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.restore();

  // Dual-tone neon accent bar at top of caption band
  const lineH = Math.max(4, Math.round(h * 0.0055));
  const lineGrad = ctx.createLinearGradient(pad, 0, w - pad, 0);
  lineGrad.addColorStop(0, grade.bandLine);
  lineGrad.addColorStop(0.5, grade.bandLine2 || grade.bandLine);
  lineGrad.addColorStop(1, grade.bandLine);
  ctx.save();
  ctx.shadowColor = grade.accentGlow || grade.bandLine;
  ctx.shadowBlur = Math.max(8, h * 0.012);
  ctx.fillStyle = lineGrad;
  ctx.fillRect(pad, band.y, w - pad * 2, lineH);
  ctx.restore();

  // Subtle decorative 5-star corner accent (top-right inside caption band)
  const starR = Math.max(4, band.h * 0.036);
  const starGap = starR * 2.5;
  const starsStartX = w - pad - starGap * 4.2;
  const starsY = band.y + band.h * 0.22;
  ctx.save();
  ctx.fillStyle = grade.bandLine;
  ctx.globalAlpha = 0.72;
  for (let s = 0; s < 5; s++) {
    drawStar(ctx, starsStartX + s * starGap, starsY, starR, starR * 0.44);
  }
  ctx.restore();

  // 6. Subtitle Kicker with flanked neon accent rules
  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim().toUpperCase();
  const cx = w / 2;

  if (subtitle) {
    let subSize = band.h * 0.185;
    ctx.font = `400 ${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    while (ctx.measureText(subtitle).width > w * 0.68 && subSize > 11) {
      subSize -= 1;
      ctx.font = `400 ${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    }
    const subY = band.y + band.h * 0.22;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.letterSpacing = `${Math.max(2, subSize * 0.26)}px`;
    } catch {
      // Chrome-only letterSpacing
    }
    const textW = ctx.measureText(subtitle).width;
    ctx.fillStyle = grade.bandLine;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(subtitle, cx, subY);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Reset
    }

    // Crisp flanking rules beside subtitle
    const ruleGap = Math.max(12, w * 0.016);
    const ruleLen = Math.min(w * 0.08, Math.max(18, (w * 0.56 - textW) * 0.25));
    if (ruleLen >= 16) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = grade.bandLine2 || grade.bandLine;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(2, h * 0.0022);
      ctx.beginPath();
      ctx.moveTo(cx - textW / 2 - ruleGap - ruleLen, subY);
      ctx.lineTo(cx - textW / 2 - ruleGap, subY);
      ctx.moveTo(cx + textW / 2 + ruleGap, subY);
      ctx.lineTo(cx + textW / 2 + ruleGap + ruleLen, subY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Bold GTA-Style Extruded Poster Title Lockup
  if (title) {
    let size = band.h * 0.56 * state.titleSize;
    ctx.font = `400 ${size}px Anton, 'Arial Narrow', sans-serif`;
    while (ctx.measureText(title).width > w * 0.9 && size > 14) {
      size -= 2;
      ctx.font = `400 ${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    const titleY = subtitle
      ? band.y + band.h * 0.61
      : band.y + band.h * 0.53;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    // Layer A: Hard comic 3D extrusion shadow
    const extrudeX = Math.max(3, size * 0.045);
    const extrudeY = Math.max(4, size * 0.06);
    ctx.fillStyle = '#050308';
    ctx.strokeStyle = '#050308';
    ctx.lineWidth = Math.max(5, size * 0.11);
    ctx.strokeText(title, cx + extrudeX, titleY + extrudeY);
    ctx.fillText(title, cx + extrudeX, titleY + extrudeY);

    // Layer B: Subtle accent rim glow behind stroke
    ctx.shadowColor = grade.accentGlow || 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.16;
    ctx.strokeStyle = '#0b0712';
    ctx.lineWidth = Math.max(4, size * 0.095);
    ctx.strokeText(title, cx, titleY);

    // Layer C: Crisp fill with subtle top-to-bottom glossy sheen
    ctx.shadowBlur = 0;
    const fillGrad = ctx.createLinearGradient(0, titleY - size * 0.45, 0, titleY + size * 0.45);
    fillGrad.addColorStop(0, '#ffffff');
    fillGrad.addColorStop(0.28, state.titleColor);
    fillGrad.addColorStop(1, state.titleColor);
    ctx.fillStyle = state.titleColor.toLowerCase() === '#ffffff'
      ? fillGrad
      : state.titleColor;
    ctx.fillText(title, cx, titleY);

    ctx.restore();
  }

  // 8. Crisp outer poster border hairline so exported PNG frames cleanly on dark or light feeds
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.002);
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}
