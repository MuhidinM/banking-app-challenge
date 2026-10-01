"use client";

import dynamic from "next/dynamic";

import { env } from "@/shared/config/env";

// Loaded only when the flag is on, so the inspector isn't in a normal build's
// first download. Browser only: it reads the session's tokens.
const SessionInspector = dynamic(
  () => import("./session-inspector").then((module) => module.SessionInspector),
  { ssr: false },
);

/** Demo tools, shown only with NEXT_PUBLIC_DEV_TOOLS=on (.env.example). */
export function DevTools() {
  return env.devTools ? <SessionInspector /> : null;
}
