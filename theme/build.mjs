// Build Midnight Expressive.
//   node theme/build.mjs            -> dist/m3e-<variant>.theme.css for every variants/*.css (+ dist/dev.css for live injection)
//   node theme/build.mjs --install  -> also writes them into ~/.config/Vencord/themes/, with your user ID from config.json
// The source (src/theme.css) uses three macros the build expands:
//   $shapes        -> :root { --m3e-shape-<name>[-r<deg>]: polygon(...) } for every shape referenced as var(--m3e-shape-…)
//   $springs       -> :root { --m3e-spring-<name>: linear(...); --m3e-dur-<name>: <ms> }
//   $loaderframes  -> @keyframes m3e-loader { … } (M3E loading indicator cycle)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { mineSelector } from './mine.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);

/* ---------- springs (M3E MotionScheme, ζ / k, mass 1) ---------- */
function spring(z, k) {
  const w = Math.sqrt(k), wd = w * Math.sqrt(Math.max(0, 1 - z * z));
  const x = t => z < 1 ? 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)) : 1 - Math.exp(-w * t) * (1 + w * t);
  let T = 0; for (let t = 0; t < 3; t += 0.001) if (Math.abs(x(t) - 1) > 0.01) T = t; // stop once within 1% (the 0.2% tail is invisible but kept hovers feeling late)
  T += 0.01; const pts = []; for (let i = 0; i <= 40; i++) pts.push(+x(T * i / 40).toFixed(3));
  pts[40] = 1; return { css: `linear(${pts.join(',')})`, ms: Math.round(T * 1000) };
}
// values verified against androidx compose material3 tokens/ExpressiveMotionTokens.kt:
//   spatial (position/size, may overshoot): fast .6/800, default .8/380, slow .8/200
//   effects (colour + SHAPE morphs — Button.kt uses DefaultEffects "to prevent any bounce"): default 1/1600, fast 1/3800
const SPRINGS = { fast: [0.6, 800], default: [0.8, 380], slow: [0.8, 200], effects: [1, 1600], effectsFast: [1, 3800], loader: [0.6, 200] };

/* ---------- shapes: iRice MaterialShapes.js params / materialshape.frag fields ---------- */
const SH = {
  circle: [0, 1, 0, 1, 0, 1], square: [2, 0, .3, 1, 0, .92], squircle: [2, 0, .45, 1, 0, .96], triangle: [1, 3, .22, 0, 0, .98], diamond: [1, 4, .14, 0, 45, 1],
  pentagon: [1, 5, .16, 0, 0, 1.02], gem: [1, 6, .14, 0, 0, 1], pill: [2, 0, 1, .6, -45, 1], oval: [3, 0, .64, 0, -45, 1],
  cookie4: [0, 4, .16, 1, 45, 1], cookie6: [0, 6, .12, 1, 0, 1], cookie7: [0, 7, .1, 1, -90, 1], cookie9: [0, 9, .08, 1, -90, 1], cookie12: [0, 12, .065, 1, -90, 1],
  sunny: [0, 8, .11, .55, 0, 1], verySunny: [0, 8, .22, .6, 0, 1], softBurst: [0, 10, .13, .75, 0, 1], burst: [0, 12, .2, .45, 0, 1],
  softBoom: [0, 16, .14, .9, 0, 1], clover4: [0, 4, .34, 3, 45, 1], clover8: [0, 8, .2, 2.6, 0, 1], flower: [0, 8, .16, 1.6, 0, 1],
};
function sdPolygon(px, py, n, r) { const an = Math.PI / n, a = Math.atan2(px, py); const bn = ((a + an) % (2 * an) + 2 * an) % (2 * an) - an; const L = Math.hypot(px, py);
  let qx = L * Math.cos(bn), qy = Math.abs(L * Math.sin(bn)); qx -= r * Math.cos(an); qy -= r * Math.sin(an); qy += Math.min(Math.max(-qy, 0), r * Math.sin(an)); return Math.hypot(qx, qy) * Math.sign(qx); }
function field(px, py, s) {
  const [kind, n, a, b, deg, sc] = s, t = deg * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
  const x = (c * px + sn * py) / sc, y = (-sn * px + c * py) / sc; let d;
  if (kind === 0) { const th = Math.atan2(y, x); const r = 1 - a * Math.pow(Math.max(0, .5 - .5 * Math.cos(n * th)), b); d = Math.hypot(x, y) - r; }
  else if (kind === 1) d = sdPolygon(x, y, n, 1 - a) - a;
  else if (kind === 2) { const r = Math.min(a, b); const qx = Math.abs(x) - 1 + r, qy = Math.abs(y) - b + r; d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }
  else { const k0 = Math.hypot(x, y / a), k1 = Math.hypot(x, y / (a * a)); d = k0 * (k0 - 1) / Math.max(k1, 1e-4); }
  return d * sc;
}
const NP = 64;
function polygon(name, rot = 0) {
  const s = SH[name]; if (!s) throw new Error('unknown shape ' + name);
  const pts = [], rr = rot * Math.PI / 180;
  for (let i = 0; i < NP; i++) {
    const th = i / NP * 2 * Math.PI - Math.PI / 2, dx = Math.cos(th - rr), dy = Math.sin(th - rr);
    let lo = 0, hi = 1.6; for (let j = 0; j < 26; j++) { const m = (lo + hi) / 2; field(dx * m, dy * m, s) > 0 ? hi = m : lo = m; }
    const r = (lo + hi) / 2;
    pts.push(`${(50 + 50 * r * Math.cos(th)).toFixed(1)}% ${(50 + 50 * r * Math.sin(th)).toFixed(1)}%`);
  }
  return `polygon(${pts.join(',')})`;
}

/* ---------- build ---------- */
let src = fs.readFileSync(path.join(here, 'src/theme.css'), 'utf8');
const used = new Set([...src.matchAll(/--m3e-shape-([a-zA-Z0-9]+(?:-r-?\d+)?)/g)].map(m => m[1]));
const shapeVars = [...used].sort().map(k => { const [, n, r] = k.match(/^([a-zA-Z0-9]+?)(?:-r(-?\d+))?$/); return `  --m3e-shape-${k}: ${polygon(n, +(r || 0))};`; }).join('\n');
const springVars = Object.entries(SPRINGS).map(([n, [z, k]]) => { const s = spring(z, k); return `  --m3e-spring-${n}: ${s.css};\n  --m3e-dur-${n}: ${s.ms}ms;`; }).join('\n');
// loading indicator: SoftBurst→Cookie9→Pentagon→Pill→Sunny→Cookie4→Oval, +90° each, morph every 650 ms
const seq = ['softBurst', 'cookie9', 'pentagon', 'pill', 'sunny', 'cookie4', 'oval', 'softBurst'];
const lsp = spring(...SPRINGS.loader);
const loader = `@keyframes m3e-loader {\n${seq.map((s, i) => `  ${(i / (seq.length - 1) * 100).toFixed(2)}% { clip-path: ${polygon(s, (i % 4) * 90)}; animation-timing-function: ${lsp.css}; }`).join('\n')}\n}\n@keyframes m3e-spin { to { rotate: 360deg; } }`;

src = src.replace('$shapes', `:root {\n${shapeVars}\n}`).replace('$springs', `:root {\n${springVars}\n}`).replace('$loaderframes', loader);
const pkg = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'));
const core = src.replace(/^\/\*\*[\s\S]*?\*\/\n/, '');   // drop the source's own meta header; each variant brings one

// your-messages flag: public builds carry none (users add it via the QuickCSS snippet from docs/index.html);
// your local install bakes in the ID from the gitignored config.json
const cfg = fs.existsSync(path.join(here, 'config.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8')) : {};
const personalMine = cfg.userId ? mineSelector(cfg.userId, cfg.mineChain || 24) : null;

const variants = fs.readdirSync(path.join(here, 'variants')).filter(f => f.endsWith('.css')).sort((a, b) => (a !== 'midnight.css') - (b !== 'midnight.css') || a.localeCompare(b));
const build = (vfile, mine) => {
  const v = fs.readFileSync(path.join(here, 'variants', vfile), 'utf8');
  const header = v.match(/^\/\*\*[\s\S]*?\*\//)[0].replace(/\n \*\/$/, `\n * @author monishbl\n * @version ${pkg.version}\n * @source https://github.com/monishbl/m3e-discord\n */`);
  const overrides = v.slice(v.indexOf('*/') + 2).trim();
  return `${header}\n${core.replace('$mine', mine || ':not(*)')}${overrides ? `\n/* ── variant: ${vfile.replace('.css', '')} ── */\n${overrides}\n` : ''}`;
};
const dist = path.join(here, '..', 'dist'); fs.mkdirSync(dist, { recursive: true });
for (const f of fs.readdirSync(dist)) if (f.endsWith('.theme.css')) fs.rmSync(path.join(dist, f));
const install = process.argv.includes('--install'), themesDir = path.join(os.homedir(), '.config/Vencord/themes');
for (const vf of variants) {
  const name = `m3e-${vf.replace('.css', '')}.theme.css`, css = build(vf);
  fs.writeFileSync(path.join(dist, name), css);
  console.log(`built dist/${name} (${(css.length / 1024).toFixed(1)} KB)`);
  if (install) { fs.writeFileSync(path.join(themesDir, name), build(vf, personalMine)); console.log(`  installed ${name}${personalMine ? ' (with your user ID)' : ''}`); }
}
// dev.css: the midnight variant, personal, without Midnight's @import (inject on top of a running theme with tools/cdp.mjs)
fs.writeFileSync(path.join(dist, 'dev.css'), build('midnight.css', personalMine).replace(/@import url\('https:\/\/refact0r[^\n]*\n/, ''));
console.log(`${used.size} shapes`);
