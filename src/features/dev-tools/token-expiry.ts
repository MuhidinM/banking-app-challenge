/**
 * When a token expires, read from its `exp` claim. The API's tokens are JWTs;
 * the inspector only displays this, so nothing is verified, and anything that
 * isn't a readable JWT gives null ("unknown").
 */
export function tokenExpiry(token: string | null): Date | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    return typeof exp === "number" ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

/** "9:41", "1:05:00", or "expired" once the time has passed. */
export function formatRemaining(expiresAt: Date, now: Date): string {
  const seconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  if (seconds <= 0) return "expired";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
