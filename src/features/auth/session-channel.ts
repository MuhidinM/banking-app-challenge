/**
 * Tells the app's other open tabs about the session (BroadcastChannel):
 * - `tokens`: this tab refreshed or signed in. The others use the new access
 *   token instead of refreshing again, which would rotate the tokens a second
 *   time (#24). The refresh token itself goes through localStorage as before.
 * - `signed-out` / `expired`: the session is over, in every tab (#23).
 *
 * A BroadcastChannel rather than the storage event, so the access token stays
 * out of storage (ADR-0003). It only reaches pages of this origin.
 */

const CHANNEL_NAME = "kb-session";

export type SessionMessage =
  { type: "tokens"; accessToken: string } | { type: "signed-out" } | { type: "expired" };

export interface SessionChannel {
  post(message: SessionMessage): void;
  /** Messages from the other tabs (never this tab's own). */
  subscribe(listener: (message: SessionMessage) => void): () => void;
}

function isSessionMessage(data: unknown): data is SessionMessage {
  if (typeof data !== "object" || data === null) return false;
  const { type, accessToken } = data as { type?: unknown; accessToken?: unknown };
  if (type === "tokens") return typeof accessToken === "string" && accessToken.length > 0;
  return type === "signed-out" || type === "expired";
}

/** null where BroadcastChannel doesn't exist; each tab then logs out on its own. */
export function createSessionChannel(): SessionChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  return {
    post: (message) => channel.postMessage(message),
    subscribe(listener) {
      const onMessage = ({ data }: MessageEvent) => {
        if (isSessionMessage(data)) listener(data);
      };
      channel.addEventListener("message", onMessage);
      return () => channel.removeEventListener("message", onMessage);
    },
  };
}
