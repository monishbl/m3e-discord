// node tools/matched.mjs "<css selector>" [prop-regex]  -> rules that set matching props on the LAST element matching selector
const [sel, propRe = 'background|radius'] = process.argv.slice(2);
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page' && /discord\.com/.test(t.url));
const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('DOM.enable'); await send('CSS.enable');
const { result: { root } } = await send('DOM.getDocument', { depth: 0 });
const { result: { nodeIds } } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sel });
const nodeId = nodeIds.at(-1);
const r = await send('CSS.getMatchedStylesForNode', { nodeId });
const re = new RegExp(propRe);
for (const m of r.result.matchedCSSRules.reverse()) {
  const props = m.rule.style.cssProperties.filter(p => re.test(p.name) && p.value && !p.disabled && p.implicit !== true);
  if (!props.length) continue;
  const cond = [...(m.rule.containerQueries || []).map(c => '@container ' + c.text), ...(m.rule.media || []).map(c => '@media ' + c.text)].join(' ');
  console.log(`[${m.rule.origin}] ${cond} ${m.rule.selectorList.text.slice(0, 160)}\n   ` + props.map(p => `${p.name}: ${p.value}`).join('; '));
}
ws.close(); process.exit(0);
