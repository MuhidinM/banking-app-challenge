/**
 * Access and refresh tokens for the mock API, following the real API's rules:
 * access tokens last 10 minutes, refresh tokens 24 hours, and every refresh
 * rotates **both** tokens, so a refresh token works only once.
 *
 * Tokens are shaped like JWTs (header.payload.signature, with `sub`, `iat`,
 * `exp`) so client code that reads a token's expiry behaves the same against
 * the mock. They are not signed; the mock trusts only tokens it issued.
 */

interface IssuedToken {
  userId: number;
  expiresAt: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_LIFETIMES = { accessMs: 10 * 60_000, refreshMs: 24 * 60 * 60_000 };

let lifetimes = { ...DEFAULT_LIFETIMES };
let counter = 0;
const accessTokens = new Map<string, IssuedToken>();
const refreshTokens = new Map<string, IssuedToken>();

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function createToken(userId: number, kind: "access" | "refresh", expiresAt: number): string {
  counter += 1;
  const header = base64Url({ alg: "none", typ: "JWT" });
  const payload = base64Url({
    sub: String(userId),
    typ: kind,
    jti: `mock-${kind}-${counter}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt / 1000),
  });
  return `${header}.${payload}.mock-signature`;
}

export function issueTokens(userId: number): TokenPair {
  const now = Date.now();
  const access = { userId, expiresAt: now + lifetimes.accessMs };
  const refresh = { userId, expiresAt: now + lifetimes.refreshMs };
  const accessToken = createToken(userId, "access", access.expiresAt);
  const refreshToken = createToken(userId, "refresh", refresh.expiresAt);
  accessTokens.set(accessToken, access);
  refreshTokens.set(refreshToken, refresh);
  return { accessToken, refreshToken };
}

export type TokenCheck =
  { ok: true; userId: number } | { ok: false; reason: "unknown" | "expired" };

export function checkAccessToken(token: string): TokenCheck {
  const issued = accessTokens.get(token);
  if (!issued) return { ok: false, reason: "unknown" };
  if (issued.expiresAt <= Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, userId: issued.userId };
}

/** Exchanges a refresh token for a new pair. The old refresh token stops working. */
export function rotateTokens(refreshToken: string): TokenPair | null {
  const issued = refreshTokens.get(refreshToken);
  refreshTokens.delete(refreshToken);
  if (!issued || issued.expiresAt <= Date.now()) return null;
  return issueTokens(issued.userId);
}

// Controls for tests and the session inspector (#25).

/** Makes every issued access token expire now, so the next request gets a 401. */
export function expireAccessTokens(): void {
  const now = Date.now();
  for (const issued of accessTokens.values()) issued.expiresAt = now;
}

/** Makes every issued refresh token expire now, so the next refresh fails. */
export function expireRefreshTokens(): void {
  const now = Date.now();
  for (const issued of refreshTokens.values()) issued.expiresAt = now;
}

export function setTokenLifetimes(next: Partial<typeof DEFAULT_LIFETIMES>): void {
  lifetimes = { ...lifetimes, ...next };
}

export function resetTokens(): void {
  lifetimes = { ...DEFAULT_LIFETIMES };
  accessTokens.clear();
  refreshTokens.clear();
}

/** The issued tokens as plain data, so the browser mock can keep them across reloads. */
export interface TokenSnapshot {
  counter: number;
  access: [token: string, issued: IssuedToken][];
  refresh: [token: string, issued: IssuedToken][];
}

export function snapshotTokens(): TokenSnapshot {
  // Expired tokens would be refused anyway; leaving them out keeps the snapshot small.
  const live = (tokens: Map<string, IssuedToken>) =>
    [...tokens].filter(([, issued]) => issued.expiresAt > Date.now());
  return { counter, access: live(accessTokens), refresh: live(refreshTokens) };
}

export function restoreTokens(snapshot: TokenSnapshot): void {
  resetTokens();
  counter = snapshot.counter;
  for (const [token, issued] of snapshot.access) accessTokens.set(token, issued);
  for (const [token, issued] of snapshot.refresh) refreshTokens.set(token, issued);
}
