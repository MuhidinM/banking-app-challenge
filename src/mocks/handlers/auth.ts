import { http, HttpResponse, delay } from "msw";
import { z } from "zod";

import type { LoginResponse, RefreshTokenResponse, RegisterResponse } from "@/shared/api/types";

import { newAccountNumber, toAccount } from "../db";
import { apiUrl, MockApiError, parseBody, readJson, respond } from "../http";
import { getDb } from "../state";
import { issueTokens, rotateTokens } from "../tokens";

// Mirrors the constraints in docs/api/openapi.json.
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  passwordHash: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email().nullish(),
  phoneNumber: z.string().regex(/^\+?[0-9. ()-]{7,25}$/),
});

const loginSchema = z.object({ username: z.string().min(1), passwordHash: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const authHandlers = [
  http.post(apiUrl("/api/auth/register"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const body = parseBody(registerSchema, await readJson(request));
      const db = getDb();

      if (db.users.some((user) => user.username === body.username)) {
        throw new MockApiError(400, "AUTH_003", `Username ${body.username} is already taken.`);
      }
      if (body.email && db.users.some((user) => user.email === body.email)) {
        throw new MockApiError(400, "AUTH_004", `Email ${body.email} is already registered.`);
      }

      const user = {
        id: db.nextId.user++,
        username: body.username,
        password: body.passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email ?? null,
        phoneNumber: body.phoneNumber,
      };
      db.users.push(user);

      // Like the real API, registration opens a CHECKING account with a zero balance.
      const account = {
        id: db.nextId.account++,
        accountNumber: newAccountNumber(db),
        balanceCents: 0,
        userId: user.id,
        accountType: "CHECKING" as const,
      };
      db.accounts.push(account);

      return HttpResponse.json<RegisterResponse>(
        {
          message: `User ${user.username} registered successfully!`,
          username: user.username,
          userId: user.id,
          initialAccountNumber: toAccount(account).accountNumber,
        },
        { status: 201 },
      );
    }),
  ),

  http.post(apiUrl("/api/auth/login"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const body = parseBody(loginSchema, await readJson(request));
      const user = getDb().users.find(
        (candidate) =>
          candidate.username === body.username && candidate.password === body.passwordHash,
      );
      if (!user) throw new MockApiError(401, "AUTH_001", "Invalid username or password.");

      return HttpResponse.json<LoginResponse>({
        message: `Login successful for user: ${user.username}`,
        username: user.username,
        userId: user.id,
        ...issueTokens(user.id),
      });
    }),
  ),

  http.post(apiUrl("/api/auth/refresh-token"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const body = parseBody(refreshSchema, await readJson(request));
      const tokens = rotateTokens(body.refreshToken);
      if (!tokens) throw new MockApiError(401, "AUTH_005", "Refresh token is invalid or expired.");

      return HttpResponse.json<RefreshTokenResponse>({
        message: "Tokens refreshed successfully!",
        ...tokens,
      });
    }),
  ),
];
