/**
 * Tells the app's other open tabs about the session (BroadcastChannel). For
 * now: "this user logged out", so every tab returns to login and drops its
 * data. Sharing refreshed tokens between tabs follows in #24.
 */

const CHANNEL_NAME = "kb-session";

export type SessionMessage = { type: "signed-out" };

export interface SessionChannel {
  post(message: SessionMessage): void;
  /** Messages from the other tabs (never this tab's own). */
  subscribe(listener: (message: SessionMessage) => void): () => void;
}

const isSessionMessage = (data: unknown): data is SessionMessage =>
  typeof data === "object" && data !== null && (data as { type?: unknown }).type === "signed-out";

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
