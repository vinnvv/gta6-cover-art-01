// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the finished cover alone. The query also
// picks the photo, layout, grade, caption and export size, so each screenshot
// is the app's own drawing of one of its covers. window.__shotReady is set
// once the scene has painted.
import { applyScene, render } from './editor.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    photo: params.get('photo') ?? 'pier',
    photo2: params.get('photo2') ?? undefined,
    photo3: params.get('photo3') ?? undefined,
    title: params.get('caption') ?? 'Sunset Heist',
    subtitle: params.get('subtitle') ?? 'Neon Nights',
    layout: params.get('layout') ?? 'trio',
    grade: params.get('grade') ?? 'sunset',
    mode: params.get('mode') ?? 'span',
    size: params.get('size') ?? '1080x1080',
    panelPhoto: params.get('panels')
      ? params.get('panels').split(',').map(Number)
      : undefined,
  };
  applyScene(scene)
    .catch(() => render())
    .finally(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.__shotReady = true;
        });
      });
    });
}
