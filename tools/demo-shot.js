// node tools/cdp.mjs evalfile tools/demo-shot.js   (run inside a demo server before taking README screenshots)
// Page-only, nothing is sent: hides webhook APP tags, the voice panel and the member list, and swaps *your* name,
// status and avatar plus every *other* server's icon for neutral placeholders. Reload Discord to undo.
(() => {
  const me = Vencord.Webpack.Common.UserStore.getCurrentUser();
  const here = location.pathname.split('/')[2];
  // placeholders drawn locally (Discord's CSP blocks most external image hosts; data: URIs are allowed)
  const PAL = [['#98e6fa', '#dca3f9'], ['#f6b48f', '#f2879f'], ['#b8e6a0', '#8ad8ec'], ['#ffd59e', '#f6b48f'], ['#a9afff', '#dca3f9'], ['#8ad8ec', '#b8e6a0']];
  const img = (i, letter) => { const [a, b] = PAL[i % PAL.length];
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='64' height='64' fill='url(#g)'/><text x='32' y='42' font-family='Google Sans Flex,sans-serif' font-size='26' font-weight='800' fill='#14161b' text-anchor='middle'>${letter}</text></svg>`); };
  const av = () => img(2, 'n');
  const icon = (seed, i) => img(i, 'ABCDEFGHJKLMNPRSTUVW'[i % 20]);
  const st = document.getElementById('m3e-demo') || document.createElement('style');
  st.id = 'm3e-demo';
  st.textContent = `[class*="botTag"], [class*="rtcConnectionStatus"], .wrapper_9U6LUN, .container_86es0b, [class*="profilePanel"],
    [class*="avatarDecoration"], [class*="nameplate"], [class*="chipletContainer"] { display: none !important; }`;
  document.documentElement.appendChild(st);
  // you: panel name/status/avatar (+ anywhere your avatar URL shows)
  document.querySelectorAll('[class*="panelTitleContainer"] [class*="title_"]').forEach(e => e.textContent = 'nova');
  document.querySelectorAll('[class*="panelSubtextContainer"]').forEach(e => e.textContent = 'building a theme');
  // only the user panel: message avatars must keep their URL (the theme recognises your messages by it, and hides them)
  document.querySelectorAll(`[class*="panels_"] img[src*="/${me.id}/"]`).forEach(i => { i.removeAttribute('srcset'); i.src = av(); });
  // message avatars: paint over them with CSS `content` (keeps the src, so your messages are still recognised)
  st.textContent += `\nimg[src*="/${me.id}/"] { content: url("${av()}"); }`;
  // other servers in the rail (and folder previews)
  let i = 0;
  document.querySelectorAll('.listItem_rwEpIL [data-list-item-id^="guildsnav___"]').forEach(item => {
    const id = item.getAttribute('data-list-item-id').replace('guildsnav___', '');
    if (id === here) return;
    item.querySelectorAll('img').forEach(img => { img.removeAttribute('srcset'); img.src = icon('srv', i++); });
    item.querySelectorAll('[class*="acronym_"]').forEach(a => a.textContent = 'ABCDEFGH'[i++ % 8]);
  });
  document.querySelectorAll('.folderIconWrapper_RTMSuZ img, [class*="folderIcon"] img').forEach(img => { img.removeAttribute('srcset'); img.src = icon('fld', i++); });
  // folder previews draw their mini icons as CSS backgrounds
  document.querySelectorAll('[class*="folderPreviewGuildIcon"]').forEach(e => { e.style.backgroundImage = `url("${icon('fld', i++)}")`; e.textContent = ''; });
  return 'demo view ready';
})()
