"use client";

import { Timer, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getAppSession } from "@/features/auth/session";
import type { RefreshLogState } from "@/features/auth/session";
import { useSession } from "@/features/auth/use-session";
import { describeError } from "@/shared/api/error-messages";
import type { User } from "@/shared/api/types";
import { Button } from "@/shared/ui/button";

import { formatRemaining, tokenExpiry } from "./token-expiry";

const NO_REFRESHES: RefreshLogState = { count: 0, last: null };
const subscribeLog = (listener: () => void) => getAppSession().refreshLog.subscribe(listener);
const getLog = () => getAppSession().refreshLog.getSnapshot();
const getServerLog = () => NO_REFRESHES;

/** Re-renders every second, for the countdowns. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function remaining(token: string | null, now: Date) {
  if (!token) return "none";
  const expiresAt = tokenExpiry(token);
  return expiresAt ? formatRemaining(expiresAt, now) : "unknown (not a JWT)";
}

/**
 * Demo panel (NEXT_PUBLIC_DEV_TOOLS=on, #25): shows when this tab's tokens
 * expire and how often it has refreshed, and can expire the access token now,
 * so the 401 → refresh → retry flow shows in seconds instead of 10 minutes.
 */
export function SessionInspector() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const session = useSession();
  const log = useSyncExternalStore(subscribeLog, getLog, getServerLog);
  const now = useNow();

  const signedIn = session.status === "authenticated";
  const { store, client } = open ? getAppSession() : { store: null, client: null };

  async function callApi(times: number) {
    if (!client) return;
    setBusy(true);
    const before = getLog().count;
    const calls = await Promise.allSettled(
      Array.from({ length: times }, () => client.request<User>("/api/users/me")),
    );
    const refreshes = getLog().count - before;
    const failed = calls.find((call) => call.status === "rejected");
    const answer = failed
      ? describeError(failed.reason, "load").message
      : `Signed in as ${(calls[0] as PromiseFulfilledResult<User>).value.username}.`;
    setResult(
      `${times === 1 ? "1 call" : `${times} calls`}, ${refreshes === 1 ? "1 refresh" : `${refreshes} refreshes`}. ${answer}`,
    );
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-pill bg-ink px-4 py-2 type-label text-surface shadow-float"
      >
        <Timer aria-hidden="true" className="size-4" strokeWidth={2} />
        Session
      </button>
    );
  }

  const rows: [string, string][] = [
    [
      "Status",
      session.endedBecause ? `${session.status} (${session.endedBecause})` : session.status,
    ],
    ["Access token expires in", remaining(store?.getAccessToken() ?? null, now)],
    ["Refresh token expires in", remaining(store?.getRefreshToken() ?? null, now)],
    ["Refreshes in this tab", String(log.count)],
    [
      "Last refresh",
      log.last ? `${log.last.at.toLocaleTimeString()} · ${log.last.outcome}` : "none yet",
    ],
  ];

  return (
    <section
      aria-label="Session inspector"
      className="fixed bottom-4 left-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-float"
    >
      <header className="flex items-center justify-between">
        <h2 className="type-heading text-ink">Session inspector</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close session inspector"
          className="flex size-hit items-center justify-center rounded-pill text-ink-muted hover:bg-surface-muted"
        >
          <X aria-hidden="true" className="size-icon" strokeWidth={1.75} />
        </button>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 type-label">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="font-normal text-ink-muted">{term}</dt>
            <dd className="text-right text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="compact"
          variant="soft"
          disabled={!signedIn}
          onClick={() => {
            store?.simulateExpiredAccessToken();
            setResult("Access token expired. The next call refreshes once.");
          }}
          className="col-span-2"
        >
          Expire access token now
        </Button>
        <Button
          size="compact"
          variant="outline"
          disabled={!signedIn || busy}
          onClick={() => void callApi(1)}
        >
          Call the API
        </Button>
        <Button
          size="compact"
          variant="outline"
          disabled={!signedIn || busy}
          onClick={() => void callApi(3)}
        >
          3 calls at once
        </Button>
        <Button
          size="compact"
          variant="ghost"
          disabled={!signedIn}
          onClick={() => {
            store?.simulateExpiredRefreshToken();
            store?.simulateExpiredAccessToken();
            setResult("Both tokens expired. The next call ends the session.");
          }}
          className="col-span-2"
        >
          Expire refresh token too
        </Button>
      </div>

      <p aria-live="polite" className="type-caption text-ink-muted empty:hidden">
        {result}
      </p>
    </section>
  );
}
