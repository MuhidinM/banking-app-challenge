import { afterEach, describe, expect, it, vi } from "vitest";

import {
  THEME_STORAGE_KEY,
  readThemePreference,
  saveThemePreference,
  subscribeToThemePreference,
  themeInitScript,
} from "./theme-preference";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
});

/** Runs the inline <head> script the way the browser would. */
function runInitScript() {
  new Function(themeInitScript)();
}

describe("theme init script (runs before first paint)", () => {
  it("applies a stored light or dark choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(root.dataset.theme).toBe("dark");
  });

  it("leaves the attribute off for system, so CSS follows the OS", () => {
    runInitScript();
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("ignores anything that isn't light or dark", () => {
    localStorage.setItem(THEME_STORAGE_KEY, '"><script>alert(1)</script>');
    runInitScript();
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("doesn't throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(runInitScript).not.toThrow();
  });
});

describe("theme preference", () => {
  it('defaults to "system", including for unknown stored values', () => {
    expect(readThemePreference()).toBe("system");
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readThemePreference()).toBe("system");
  });

  it("stores and applies a forced theme", () => {
    saveThemePreference("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(root.dataset.theme).toBe("light");
  });

  it("forgets the choice and removes the attribute for system", () => {
    saveThemePreference("dark");
    saveThemePreference("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("still applies the choice when storage refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    saveThemePreference("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("notifies subscribers in this tab", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToThemePreference(onChange);
    saveThemePreference("dark");
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    saveThemePreference("light");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("follows a choice made in another tab", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToThemePreference(onChange);

    // Another tab writes storage; this tab only receives the storage event.
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));

    expect(root.dataset.theme).toBe("dark");
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("ignores storage events for other keys", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToThemePreference(onChange);
    window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });
});
