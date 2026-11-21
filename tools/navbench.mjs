// NAV_A=/channels/<guild>/<channel> NAV_B=/channels/@me/<dm> node tools/navbench.mjs [label]
//   -> style/layout/script ms for switching between two pages + opening Settings (forced restyle; works with a hidden window)
const label = process.argv[2] || '';
const A = process.env.NAV_A, B = process.env.NAV_B;
if (!A || !B) { console.error('set NAV_A and NAV_B to two Discord paths, e.g. /channels/<guild>/<channel>'); process.exit(1); }
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page' && /discord\.com/.test(t.url));
const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = expr => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
await send('Performance.enable');
const m = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(x => [x.name, x.value]));
const step = async (name, js) => {
  const a = await m();
  await ev(`(async()=>{${js};await new Promise(r=>setTimeout(r,1200));document.body.offsetHeight;})()`);
  const b = await m(); const d = k => ((b[k] - a[k]) * 1000).toFixed(0).padStart(5);
  return `${name.padEnd(14)} style${d('RecalcStyleDuration')}  layout${d('LayoutDuration')}  script${d('ScriptDuration')}`;
};
const nav = p => `Vencord.Webpack.Common.NavigationRouter.transitionTo('${p}')`;
const out = [];
for (let i = 0; i < 2; i++) {
  out.push(await step('→ page A', nav(A)));
  out.push(await step('→ page B', nav(B)));
  out.push(await step('open settings', `Vencord.Webpack.Common.SettingsRouter.openUserSettings('my_account_panel')`));
  out.push(await step('close settings', `Vencord.Webpack.Common.FluxDispatcher.dispatch({type:'LAYER_POP'})`));
}
console.log(`== ${label}\n` + out.join('\n'));
ws.close(); process.exit(0);
