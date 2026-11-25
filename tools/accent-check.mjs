// Sweeps every hue (and a grey seed) through the accent tone tables in theme.css and
// light.css and checks each text/fill pair for WCAG contrast after sRGB clipping
// (what Chromium does with out-of-gamut oklch). Usage: node tools/accent-check.mjs
const lin = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
function oklchToSrgb(L, C, H) {
  const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = x => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055; };
  return [r, g, bl].map(enc);
}
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const cr = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };

// [L, chroma cap, hue offset]
const T = {
  dark: { primary: [.82, .12, 0], onPrimary: [.24, .05, 0], primaryC: [.75, .13, 0], onPrimaryC: [.22, .06, 0],
          secondaryC: [.35, .06, 0], onSecondaryC: [.93, .035, 0], tertiaryC: [.73, .17, 95], onTertiaryC: [.22, .08, 95],
          mention: [.97, .03, 0], surface: '#14161b', surfaceHigh: '#21242c', onSurface: '#e7ebf3' },
  light: { primary: [.47, .09, 0], onPrimary: [.98, .015, 0], primaryC: [.80, .13, 0], onPrimaryC: [.27, .06, 0],
           secondaryC: [.89, .05, 0], onSecondaryC: [.27, .05, 0], tertiaryC: [.78, .15, 95], onTertiaryC: [.25, .09, 95],
           mention: [.40, .08, 0], surface: '#f7f9fc', surfaceHigh: '#e5e9f0', onSurface: '#161a21' },
};
const PAIRS = [['primaryC', 'onPrimaryC', 4.5], ['secondaryC', 'onSecondaryC', 4.5], ['tertiaryC', 'onTertiaryC', 4.5],
  ['primary', 'onPrimary', 4.5], ['surface', 'primary', 4.5], ['surfaceHigh', 'primary', 3], ['surface', 'primaryC', 1.3]]  // a fill only has to stand apart (M3 containers aren't held to 3:1);
let bad = 0;
for (const [look, t] of Object.entries(T)) {
  let worst = {};
  for (const seedC of [0, 0.05, 0.4]) for (let h = 0; h < 360; h++) {
    const col = k => typeof t[k] === 'string' ? hex(t[k]) : oklchToSrgb(t[k][0], Math.min(seedC, t[k][1]), h + t[k][2]);
    for (const [a, b, min] of PAIRS) {
      const r = cr(col(a), col(b)), key = `${a}/${b}`;
      if (!worst[key] || r < worst[key].r) worst[key] = { r, h, seedC, min };
    }
  }
  for (const [k, w] of Object.entries(worst)) {
    const ok = w.r >= w.min; if (!ok) bad++;
    console.log(`${look.padEnd(5)} ${k.padEnd(24)} worst ${w.r.toFixed(2)} (hue ${w.h}, seed chroma ${w.seedC}) ${ok ? 'ok' : 'FAIL < ' + w.min}`);
  }
}
process.exit(bad ? 1 : 0);
