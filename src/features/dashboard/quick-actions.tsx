import { ArrowLeftRight, CreditCard, type LucideIcon, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";

const ACTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/pay-bill", label: "Pay bill", icon: ReceiptText },
  { href: "/accounts/new", label: "New account", icon: Plus },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
];

/**
 * The four shortcuts (UI spec): primary-soft discs, 60 px on phones and 56 on
 * web, label below. On web they sit in a card beside the balance.
 */
export function QuickActions() {
  return (
    <nav
      aria-label="Quick actions"
      className="md:flex md:items-center md:rounded-card md:border md:border-border md:bg-surface md:px-4 md:shadow-card"
    >
      <ul className="grid w-full grid-cols-4 gap-2">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex flex-col items-center gap-3 rounded-card px-1 py-2 text-center type-body text-ink md:py-4"
            >
              <span className="flex size-15 items-center justify-center rounded-pill bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary md:size-14">
                <Icon aria-hidden="true" className="size-6.5" strokeWidth={1.75} />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
