// Shared Chrome DevTools Protocol connection for the tools in this folder.
// connect() attaches to the running Discord page (CDP_PORT, default 9222) and returns { send, evaluate, close }.
export async function connect({ port = process.env.CDP_PORT || 9222 } = {}) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find(t => t.type === 'page' && /discord\.com/.test(t.url)) || list.find(t => t.type === 'page');
  if (!page) throw new Error('no page target: start Discord with --remote-debugging-port=' + port);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
    return r.result?.result?.value;
  };
  return { send, evaluate, close: () => ws.close() };
}
