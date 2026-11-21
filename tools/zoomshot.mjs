// node tools/zoomshot.mjs out.png x y w h [scale]  -> high-res crop of a screen region
import fs from 'node:fs';
const [out, x, y, w, h, scale = 4] = process.argv.slice(2);
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page' && /discord\.com/.test(t.url));
const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: +x, y: +y, width: +w, height: +h, scale: +scale } });
if (!r.result) { console.error('capture failed:', JSON.stringify(r.error)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(r.result.data, 'base64')); console.log('saved', out); ws.close(); process.exit(0);
