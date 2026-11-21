// "Is this message mine?" — Discord marks no author on follow-up messages, so: a row is yours if it is a group start
// carrying your avatar (its URL contains your user ID), or a follow-up/divider right after a row that is yours.
// CSS can't recurse, so the rule is unrolled as nested :is() — linear in size, ~depth follow-ups deep.
// The same function is inlined in docs/index.html (the snippet generator); keep them in sync.
export function mineSelector(userId, depth = 24) {
  if (!/^\d{15,22}$/.test(String(userId))) throw new Error('user ID must be 15–22 digits');
  const own = `li.messageListItem_SY_P2T:has(> .groupStart_SY_P2T > .contents_2i8Bfm > .avatar_2i8Bfm[src*="/${userId}/"])`;
  const step = ':is(li.messageListItem_SY_P2T:not(:has(> .groupStart_SY_P2T)), div.divider_SY_P2T)';
  let sel = own;
  for (let k = 0; k < depth; k++) sel = `:is(${own}, ${sel} + ${step})`;
  return sel;
}
