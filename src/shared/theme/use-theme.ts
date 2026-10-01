"use client";

import { useSyncExternalStore } from "react";

import {
  type ResolvedTheme,
  type ThemePreference,
  readThemePreference,
  saveThemePreference,
  subscribeToSystemTheme,
  subscribeToThemePreference,
  systemPrefersDark,
} from "./theme-preference";

export interface UseTheme {
  /** What the user chose: "system", "light" or "dark". */
  preference: ThemePreference;
  /** What is showing now; for "system" this follows the OS. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

// On the server there is no storage or OS setting: render as "system" / light,
// then React switches to the real values right after hydration without a mismatch.
const serverPreference = (): ThemePreference => "system";
const serverPrefersDark = () => false;

export function useTheme(): UseTheme {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    serverPreference,
  );
  const prefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    systemPrefersDark,
    serverPrefersDark,
  );

  const resolvedTheme: ResolvedTheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  return { preference, resolvedTheme, setPreference: saveThemePreference };
}
