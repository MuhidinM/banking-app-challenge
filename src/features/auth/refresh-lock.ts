/**
 * One token refresh at a time across all of the app's tabs (ADR-0005), with
 * the Web Locks API. Refresh tokens rotate: two tabs refreshing with the same
 * one would get the second rejected, and that tab would be logged out.
 *
 * The lock only orders the refreshes. The tab that gets it second finds the
 * first tab's new access token (shared over the session channel) and uses it
 * without calling the API (src/shared/api/token-refresh.ts).
 */

export const REFRESH_LOCK_NAME = "kifiya-refresh";

export type RunExclusive = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Undefined where Web Locks doesn't exist (older browsers, plain HTTP on a
 * non-localhost host): each tab then refreshes on its own, and a refresh
 * rejected because another tab rotated the tokens tries again with theirs.
 */
export function createRefreshLock(): RunExclusive | undefined {
  if (typeof navigator === "undefined" || !navigator.locks) return undefined;
  const { locks } = navigator;
  // The lock is held until the task settles; the result is the task's own.
  return async (task) => locks.request(REFRESH_LOCK_NAME, task);
}
