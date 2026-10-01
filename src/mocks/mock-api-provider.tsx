"use client";

import { type ReactNode, useEffect, useState } from "react";

import { env } from "@/shared/config/env";

let workerStarted: Promise<unknown> | undefined;

/** Starts the MSW worker once, even if React runs the effect twice in development. */
function startWorker(): Promise<unknown> {
  workerStarted ??= import("./browser").then(({ worker }) =>
    // Requests the mock doesn't handle (fonts, Next.js assets) go to the network as usual.
    worker.start({ onUnhandledRequest: "bypass" }),
  );
  return workerStarted;
}

type Status = "starting" | "ready" | { failed: string };

/**
 * When NEXT_PUBLIC_API_MOCKING=on, holds rendering until the mock API is
 * intercepting requests, so the first API call can't reach the real network.
 * If the worker can't start, it says so and renders nothing else: falling back
 * to the real API silently would send mock-mode traffic to the shared service.
 * When mocking is off it renders children immediately and MSW is never downloaded.
 */
export function MockApiProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(env.apiMocking ? "starting" : "ready");

  useEffect(() => {
    if (!env.apiMocking) return;
    let active = true;
    startWorker().then(
      () => active && setStatus("ready"),
      (error: unknown) => {
        console.error("[mock api] failed to start", error);
        if (active) setStatus({ failed: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (status === "ready") return children;
  if (status === "starting") return null;

  return (
    <main role="alert" style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>The mock API could not start</h1>
      <p>
        <code>NEXT_PUBLIC_API_MOCKING</code> is on, but this browser would not register the mock
        service worker. No requests were sent to the real API.
      </p>
      <p>
        Use a browser with service workers enabled, or set <code>NEXT_PUBLIC_API_MOCKING=off</code>{" "}
        in <code>.env.local</code> to use the real API.
      </p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{status.failed}</pre>
    </main>
  );
}
