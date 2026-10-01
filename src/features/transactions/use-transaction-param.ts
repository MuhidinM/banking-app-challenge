"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { readIdParam } from "./url-params";

import type { MouseEvent } from "react";

/**
 * The open transaction in `?tx=` (URL state, ADR-0004): reload and shared
 * links reopen it, and the browser's Back button closes it.
 *
 * Opening from a row adds a history entry, so closing goes back to it rather
 * than adding another. Details opened from a link or a reload have no entry
 * of ours behind them, so closing replaces the URL instead of leaving the page.
 */
export function useTransactionParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const transactionId = readIdParam(searchParams.get("tx"));

  const openedHere = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  function urlWith(id: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === null) params.delete("tx");
    else params.set("tx", String(id));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return {
    transactionId,

    open(id: number, event: MouseEvent<HTMLElement>) {
      returnFocusTo.current = event.currentTarget;
      openedHere.current = true;
      router.push(urlWith(id), { scroll: false });
    },

    close() {
      if (openedHere.current) {
        openedHere.current = false;
        router.back();
      } else {
        router.replace(urlWith(null), { scroll: false });
      }
    },

    /** Focus goes back to the row that opened the details, or to the page heading. */
    onCloseAutoFocus(event: Event) {
      event.preventDefault();
      const row = returnFocusTo.current;
      returnFocusTo.current = null;
      if (row?.isConnected) row.focus();
      else document.querySelector<HTMLElement>("[data-page-heading]")?.focus();
    },
  };
}
