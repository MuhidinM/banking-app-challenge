/**
 * The user's theme choice, stored per device.
 *
 * - "system" (default): no `data-theme` attribute, so tokens.css follows the OS
 *   through `prefers-color-scheme`, including live OS changes, with no JavaScript.
 * - "light" / "dark": `data-theme` on <html> forces that theme.
 *
 * `themeInitScript` applies a stored choice before the first paint (see the root
 * layout), so a reload never flashes the wrong theme.
 */

export const themePreferences = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "kb-theme";
const CHANGE_EVENT = "kb-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (themePreferences as readonly string[]).includes(value);
}

/** The stored choice, or "system" if nothing valid is stored or storage is unavailable. */
export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

/** Stores the choice, applies it immediately, and notifies `useTheme` in this tab. */
export function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode or storage disabled: the choice still applies until reload.
  }
  applyThemePreference(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Calls `onChange` when the choice changes in this tab, or in another tab
 * (the `storage` event), applying the other tab's choice here too.
 */
export function subscribeToThemePreference(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    applyThemePreference(readThemePreference());
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Runs in <head> before the page paints. A fixed string with no user data in it,
 * so it is safe to inline; its hash can be allowed in the CSP (#49).
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
