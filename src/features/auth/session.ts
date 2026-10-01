/**
 * The app's one session: the session store, the token refresher, the HTTP
 * client every feature uses, and the auth API, wired together once.
 *
 * Created on first use in the browser (`getAppSession()`), never at import time:
 * client components also render on the server, where there is no storage.
 */

import { isApiError, isNetworkError } from "@/shared/api/api-error";
import { type HttpClient, createHttpClient } from "@/shared/api/http-client";
import { getQueryClient } from "@/shared/api/query-client";
import { type TokenPair, createTokenRefresher } from "@/shared/api/token-refresh";
import type { LoginRequest, LoginResponse } from "@/shared/api/types";
import { env } from "@/shared/config/env";
import { clearToasts } from "@/shared/ui/toast";

import { createAuthApi } from "./api";
import { type RunExclusive, createRefreshLock } from "./refresh-lock";
import { type SessionChannel, createSessionChannel } from "./session-channel";
import { type SessionState, type SessionStore, createSessionStore } from "./session-store";

export interface AppSession {
  store: SessionStore;
  /** The authenticated HTTP client for every feature's API calls. */
  client: HttpClient;
  authApi: ReturnType<typeof createAuthApi>;
  /** Logs in and starts the session. Throws ApiError (e.g. AUTH_001) or NetworkError. */
  signIn(credentials: LoginRequest): Promise<LoginResponse>;
  /**
   * After a page load: if a refresh token is stored, exchange it for a new
   * access token (one refresh, shared with any request racing it). Safe to call
   * more than once.
   */
  restore(): Promise<void>;
  /**
   * Logs out: forgets the tokens and the cookie, and tells the other tabs to
   * do the same. The API has no logout endpoint; the refresh token simply
   * expires. Through `onSessionEnded`, the cached data and toasts go too.
   */
  signOut(): void;
  /** Every refresh call this tab made, for the session inspector (#25). */
  refreshLog: RefreshLog;
}

export interface RefreshLogState {
  /** Calls to POST /api/auth/refresh-token from this tab. */
  count: number;
  last: { at: Date; outcome: "refreshed" | "rejected" | "failed" } | null;
}

export interface RefreshLog {
  getSnapshot(): RefreshLogState;
  subscribe(listener: () => void): () => void;
}

function createRefreshLog() {
  let state: RefreshLogState = { count: 0, last: null };
  const listeners = new Set<() => void>();
  return {
    record(outcome: NonNullable<RefreshLogState["last"]>["outcome"]) {
      state = { count: state.count + 1, last: { at: new Date(), outcome } };
      listeners.forEach((listener) => listener());
    },
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export interface AppSessionOptions {
  baseUrl?: string;
  /** The other open tabs; null (the default) for a session on its own, as in tests. */
  channel?: SessionChannel | null;
  /**
   * Runs once each time a session ends: logout here or in another tab, or the
   * API rejecting the refresh token. The app clears the query cache and
   * toasts, so nothing from this session shows in the next one.
   */
  onSessionEnded?: (reason: NonNullable<SessionState["endedBecause"]>) => void;
  /** Makes the token refresh exclusive across tabs (Web Locks); per tab when omitted. */
  runExclusive?: RunExclusive;
}

export function createAppSession(
  store: SessionStore,
  {
    baseUrl = env.apiBaseUrl,
    channel = null,
    onSessionEnded = () => {},
    runExclusive,
  }: AppSessionOptions = {},
): AppSession {
  // New tokens (sign-in or refresh) are shared with the other tabs, so they
  // don't refresh again with a refresh token that has just been rotated.
  const setTokens = (pair: TokenPair) => {
    store.setTokens(pair);
    channel?.post({ type: "tokens", accessToken: pair.accessToken });
  };

  // The refresher calls the auth API, which uses this same client. That's safe:
  // the refresh request is sent without auth, so it can't trigger a refresh.
  // The two depend on each other, so the refresher reads the auth API through a holder.
  const late: { authApi?: ReturnType<typeof createAuthApi> } = {};
  const refreshLog = createRefreshLog();
  const refresher = createTokenRefresher({
    tokens: { ...store, setTokens },
    runExclusive,
    requestRefresh: async (refreshToken) => {
      if (!late.authApi) throw new Error("Auth API used before the session was created.");
      try {
        const pair = await late.authApi.refreshTokens(refreshToken);
        refreshLog.record("refreshed");
        return pair;
      } catch (error) {
        refreshLog.record(isApiError(error) && error.status < 500 ? "rejected" : "failed");
        throw error;
      }
    },
    // store.clear() (called by the refresher) already ended the session as
    // "expired". RequireSession sees that in the store and sends the user to
    // /login?reason=expired, so nothing else is needed here.
    onSessionExpired: () => {},
  });
  const client = createHttpClient({ baseUrl, getAccessToken: store.getAccessToken, refresher });
  const api = createAuthApi(client);
  late.authApi = api;

  let restoring: Promise<void> | null = null;

  // Set while applying another tab's message, so it isn't sent back out.
  let fromOtherTab = false;

  let previous = store.getSnapshot();
  store.subscribe(() => {
    const current = store.getSnapshot();
    if (current.status === "anonymous" && previous.status !== "anonymous") {
      const reason = current.endedBecause ?? "signed-out";
      onSessionEnded(reason);
      // The API rejected the refresh token here; the other tabs share it, so
      // their sessions are over too.
      if (reason === "expired" && !fromOtherTab) channel?.post({ type: "expired" });
    }
    previous = current;
  });

  channel?.subscribe((message) => {
    fromOtherTab = true;
    try {
      if (message.type === "tokens") {
        store.adoptAccessToken(message.accessToken);
      } else if (store.getSnapshot().status !== "anonymous") {
        if (message.type === "signed-out") store.signOut();
        else store.expire();
      }
    } finally {
      fromOtherTab = false;
    }
  });

  return {
    store,
    client,
    authApi: api,
    refreshLog: { getSnapshot: refreshLog.getSnapshot, subscribe: refreshLog.subscribe },

    async signIn(credentials) {
      const response = await api.login(credentials);
      setTokens(response);
      return response;
    },

    restore() {
      if (store.getSnapshot().status !== "unknown") return Promise.resolve();
      restoring ??= refresher
        .refresh(null)
        .then(
          () => undefined,
          (error: unknown) => {
            // Offline at load: the stored refresh token wasn't rejected, so keep
            // the user signed in; screens show the network error and retry.
            if (isNetworkError(error)) {
              store.trustStoredSession();
              return;
            }
            // Anything else (e.g. a malformed refresh response): end the session so
            // the user can sign in again, rather than staying "unknown" forever.
            store.expire();
            throw error;
          },
        )
        .finally(() => {
          restoring = null;
        });
      return restoring;
    },

    signOut() {
      store.signOut();
      channel?.post({ type: "signed-out" });
    },
  };
}

let appSession: AppSession | undefined;

/** The app's session, created on first use. Browser only. */
export function getAppSession(): AppSession {
  appSession ??= createAppSession(createSessionStore(), {
    channel: createSessionChannel(),
    runExclusive: createRefreshLock(),
    onSessionEnded: () => {
      getQueryClient().clear();
      clearToasts();
    },
  });
  return appSession;
}
