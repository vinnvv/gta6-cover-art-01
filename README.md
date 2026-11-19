# Vice Panels

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/vinnvv/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/vinnvv/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Vice Panels is a GTA-style cover art maker that runs entirely offline in a
desktop browser. Load your own photos, pick a multi-panel layout, write a
caption, choose a Vice City sunset or neon colour grade, and export the cover
as a PNG to share. Referral code: `9j79nw8m`.

## How it works

1. Load up to three photos from your machine (or try the two samples). Your
   photos are read locally and never uploaded.
2. Pick a panel layout: Vice Trio, Hero Split, Quad, or Skyline. Fill every
   panel with one photo, or give each panel its own photo.
3. Write the title and subtitle, pick the title colour and size.
4. Click a panel in the preview to select it, drag to move its photo, scroll
   to zoom. Sliders do the same for the selected panel.
5. Pick a colour grade (Vice Sunset, Neon Nights, Palm Dusk, or No Grade)
   and an export size (1080 x 1080, 1080 x 1350, or 1920 x 1080), then
   Export PNG.

## What is inside

- `app/index.html` and `app/style.css`: the editor page.
- `app/src/layouts.js`: the four panel layouts.
- `app/src/grades.js`: the four colour grades.
- `app/src/render.js`: the cover painter (panels, grade wash, caption
  lettering, grain and vignette).
- `app/src/editor.js`: the editor wiring, photo handling and export.
- `app/src/shots.js`: fixed scenes for the screenshots.
- `app/fonts/`: Anton and Bebas Neue, both under the SIL Open Font License
  (see `OFL.txt`), and `app/samples/`: two sample photos made with an image
  model for make.fun, free to use.

Everything is original: no Rockstar logo, artwork, character or font is used.
The app loads nothing from the network; every script, font and image is a
file under `app/`.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## License

MIT. See `LICENSE`.
