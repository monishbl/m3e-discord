// Tiny Chrome DevTools Protocol helper for the running Discord client.
// Usage:
//   node cdp.mjs eval "<js expression>"           -> prints JSON result
//   node cdp.mjs evalfile file.js                  -> run a file's JS, print result
//   node cdp.mjs css file.css                      -> inject/replace <style id="m3e-dev">
//   node cdp.mjs uncss                             -> remove injected style
//   node cdp.mjs shot out.png [width height]       -> screenshot (optionally emulating a window size)
//   SIZE=940x600 node cdp.mjs <cmd> …              -> any command at an emulated window size
import fs from 'node:fs';
const PORT = process.env.CDP_PORT || 9222;
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === 'page' && /discord\.com\/(channels|app|login)|discord\.com/.test(t.url) && !/devtools/.test(t.url)) || list.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return r.result?.result?.value;
}
const [cmd, a, b, c] = process.argv.slice(2);
// SIZE=940x600 node cdp.mjs <cmd> ...  -> run any command with the window emulated at that size
if (process.env.SIZE) { const [w, h] = process.env.SIZE.split('x').map(Number); await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await new Promise(r => setTimeout(r, 900)); }
const out = v => fs.writeSync(1, (typeof v === 'string' ? v : String(v)) + '\n');
if (cmd === 'eval') { const v = await evaluate(a); out(typeof v === 'string' ? v : JSON.stringify(v, null, 1)); }
else if (cmd === 'evalfile') { const v = await evaluate(fs.readFileSync(a, 'utf8')); out(typeof v === 'string' ? v : JSON.stringify(v, null, 1)); }
else if (cmd === 'css') {
  const css = fs.readFileSync(a, 'utf8');
  out(await evaluate(`(()=>{let s=document.getElementById('m3e-dev');if(!s){s=document.createElement('style');s.id='m3e-dev'}document.documentElement.appendChild(s);s.textContent=${JSON.stringify(css)};return 'injected '+s.textContent.length})()`));
} else if (cmd === 'uncss') out(await evaluate(`document.getElementById('m3e-dev')?.remove()||'removed'`));
else if (cmd === 'shot') {
  if (b) await send('Emulation.setDeviceMetricsOverride', { width: +b, height: +c, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, b ? 900 : 200));
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(a, Buffer.from(r.result.data, 'base64'));
  if (b) await send('Emulation.clearDeviceMetricsOverride');
  out('saved', a);
}
else if (cmd === 'mouse') {
  // node cdp.mjs mouse <x> <y> [move|click|right|hover-shot out.png]
  const x = +a, y = +b, act = c || 'click';
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  if (act === 'click' || act === 'right') {
    const button = act === 'right' ? 'right' : 'left';
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 });
  }
  out('ok');
} else if (cmd === 'key') {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: a, code: a, windowsVirtualKeyCode: a === 'Escape' ? 27 : 0 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: a, code: a, windowsVirtualKeyCode: a === 'Escape' ? 27 : 0 });
  out('ok');
}
ws.close(); process.exit(0);
