"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/cn";
import { Logo } from "@/shared/ui/logo";

import { SIDEBAR_ITEMS, isActive } from "./nav-items";

import type { ReactNode } from "react";

/**
 * Desktop navigation, 768 px and up (UI spec, WebDashboard): logo, the five
 * sections, and `footer` at the bottom (theme switch, user card with logout).
 */
export function Sidebar({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r border-border bg-surface md:flex">
      <Link href="/" className="hit-area mx-4 mt-6 mb-7 self-start rounded-control px-3 py-1">
        <Logo className="h-8 text-primary" label="Kifiya, home" />
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-4">
        <ul className="flex flex-col gap-2">
          {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-control-compact items-center gap-3 rounded-control px-3 type-body-strong transition-colors",
                    active
                      ? "bg-primary-soft text-ink"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("size-icon shrink-0", active && "text-primary")}
                    strokeWidth={1.75}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {footer ? (
        <div className="flex flex-col gap-3 border-t border-border p-4">{footer}</div>
      ) : null}
    </aside>
  );
}
