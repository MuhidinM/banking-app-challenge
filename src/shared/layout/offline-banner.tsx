"use client";

import { onlineManager } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { InlineMessage } from "@/shared/ui/feedback";
import { toast } from "@/shared/ui/toast";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

/**
 * "You're offline" above the page while the browser has no connection.
 * TanStack Query pauses loading meanwhile and, when the connection returns,
 * refetches what is on screen; a toast says so (refetchOnReconnect). The status region is always
 * there, so screen readers hear the message when it appears (R-UX-07).
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      toast({
        title: "You're back online.",
        description: "Refreshing your details.",
        tone: "info",
      });
    }
  }, [online]);

  return (
    <div role="status" className="mb-section empty:hidden">
      {online ? null : (
        <InlineMessage tone="warning" icon={WifiOff}>
          You&apos;re offline. What you see may be out of date, and nothing can be sent until
          you&apos;re back online.
        </InlineMessage>
      )}
    </div>
  );
}
