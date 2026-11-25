// node tools/matched.mjs "<css selector>" [prop-regex]  -> rules that set matching props on the LAST element matching selector
import { connect } from './cdp-lib.mjs';
const [sel, propRe = 'background|radius'] = process.argv.slice(2);
const { send, close } = await connect();
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
close(); process.exit(0);
