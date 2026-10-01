import { z } from "zod";

import type { HttpClient } from "@/shared/api/http-client";
import type { TokenPair } from "@/shared/api/token-refresh";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/shared/api/types";

// Sessions depend on these responses, so their shape is checked at the boundary:
// a response without tokens fails here, not later as a confusing 401 loop.
const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

const loginResponseSchema = tokenPairSchema.extend({
  username: z.string(),
  userId: z.number(),
  message: z.string(),
});

/**
 * The authentication endpoints. All three run without an access token
 * (`auth: false`), so a wrong password or a rejected refresh token comes back as
 * an ApiError instead of triggering a token refresh.
 */
export function createAuthApi(client: HttpClient) {
  return {
    async login(credentials: LoginRequest): Promise<LoginResponse> {
      const response = await client.request<unknown>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: credentials,
      });
      return loginResponseSchema.parse(response);
    },

    register(details: RegisterRequest): Promise<RegisterResponse> {
      return client.request<RegisterResponse>("/api/auth/register", {
        method: "POST",
        auth: false,
        body: details,
      });
    },

    /** Exchanges a refresh token for a new pair; the old refresh token stops working. */
    async refreshTokens(refreshToken: string): Promise<TokenPair> {
      const body: RefreshTokenRequest = { refreshToken };
      const response = await client.request<RefreshTokenResponse>("/api/auth/refresh-token", {
        method: "POST",
        auth: false,
        body,
      });
      return tokenPairSchema.parse(response);
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
