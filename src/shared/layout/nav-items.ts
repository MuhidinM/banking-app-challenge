import { ArrowLeftRight, CreditCard, House, type LucideIcon, ScrollText, User } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The app's main sections, in the order the sidebar and bottom nav show them (UI spec). */
export const NAV_ITEMS = {
  home: { href: "/", label: "Home", icon: House },
  accounts: { href: "/accounts", label: "Accounts", icon: CreditCard },
  activity: { href: "/activity", label: "Activity", icon: ScrollText },
  transfer: { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  profile: { href: "/profile", label: "Profile", icon: User },
} satisfies Record<string, NavItem>;

/** Sidebar order (WebDashboard). */
export const SIDEBAR_ITEMS: NavItem[] = [
  NAV_ITEMS.home,
  NAV_ITEMS.accounts,
  NAV_ITEMS.activity,
  NAV_ITEMS.transfer,
  NAV_ITEMS.profile,
];

/** Bottom-nav order (mobile Main): Transfer in the middle as the raised action. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS.home,
  NAV_ITEMS.accounts,
  NAV_ITEMS.transfer,
  NAV_ITEMS.activity,
  NAV_ITEMS.profile,
];

/**
 * Whether a section is the current one. Home only on `/`; the others on their
 * own pages too, e.g. Accounts on /accounts/12 and Transfer on its receipt.
 */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
