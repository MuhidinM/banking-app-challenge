"use client";

import { useSyncExternalStore } from "react";

import { getAppSession } from "./session";

import type { SessionState } from "./session-store";

// The server has no session: render as "unknown" (loading), then React switches
// to the browser's real state right after hydration, without a mismatch.
const SERVER_STATE: SessionState = { status: "unknown", endedBecause: null };

const subscribe = (listener: () => void) => getAppSession().store.subscribe(listener);
const getSnapshot = () => getAppSession().store.getSnapshot();
const getServerSnapshot = () => SERVER_STATE;

/** The session's status and why it last ended, kept up to date. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
