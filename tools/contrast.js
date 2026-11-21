// evalfile tools/contrast.js -> text elements whose colour vs the background actually behind them is < 4.5:1
(()=>{const st=document.createElement('style');st.textContent='*{transition:none!important;animation:none!important}';document.documentElement.appendChild(st);
const parse=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;if(c.startsWith('oklab')||c.startsWith('oklch')||c.startsWith('color('))return null;return m.slice(0,4).map(Number)};
const probe=document.createElement('canvas').getContext('2d');
const rgba=c=>{probe.fillStyle='#000';probe.fillStyle=c;probe.clearRect(0,0,1,1);probe.fillRect(0,0,1,1);const d=probe.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255]};
probe.canvas.width=probe.canvas.height=1;
const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const over=(top,bot)=>{const a=top[3];return [0,1,2].map(i=>top[i]*a+bot[i]*(1-a)).concat(1)};
const bgOf=e=>{const stack=[];for(let x=e;x;x=x.parentElement){const c=rgba(getComputedStyle(x).backgroundColor);if(c[3]>0)stack.push(c);if(c[3]>=1)break}let col=[255,255,255,1];if(!stack.length||stack.at(-1)[3]<1)col=rgba(getComputedStyle(document.body).backgroundColor);for(let i=stack.length-1;i>=0;i--)col=over(stack[i],col);return col};
const out=new Map();
for(const e of document.querySelectorAll('body *')){if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
 const r=e.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
 const fg=rgba(cs.color),bg=bgOf(e);const f=over(fg,bg);const L1=lum(f),L2=lum(bg);const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
 if(cr<4.5){const k=(e.className.toString().split(' ')[0]||e.tagName).slice(0,40);if(!out.has(k))out.set(k,{ratio:+cr.toFixed(2),fg:cs.color.slice(0,28),text:e.textContent.trim().slice(0,18).replace(/\d{4,}/g,'#')});}}
st.remove();return [...out.entries()].sort((a,b)=>a[1].ratio-b[1].ratio).slice(0,25).map(([k,v])=>`${v.ratio}  ${k}  "${v.text}"`).join('\n')||'all text ≥ 4.5:1'})()
