import { useEffect, useState } from "react";

const STORAGE_KEY = "civic-sidebar-collapsed";

/**
 * Collapsed / expanded state of the portal sidebar.
 *
 * The state is mirrored on <body> (`sidebar-collapsed`) so every page can
 * shift its content with `margin-left: var(--sidebar-w)`, and it is remembered
 * between pages. `sidebar-is-collapsed` is kept as an alias for older styles.
 */
export default function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    document.body.classList.toggle("sidebar-is-collapsed", collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }, [collapsed]);

  return [collapsed, () => setCollapsed((value) => !value)];
}
