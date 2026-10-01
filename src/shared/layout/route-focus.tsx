"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a client-side navigation, moves focus to the new page's heading (or
 * the main region if it has none). Without this, focus stays on the link that
 * was clicked, in a sidebar that didn't change, and the user has to find the
 * new content. Next.js's route announcer reads the new title out; this gives
 * keyboard users the same starting point. The first page load is left alone.
 */
export function RouteFocus({ mainId }: { mainId: string }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const main = document.getElementById(mainId);
    const heading = main?.querySelector<HTMLElement>("[data-page-heading]");
    (heading ?? main)?.focus({ preventScroll: true });
  }, [pathname, mainId]);

  return null;
}
