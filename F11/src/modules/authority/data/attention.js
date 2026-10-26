/* What needs the officer's attention RIGHT NOW (from GET /api/authority/attention):
     emergency  an open emergency with no worker yet
     overdue    a complaint that waited past its limit with no worker
     work       assigned work that is past its due time (or an emergency nobody started)

   One small store shared by the alert bar, the pop-up and the sidebar badge. It polls on its own (also while the tab is in the
   background) so the alert can reach the officer between page loads, and it is refreshed at once on every page change, on sign-in /
   sign-out (in this tab or another) and when the tab becomes visible again. See attentionStore.js for the rules. */

import { useSyncExternalStore } from "react";
import { api, getToken } from "../../../shared/api.js";
import { createAttentionStore, ownerFromToken } from "./attentionStore.js";

const store = createAttentionStore({
  fetchAttention: async () => {
    const res = await api("authority").get("/api/authority/attention");
    return res.ok ? res.data : null;
  },
  getOwner: () => ownerFromToken(getToken("authority")),
});

export const refreshAttention = store.refresh;
export const resetAttention = store.reset;
export const useAttention = () => useSyncExternalStore(store.subscribe, store.getSnapshot);

if (typeof window !== "undefined") {
  window.addEventListener("civicconnect:auth", store.refresh);   // sign-in / sign-out in this tab (see setToken)
  window.addEventListener("storage", (e) => { if (e.key?.startsWith("civicconnect.token.")) store.refresh(); }); // ...or in another tab
  document.addEventListener("visibilitychange", () => { if (!document.hidden) store.refresh(); });
}
