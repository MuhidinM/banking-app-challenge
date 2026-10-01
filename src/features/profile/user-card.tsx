"use client";

import { LogOut } from "lucide-react";

import { getAppSession } from "@/features/auth/session";
import { Skeleton } from "@/shared/ui/skeleton";

import { initials } from "./initials";
import { useCurrentUser } from "./queries";

/**
 * The sidebar's footer (UI spec, WebDashboard): initials disc, full name,
 * username, and a logout button.
 */
export function UserCard() {
  const { data: user } = useCurrentUser();

  return (
    <div className="flex items-center gap-3 px-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-primary type-label text-on-primary"
      >
        {user ? initials(user.firstName, user.lastName) : null}
      </span>
      <div className="min-w-0 flex-1">
        {user ? (
          <>
            <p className="truncate type-body-strong text-ink">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate type-caption text-ink-muted">{user.username}</p>
          </>
        ) : (
          <div className="flex flex-col gap-1.5" aria-label="Loading your profile" role="status">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => getAppSession().signOut()}
        aria-label="Log out"
        title="Log out"
        className="-mr-2 flex size-hit shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <LogOut aria-hidden="true" className="size-icon" strokeWidth={1.75} />
      </button>
    </div>
  );
}
