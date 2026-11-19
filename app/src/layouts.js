// Panel layouts for the cover. A layout names its panels as fractions of the
// photo area (the canvas above the caption band) and the height of that band,
// also as a fraction of the canvas height. Gaps between panels are the dark
// backdrop showing through, so every layout reads as a framed poster.
export const LAYOUTS = {
  trio: {
    label: 'Vice Trio',
    band: 0.2,
    panels: [
      { x: 0, y: 0, w: 0.326, h: 1 },
      { x: 0.337, y: 0, w: 0.326, h: 1 },
      { x: 0.674, y: 0, w: 0.326, h: 1 },
    ],
  },
  hero: {
    label: 'Hero Split',
    band: 0.18,
    panels: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.59, y: 0, w: 0.41, h: 0.49 },
      { x: 0.59, y: 0.51, w: 0.41, h: 0.49 },
    ],
  },
  quad: {
    label: 'Quad',
    band: 0.16,
    panels: [
      { x: 0, y: 0, w: 0.495, h: 0.42 },
      { x: 0.505, y: 0, w: 0.495, h: 0.42 },
      { x: 0, y: 0.43, w: 0.495, h: 0.57 },
      { x: 0.505, y: 0.43, w: 0.495, h: 0.57 },
    ],
  },
  skyline: {
    label: 'Skyline',
    band: 0.2,
    panels: [
      { x: 0, y: 0, w: 1, h: 0.58 },
      { x: 0, y: 0.59, w: 0.326, h: 0.41 },
      { x: 0.337, y: 0.59, w: 0.326, h: 0.41 },
      { x: 0.674, y: 0.59, w: 0.326, h: 0.41 },
    ],
  },
};

/** Panel rectangles in pixels for a canvas of width w and height h. */
export function panelRects(layout, w, h) {
  const bandH = h * layout.band;
  const areaH = h - bandH;
  return layout.panels.map((p) => ({
    x: p.x * w,
    y: p.y * areaH,
    w: p.w * w,
    h: p.h * areaH,
  }));
}

/** The caption band rectangle in pixels for a canvas of width w and height h. */
export function bandRect(layout, w, h) {
  const bandH = h * layout.band;
  return { x: 0, y: h - bandH, w, h: bandH };
}

/** Index of the panel containing point (x, y) in pixels, or -1. */
export function panelAt(layout, w, h, x, y) {
  const rects = panelRects(layout, w, h);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}
