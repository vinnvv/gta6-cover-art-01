// Wires the Vice Panels editor: photo slots, layout and grade pickers, the
// caption, panel selection with drag-to-pan and scroll-to-zoom, and PNG export
// in the three post sizes. Every photo stays on the visitor's machine.
import { LAYOUTS, panelAt } from './layouts.js';
import { GRADES } from './grades.js';
import { renderCover, freshTransform } from './render.js';

export const EXPORT_SIZES = {
  '1080x1080': { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

const TITLE_COLORS = ['#ffffff', '#ffd23f', '#ff5a8a', '#37e6ff'];

export const state = {
  layoutKey: 'trio',
  gradeKey: 'sunset',
  mode: 'span',
  spanPhoto: 0,
  photos: [null, null, null],
  panelPhoto: [0, 1, 2, 0],
  selected: 0,
  title: 'Sunset Heist',
  subtitle: 'Neon Nights',
  titleSize: 1,
  titleColor: '#ffffff',
  sizeKey: '1080x1080',
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');

/** The render state the cover painter reads from the editor state. */
export function viewState() {
  return {
    layout: LAYOUTS[state.layoutKey],
    grade: GRADES[state.gradeKey],
    mode: state.mode,
    spanPhoto: state.spanPhoto,
    photos: state.photos,
    panelPhoto: state.panelPhoto,
    title: state.title,
    subtitle: state.subtitle,
    titleSize: state.titleSize,
    titleColor: state.titleColor,
  };
}

/** Paints the preview canvas from the editor state. */
export function render() {
  renderCover(preview, viewState());
}

/** Loads an image element from a blob or file. */
export function loadImageObject(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = source;
  });
}

/** Loads a sample photo from app/samples into a slot. */
export async function loadSample(name, slot) {
  const img = await loadImageObject(`samples/${name}.jpg`);
  state.photos[slot] = { img, name, ...freshTransform() };
  syncPhotoLabels();
  render();
}

/** Loads a visitor's own file into a slot, read locally, never uploaded. */
export async function loadUserFile(file, slot) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageObject(url);
    state.photos[slot] = { img, name: file.name, ...freshTransform() };
  } finally {
    URL.revokeObjectURL(url);
  }
  syncPhotoLabels();
  render();
}

/** The photo the sliders and the drag gesture edit right now. */
export function activePhoto() {
  if (state.mode === 'span') return state.photos[state.spanPhoto];
  return state.photos[state.panelPhoto[state.selected] ?? 0];
}

/** Keeps the slot labels and the sliders in step with the state. */
export function syncPhotoLabels() {
  state.photos.forEach((slot, i) => {
    const label = $(`photo-name-${i}`);
    if (label) label.textContent = slot ? slot.name : 'No photo yet';
  });
  const active = activePhoto();
  const panelLabel = $('panel-label');
  if (panelLabel) {
    panelLabel.textContent =
      state.mode === 'span'
        ? `Spanning photo ${state.spanPhoto + 1}`
        : `Panel ${state.selected + 1}, photo ${(state.panelPhoto[state.selected] ?? 0) + 1}`;
  }
  if (active) {
    $('zoom').value = String(active.zoom);
    $('pan-x').value = String(active.ox);
    $('pan-y').value = String(active.oy);
  }
}

/** Rebuilds the per-panel photo pickers for the current layout and mode. */
export function rebuildAssign() {
  const box = $('panel-assign');
  box.textContent = '';
  if (state.mode === 'span') {
    const label = document.createElement('label');
    label.textContent = 'Photo across all panels ';
    const select = document.createElement('select');
    select.id = 'span-photo';
    state.photos.forEach((slot, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `Photo ${i + 1}${slot ? ` (${slot.name})` : ''}`;
      select.append(option);
    });
    select.value = String(state.spanPhoto);
    select.addEventListener('change', () => {
      state.spanPhoto = Number(select.value);
      syncPhotoLabels();
      render();
    });
    label.append(select);
    box.append(label);
    return;
  }
  const count = LAYOUTS[state.layoutKey].panels.length;
  for (let i = 0; i < count; i++) {
    const label = document.createElement('label');
    label.textContent = `Panel ${i + 1} `;
    const select = document.createElement('select');
    select.dataset.panel = String(i);
    state.photos.forEach((slot, j) => {
      const option = document.createElement('option');
      option.value = String(j);
      option.textContent = `Photo ${j + 1}${slot ? ` (${slot.name})` : ''}`;
      select.append(option);
    });
    const empty = document.createElement('option');
    empty.value = '-1';
    empty.textContent = 'Empty';
    select.append(empty);
    select.value = String(state.panelPhoto[i] ?? -1);
    select.addEventListener('change', () => {
      state.panelPhoto[i] = Number(select.value);
      syncPhotoLabels();
      render();
    });
    label.append(select);
    box.append(label);
  }
}

/** Switches the export size, resizing the preview canvas to match. */
export function setExportSize(key) {
  state.sizeKey = key;
  const size = EXPORT_SIZES[key];
  preview.width = size.w;
  preview.height = size.h;
  document.querySelectorAll('#size-row button').forEach((button) => {
    button.classList.toggle('picked', button.dataset.size === key);
  });
  render();
}

/** Downloads the preview canvas as a PNG in the chosen post size. */
export function exportPng() {
  const size = EXPORT_SIZES[state.sizeKey];
  preview.toBlob((blob) => {
    if (!blob) {
      $('status').textContent = 'Export failed. Try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${state.sizeKey}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('status').textContent = `Saved vice-panels-${state.sizeKey}.png (${size.w} x ${size.h}).`;
  }, 'image/png');
}

/** Builds the picker buttons for layouts, grades, sizes and title colours. */
function buildPickers() {
  const layoutRow = $('layout-row');
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.dataset.layout = key;
    const diagram = document.createElement('span');
    diagram.className = 'diagram';
    layout.panels.forEach((p) => {
      const cell = document.createElement('i');
      cell.style.left = `${p.x * 100}%`;
      cell.style.top = `${p.y * 78}%`;
      cell.style.width = `${p.w * 100}%`;
      cell.style.height = `${p.h * 78}%`;
      diagram.append(cell);
    });
    const caption = document.createElement('span');
    caption.textContent = layout.label;
    button.append(diagram, caption);
    button.addEventListener('click', () => {
      state.layoutKey = key;
      document.querySelectorAll('#layout-row .pick').forEach((b) => {
        b.classList.toggle('picked', b.dataset.layout === key);
      });
      rebuildAssign();
      render();
    });
    layoutRow.append(button);
  }
  layoutRow.querySelector('[data-layout="trio"]').classList.add('picked');

  const gradeRow = $('grade-row');
  for (const [key, grade] of Object.entries(GRADES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.dataset.grade = key;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = grade.stops.length
      ? `linear-gradient(135deg, ${grade.stops[0][1]}, ${grade.stops[grade.stops.length - 1][1]})`
      : '#3a3345';
    const caption = document.createElement('span');
    caption.textContent = grade.label;
    button.append(swatch, caption);
    button.addEventListener('click', () => {
      state.gradeKey = key;
      document.querySelectorAll('#grade-row .pick').forEach((b) => {
        b.classList.toggle('picked', b.dataset.grade === key);
      });
      render();
    });
    gradeRow.append(button);
  }
  gradeRow.querySelector('[data-grade="sunset"]').classList.add('picked');

  const sizeRow = $('size-row');
  for (const [key, size] of Object.entries(EXPORT_SIZES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.dataset.size = key;
    button.textContent = size.label;
    button.addEventListener('click', () => setExportSize(key));
    sizeRow.append(button);
  }
  sizeRow.querySelector('[data-size="1080x1080"]').classList.add('picked');

  const colorRow = $('title-colors');
  for (const color of TITLE_COLORS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch-btn';
    button.dataset.color = color;
    button.style.background = color;
    button.setAttribute('aria-label', `Title colour ${color}`);
    button.addEventListener('click', () => {
      state.titleColor = color;
      document.querySelectorAll('#title-colors .swatch-btn').forEach((b) => {
        b.classList.toggle('picked', b.dataset.color === color);
      });
      render();
    });
    colorRow.append(button);
  }
  colorRow.querySelector('[data-color="#ffffff"]').classList.add('picked');
}

/** Wires the photo slots, caption fields, sliders and canvas gestures. */
function wireControls() {
  state.photos.forEach((_, slot) => {
    $(`photo-${slot}`).addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        await loadUserFile(file, slot);
        $('status').textContent = `Photo ${slot + 1} loaded: ${file.name}.`;
      } catch {
        $('status').textContent = 'That file could not be read as an image.';
      }
    });
  });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      const slot = Number(button.dataset.slot);
      try {
        await loadSample(button.dataset.sample, slot);
        $('status').textContent = `Sample ${button.dataset.sample} loaded into photo ${slot + 1}.`;
      } catch {
        $('status').textContent = 'The sample photo failed to load.';
      }
    });
  });

  $('mode-span').addEventListener('click', () => {
    state.mode = 'span';
    $('mode-span').classList.add('picked');
    $('mode-split').classList.remove('picked');
    rebuildAssign();
    syncPhotoLabels();
    render();
  });
  $('mode-split').addEventListener('click', () => {
    state.mode = 'split';
    $('mode-split').classList.add('picked');
    $('mode-span').classList.remove('picked');
    rebuildAssign();
    syncPhotoLabels();
    render();
  });

  $('title').addEventListener('input', (event) => {
    state.title = event.target.value;
    render();
  });
  $('subtitle').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    render();
  });
  $('title-size').addEventListener('input', (event) => {
    state.titleSize = Number(event.target.value);
    render();
  });
  $('zoom').addEventListener('input', (event) => {
    const photo = activePhoto();
    if (!photo) return;
    photo.zoom = Number(event.target.value);
    render();
  });
  $('pan-x').addEventListener('input', (event) => {
    const photo = activePhoto();
    if (!photo) return;
    photo.ox = Number(event.target.value);
    render();
  });
  $('pan-y').addEventListener('input', (event) => {
    const photo = activePhoto();
    if (!photo) return;
    photo.oy = Number(event.target.value);
    render();
  });
  $('fill').addEventListener('click', () => {
    const photo = activePhoto();
    if (!photo) return;
    Object.assign(photo, freshTransform());
    syncPhotoLabels();
    render();
  });
  $('export').addEventListener('click', exportPng);

  let drag = null;
  preview.addEventListener('pointerdown', (event) => {
    const rect = preview.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * preview.width;
    const y = ((event.clientY - rect.top) / rect.height) * preview.height;
    const panel = panelAt(LAYOUTS[state.layoutKey], preview.width, preview.height, x, y);
    if (panel === -1) return;
    state.selected = panel;
    const photo = activePhoto();
    drag = { x: event.clientX, y: event.clientY, ox: photo ? photo.ox : 0, oy: photo ? photo.oy : 0 };
    preview.setPointerCapture(event.pointerId);
    syncPhotoLabels();
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const photo = activePhoto();
    if (!photo) return;
    const rect = preview.getBoundingClientRect();
    const scaleX = preview.width / rect.width;
    const scaleY = preview.height / rect.height;
    photo.ox = Math.max(-1, Math.min(1, drag.ox + ((event.clientX - drag.x) * scaleX) / (preview.width * 0.3)));
    photo.oy = Math.max(-1, Math.min(1, drag.oy + ((event.clientY - drag.y) * scaleY) / (preview.height * 0.3)));
    syncPhotoLabels();
    render();
  });
  preview.addEventListener('pointerup', () => {
    drag = null;
  });
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const photo = activePhoto();
    if (!photo) return;
    photo.zoom = Math.max(1, Math.min(3, photo.zoom * Math.exp(-event.deltaY * 0.001)));
    syncPhotoLabels();
    render();
  }, { passive: false });
}

/**
 * Applies a fixed scene (used by the screenshot helper): loads sample photos,
 * sets the layout, grade, caption and export size, then paints.
 */
export async function applyScene(scene) {
  if (scene.photo) await loadSample(scene.photo, 0);
  if (scene.photo2) await loadSample(scene.photo2, 1);
  if (scene.photo3) await loadSample(scene.photo3, 2);
  if (scene.layout && LAYOUTS[scene.layout]) {
    state.layoutKey = scene.layout;
    document.querySelectorAll('#layout-row .pick').forEach((b) => {
      b.classList.toggle('picked', b.dataset.layout === scene.layout);
    });
  }
  if (scene.grade && GRADES[scene.grade]) {
    state.gradeKey = scene.grade;
    document.querySelectorAll('#grade-row .pick').forEach((b) => {
      b.classList.toggle('picked', b.dataset.grade === scene.grade);
    });
  }
  if (scene.mode) {
    state.mode = scene.mode;
    $('mode-span').classList.toggle('picked', scene.mode === 'span');
    $('mode-split').classList.toggle('picked', scene.mode === 'split');
  }
  if (scene.title !== undefined) {
    state.title = scene.title;
    $('title').value = scene.title;
  }
  if (scene.subtitle !== undefined) {
    state.subtitle = scene.subtitle;
    $('subtitle').value = scene.subtitle;
  }
  if (scene.size && EXPORT_SIZES[scene.size]) setExportSize(scene.size);
  if (scene.spanPhoto !== undefined) state.spanPhoto = scene.spanPhoto;
  if (scene.panelPhoto) state.panelPhoto = scene.panelPhoto;
  rebuildAssign();
  syncPhotoLabels();
  render();
}

buildPickers();
wireControls();
rebuildAssign();
syncPhotoLabels();
if (document.fonts) {
  Promise.all([
    document.fonts.load('400 100px Anton'),
    document.fonts.load('400 40px "Bebas Neue"'),
  ])
    .catch(() => {})
    .finally(() => render());
}
render();
