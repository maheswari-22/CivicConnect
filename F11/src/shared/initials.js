/** "Asha Rao" -> "AR", "Madonna" -> "M"; falls back when the name is empty. */
export function initialsOf(name = "", fallback = "U") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "Asha Rao" -> "Asha"; empty when there is no name. */
export const firstName = (name = "") => String(name).trim().split(/\s+/)[0] || "";
