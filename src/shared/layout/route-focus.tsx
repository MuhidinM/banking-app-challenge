"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a client-side navigation, moves focus to the new page's heading (or
 * the main region if it has none). Without this, focus stays on the link that
 * was clicked, in a sidebar that didn't change, and the user has to find the
 * new content. Next.js's route announcer reads the new title out; this gives
 * keyboard users the same starting point. The first page load is left alone.
 *
 * Some pages draw their heading only once their data arrives (a receipt, an
 * account). Focus then waits on the main region and moves to the heading when
 * it appears, unless the user has moved focus elsewhere in the meantime.
 */
export function RouteFocus({ mainId }: { mainId: string }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const main = document.getElementById(mainId);
    if (!main) return;

    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>("[data-page-heading]");
      heading?.focus({ preventScroll: true });
      return heading !== null;
    };
    if (focusHeading()) return;

    main.focus({ preventScroll: true });
    const observer = new MutationObserver(() => {
      if (document.activeElement !== main || focusHeading()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    // A page that never draws a heading keeps focus on the main region.
    const giveUp = setTimeout(() => observer.disconnect(), HEADING_WAIT_MS);
    return () => {
      observer.disconnect();
      clearTimeout(giveUp);
    };
  }, [pathname, mainId]);

  return null;
}

/** How long to wait for a heading that is drawn after the data loads. */
const HEADING_WAIT_MS = 10_000;
