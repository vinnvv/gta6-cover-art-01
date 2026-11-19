// Colour grades. A grade is a canvas filter for the photos, a gradient overlay
// painted over the photo area, and the caption band's colours. All four are
// original looks built from plain colour stops: Vice Sunset (warm magenta and
// orange), Neon Nights (cyan and hot pink), Palm Dusk (violet and teal), and
// No Grade for the photo as it is.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.25) contrast(1.06) brightness(1.02)',
    stops: [
      [0, 'rgba(255,170,60,0.10)'],
      [0.55, 'rgba(255,90,40,0.16)'],
      [1, 'rgba(190,30,110,0.42)'],
    ],
    band: '#170a1e',
    bandLine: '#ff5a3c',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.35) contrast(1.08)',
    stops: [
      [0, 'rgba(0,220,255,0.20)'],
      [0.5, 'rgba(120,60,255,0.14)'],
      [1, 'rgba(255,0,180,0.32)'],
    ],
    band: '#0a0a22',
    bandLine: '#00e0ff',
  },
  dusk: {
    label: 'Palm Dusk',
    filter: 'saturate(1.15) contrast(1.04)',
    stops: [
      [0, 'rgba(90,40,160,0.22)'],
      [1, 'rgba(0,180,160,0.20)'],
    ],
    band: '#120e26',
    bandLine: '#7a5cff',
  },
  clean: {
    label: 'No Grade',
    filter: 'none',
    stops: [],
    band: '#111014',
    bandLine: '#f2eef5',
  },
};
