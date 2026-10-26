/* The state behind the authority's alert bar, pop-up and sidebar badge. No browser or network code in here, so it can be tested:
   the caller passes in how to fetch the list and who is signed in.

   The snapshot is tied to the signed-in officer ("owner"). When the officer changes or signs out it is wiped at once, so the next
   officer never sees the previous officer's complaints, and a refresh that was still in flight for the old officer is thrown away. */

export const EMPTY_ATTENTION = Object.freeze({ count: 0, emergencies: 0, items: [], loaded: false, owner: null });

/** The account id inside a login token (the "sub" claim), without verifying it: the server does that. Null when there is no token. */
export function ownerFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || token.slice(-12);
  } catch {
    return token.slice(-12);
  }
}

const signature = (data) => JSON.stringify((data.items || []).map((i) => [i.id, i.kind, i.level, i.severity]));

export function createAttentionStore({ fetchAttention, getOwner, pollMs = 30000, setTimer = setInterval, clearTimer = clearInterval }) {
  let state = EMPTY_ATTENTION;
  const listeners = new Set();
  let timer = null;
  const emit = () => listeners.forEach((fn) => fn());
  const set = (next) => { state = next; emit(); };

  async function refresh() {
    const owner = getOwner();
    if (!owner) {                                   // signed out
      if (state !== EMPTY_ATTENTION) set(EMPTY_ATTENTION);
      return;
    }
    if (state.owner && state.owner !== owner) set(EMPTY_ATTENTION);   // a different officer signed in
    let data = null;
    try { data = await fetchAttention(); } catch { return; }
    if (!data || getOwner() !== owner) return;      // failed, or the officer changed while we waited
    if (!state.loaded || state.owner !== owner || signature(data) !== signature(state)) set({ ...data, loaded: true, owner });
  }

  const reset = () => { if (state !== EMPTY_ATTENTION) set(EMPTY_ATTENTION); };

  function subscribe(fn) {
    listeners.add(fn);
    if (listeners.size === 1) { refresh(); timer = setTimer(refresh, pollMs); }
    return () => {
      listeners.delete(fn);
      if (!listeners.size) { clearTimer(timer); timer = null; }
    };
  }

  return { refresh, reset, subscribe, getSnapshot: () => state };
}
