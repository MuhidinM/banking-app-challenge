"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/cn";

import { BOTTOM_NAV_ITEMS, NAV_ITEMS, isActive } from "./nav-items";

/**
 * Mobile navigation, below 768 px (UI spec, mobile Main): five tabs with icon
 * 22 and label 12; the current one sits on a soft pill. Transfer, the main
 * action, is a raised 56 px primary disc in the middle.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-content grid-cols-5">
        {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const raised = href === NAV_ITEMS.transfer.href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 type-caption transition-colors",
                  active ? "font-medium text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {raised ? (
                  <span className="-mt-6 flex size-14 items-center justify-center rounded-pill bg-primary text-on-primary shadow-float">
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-pill",
                      active && "bg-primary-soft text-primary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.75} />
                  </span>
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
