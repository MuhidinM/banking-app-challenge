"use client";

import { ArrowLeftRight, ReceiptText } from "lucide-react";
import Link from "next/link";

import { initials } from "@/features/profile/initials";
import { useCurrentUser } from "@/features/profile/queries";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

import { greetingFor } from "./greeting";

/**
 * "Good morning" and the user's full name (UI spec, WebDashboard and Main).
 * Web: Transfer and Pay bill on the right. Phones: the initials disc, linking
 * to the profile, since the bottom nav already has Transfer.
 */
export function DashboardHeader() {
  const { data: user } = useCurrentUser();

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col">
        <p className="type-body text-ink-muted">{greetingFor(new Date())}</p>
        <h1
          tabIndex={-1}
          data-page-heading=""
          className="truncate type-title text-ink outline-none"
        >
          {user ? (
            `${user.firstName} ${user.lastName}`
          ) : (
            <>
              <span className="sr-only">Your dashboard</span>
              <Skeleton className="my-1 h-8 w-48" />
            </>
          )}
        </h1>
      </div>

      <div className="hidden shrink-0 gap-3 md:flex">
        <Button asChild size="compact" icon={ArrowLeftRight}>
          <Link href="/transfer">Transfer</Link>
        </Button>
        <Button asChild size="compact" variant="outline" icon={ReceiptText}>
          <Link href="/pay-bill">Pay bill</Link>
        </Button>
      </div>

      <Link
        href="/profile"
        aria-label="Your profile"
        className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-primary type-body-strong text-on-primary md:hidden"
      >
        {user ? initials(user.firstName, user.lastName) : null}
      </Link>
    </header>
  );
}
