/**
 * Where the session lives (ADR-0003):
 * - access token (10 min): memory only, never written to storage
 * - refresh token (24 h): localStorage, so a reload (or a new tab) can restore
 *   the session, falling back to memory when storage is blocked
 * - `has_session=1` cookie: no token in it, only a hint for the route proxy
 *   (#21) so it can redirect before rendering; the client and the API decide
 *
 * An external store (subscribe/getSnapshot) so React reads it with
 * useSyncExternalStore and non-React code (the HTTP client) can use it too.
 */
import type { TokenPair, TokenStore } from "@/shared/api/token-refresh";

export const REFRESH_TOKEN_KEY = "kb-refresh-token";
export const SESSION_COOKIE = "has_session";
/** Same as the refresh token's lifetime (24 h). */
const SESSION_COOKIE_MAX_AGE_S = 24 * 60 * 60;

export type SessionStatus =
  /** A refresh token is stored but hasn't been checked yet (just after load). */
  "unknown" | "authenticated" | "anonymous";

export interface SessionState {
  status: SessionStatus;
  /** Why the last session ended; the login page shows "Your session expired" for "expired". */
  endedBecause: "expired" | "signed-out" | null;
}

/** The parts of the browser the store touches, injectable for tests. */
export interface SessionEnvironment {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  setSessionCookie: (present: boolean) => void;
}

export interface SessionStore extends TokenStore {
  getSnapshot(): SessionState;
  subscribe(listener: () => void): () => void;
  /** Ends the session because the API rejected it (refresh failed). */
  expire(): void;
  /** Ends the session because the user logged out. */
  signOut(): void;
  /**
   * The stored refresh token couldn't be checked (offline at load): treat the
   * user as signed in. Requests then fail with a network error, and the next one
   * that reaches the API refreshes the session or ends it.
   */
  trustStoredSession(): void;
  /**
   * Another tab refreshed (or signed in) and shared its new access token. The
   * refresh token it stored is already in localStorage, so only the access
   * token changes. Ignored when no refresh token is stored.
   */
  adoptAccessToken(accessToken: string): void;
  /**
   * Session inspector only (#25): swap the access token for one the API
   * rejects, as if it had just expired. The next request gets a 401 and
   * refreshes, which shows the refresh flow without waiting 10 minutes.
   */
  simulateExpiredAccessToken(): void;
  /** Session inspector only: the same for the stored refresh token, so the next refresh is rejected. */
  simulateExpiredRefreshToken(): void;
}

/** What the inspector puts in place of a token. The API answers 401 to it. */
export const SIMULATED_EXPIRED_TOKEN = "expired-by-session-inspector";

function browserEnvironment(): SessionEnvironment {
  let storage: SessionEnvironment["storage"] = null;
  try {
    storage = window.localStorage;
    // Some browsers expose localStorage but throw on write (e.g. Safari private mode).
    storage.setItem("kb-storage-check", "1");
    storage.removeItem("kb-storage-check");
  } catch {
    storage = null;
  }

  return {
    storage,
    setSessionCookie(present) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = present
        ? `${SESSION_COOKIE}=1; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE_S}; SameSite=Lax${secure}`
        : `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    },
  };
}

export function createSessionStore(
  environment: SessionEnvironment = browserEnvironment(),
): SessionStore {
  const { storage, setSessionCookie } = environment;

  const read = () => {
    try {
      return storage?.getItem(REFRESH_TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  };

  let accessToken: string | null = null;
  // Used when storage is unavailable, so the session still works until reload.
  let memoryRefreshToken: string | null = null;
  let state: SessionState = {
    status: read() ? "unknown" : "anonymous",
    endedBecause: null,
  };
  // No session to restore, but the hint cookie may outlive it (token removed by
  // hand, storage cleared). Drop it, or the proxy would keep sending /login to
  // the dashboard and the guard back to /login.
  if (state.status === "anonymous") setSessionCookie(false);
  const listeners = new Set<() => void>();

  const setState = (next: SessionState) => {
    if (next.status === state.status && next.endedBecause === state.endedBecause) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const end = (reason: "expired" | "signed-out") => {
    accessToken = null;
    memoryRefreshToken = null;
    try {
      storage?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Nothing stored that we could remove.
    }
    setSessionCookie(false);
    setState({ status: "anonymous", endedBecause: reason });
  };

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => read() ?? memoryRefreshToken,

    setTokens({ accessToken: nextAccess, refreshToken: nextRefresh }: TokenPair) {
      accessToken = nextAccess;
      try {
        if (storage) storage.setItem(REFRESH_TOKEN_KEY, nextRefresh);
        else memoryRefreshToken = nextRefresh;
      } catch {
        memoryRefreshToken = nextRefresh;
      }
      setSessionCookie(true);
      setState({ status: "authenticated", endedBecause: null });
    },

    // TokenStore.clear is what the refresher calls when the refresh token is rejected.
    clear: () => end("expired"),
    expire: () => end("expired"),
    signOut: () => end("signed-out"),
    trustStoredSession() {
      if (state.status === "unknown") setState({ status: "authenticated", endedBecause: null });
    },
    simulateExpiredAccessToken() {
      if (accessToken) accessToken = SIMULATED_EXPIRED_TOKEN;
    },
    simulateExpiredRefreshToken() {
      if (read()) {
        try {
          storage?.setItem(REFRESH_TOKEN_KEY, SIMULATED_EXPIRED_TOKEN);
        } catch {
          // Storage refused the write; the stored token stays as it was.
        }
      } else if (memoryRefreshToken) {
        memoryRefreshToken = SIMULATED_EXPIRED_TOKEN;
      }
    },
    adoptAccessToken(next) {
      if (!read()) return;
      accessToken = next;
      setState({ status: "authenticated", endedBecause: null });
    },

    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
