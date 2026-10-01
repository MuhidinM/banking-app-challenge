/**
 * The app's one session: the session store, the token refresher, the HTTP
 * client every feature uses, and the auth API, wired together once.
 *
 * Created on first use in the browser (`getAppSession()`), never at import time:
 * client components also render on the server, where there is no storage.
 */

import { isNetworkError } from "@/shared/api/api-error";
import { type HttpClient, createHttpClient } from "@/shared/api/http-client";
import { createTokenRefresher } from "@/shared/api/token-refresh";
import type { LoginRequest, LoginResponse } from "@/shared/api/types";
import { env } from "@/shared/config/env";

import { createAuthApi } from "./api";
import { type SessionStore, createSessionStore } from "./session-store";

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
}

export function createAppSession(
  store: SessionStore,
  { baseUrl = env.apiBaseUrl }: { baseUrl?: string } = {},
): AppSession {
  // The refresher calls the auth API, which uses this same client. That's safe:
  // the refresh request is sent without auth, so it can't trigger a refresh.
  // The two depend on each other, so the refresher reads the auth API through a holder.
  const late: { authApi?: ReturnType<typeof createAuthApi> } = {};
  const refresher = createTokenRefresher({
    tokens: store,
    requestRefresh: (refreshToken) => {
      if (!late.authApi) throw new Error("Auth API used before the session was created.");
      return late.authApi.refreshTokens(refreshToken);
    },
    // store.clear() (called by the refresher) already ended the session as "expired";
    // pages react to that through the store (#21).
    onSessionExpired: () => {},
  });
  const client = createHttpClient({ baseUrl, getAccessToken: store.getAccessToken, refresher });
  const api = createAuthApi(client);
  late.authApi = api;

  let restoring: Promise<void> | null = null;

  return {
    store,
    client,
    authApi: api,

    async signIn(credentials) {
      const response = await api.login(credentials);
      store.setTokens(response);
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
  };
}

let appSession: AppSession | undefined;

/** The app's session, created on first use. Browser only. */
export function getAppSession(): AppSession {
  appSession ??= createAppSession(createSessionStore());
  return appSession;
}
