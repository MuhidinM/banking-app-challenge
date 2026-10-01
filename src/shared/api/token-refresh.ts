/**
 * Refreshes the access token when the API says it has expired (ADR-0005).
 *
 * The brief: on a 401, call POST /api/auth/refresh-token, replace **both**
 * tokens (they rotate), retry the original request once; concurrent requests
 * that fail together must trigger only **one** refresh; if the refresh fails,
 * clear the session and send the user to login.
 *
 * Because refresh tokens rotate, a second refresh with the same refresh token
 * would be rejected and log the user out, so single-flight isn't only an
 * optimisation, it is required for correctness.
 */
import { isApiError } from "./api-error";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Where the session's tokens live (implemented by the session store, #18). */
export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: TokenPair): void;
  clear(): void;
}

export interface TokenRefresher {
  /**
   * A fresh access token for a request that got a 401 while using `staleToken`.
   * Resolves null when the session is over (it has been cleared); rejects when
   * the refresh itself couldn't reach the API (the session is kept).
   */
  refresh(staleToken: string | null): Promise<string | null>;
}

interface TokenRefresherConfig {
  tokens: TokenStore;
  /** Calls POST /api/auth/refresh-token (the auth API, #17). */
  requestRefresh: (refreshToken: string) => Promise<TokenPair>;
  /** The session ended (refresh token missing, expired or rejected). Called once per expiry. */
  onSessionExpired: () => void;
  /**
   * Runs the refresh exclusively across browser tabs (#24). Defaults to running
   * it directly, which gives single-flight within this tab only.
   */
  runExclusive?: <T>(task: () => Promise<T>) => Promise<T>;
}

/** The refresh token was rejected: the API answered 4xx (AUTH_005, VAL_001…). */
function isRejectedRefresh(error: unknown): boolean {
  return isApiError(error) && error.status >= 400 && error.status < 500;
}

export function createTokenRefresher({
  tokens,
  requestRefresh,
  onSessionExpired,
  runExclusive = (task) => task(),
}: TokenRefresherConfig): TokenRefresher {
  let inFlight: Promise<string | null> | null = null;

  /**
   * `seenAccess` is this tab's access token when the refresh was asked for.
   * Inside the cross-tab lock, another tab may already have refreshed and
   * shared its new access token (features/auth/session-channel.ts): then it
   * is used as is, without a second call that would rotate the tokens again.
   */
  async function performRefresh(
    seenAccess: string | null,
    retried = false,
  ): Promise<string | null> {
    const shared = tokens.getAccessToken();
    if (shared && shared !== seenAccess) return shared;

    const refreshToken = tokens.getRefreshToken();
    if (!refreshToken) {
      tokens.clear();
      onSessionExpired();
      return null;
    }

    try {
      const pair = await requestRefresh(refreshToken);
      // Both tokens rotate: the old refresh token no longer works.
      tokens.setTokens(pair);
      return pair.accessToken;
    } catch (error) {
      if (isRejectedRefresh(error)) {
        // Rejected because another tab rotated the tokens during this call
        // (possible only without the cross-tab lock): the session is fine.
        // Use that tab's tokens, or try once more with the new refresh token.
        const latest = tokens.getRefreshToken();
        if (!retried && latest !== null && latest !== refreshToken) {
          return performRefresh(seenAccess, true);
        }
        tokens.clear();
        onSessionExpired();
        return null;
      }
      // Offline, timeout or a server error: the session may still be valid, so
      // keep it and let the original request fail with this error.
      throw error;
    }
  }

  return {
    refresh(staleToken) {
      // Someone else already refreshed while this request was in flight: use
      // their token instead of spending the (rotated) refresh token again.
      const current = tokens.getAccessToken();
      if (current && current !== staleToken) return Promise.resolve(current);

      // The session was cleared while this request was in flight (another
      // request's refresh failed, or the user logged out): nothing to refresh,
      // and the expiry has already been reported once.
      if (staleToken !== null && current === null && tokens.getRefreshToken() === null) {
        return Promise.resolve(null);
      }

      if (!inFlight) {
        const seenAccess = current;
        inFlight = runExclusive(() => performRefresh(seenAccess)).finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}
