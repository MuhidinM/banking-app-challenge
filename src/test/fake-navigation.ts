import { useSyncExternalStore } from "react";

/**
 * A stand-in for next/navigation in component tests: the App Router isn't
 * mounted there, so `useRouter` would throw. It keeps a small history stack,
 * so tests can push, go back and read the URL, and components re-render when
 * the URL changes, as they do in the app.
 *
 *   vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);
 *   beforeEach(() => fakeNavigation.reset("/activity?account=1"));
 */
const BASE = "http://localhost";

let entries = ["/"];
let index = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const currentHref = () => entries[index] ?? "/";

const router = {
  push(href: string) {
    entries = [...entries.slice(0, index + 1), href];
    index = entries.length - 1;
    emit();
  },
  replace(href: string) {
    entries = entries.map((entry, at) => (at === index ? href : entry));
    emit();
  },
  back() {
    if (index > 0) index--;
    emit();
  },
  forward() {
    if (index < entries.length - 1) index++;
    emit();
  },
  refresh() {},
  prefetch() {},
};

export const fakeNavigation = {
  router,
  /** Starts a new history with one entry. */
  reset(href: string) {
    entries = [href];
    index = 0;
    emit();
  },
  /** The current URL, e.g. "/activity?account=1&tx=12". */
  get href() {
    return currentHref();
  },
  /** How many entries the history has; a replace doesn't add one. */
  get length() {
    return entries.length;
  },
};

export const navigationModule = {
  useRouter: () => router,
  usePathname: () => new URL(useSyncExternalStore(subscribe, currentHref), BASE).pathname,
  useSearchParams: () =>
    new URLSearchParams(new URL(useSyncExternalStore(subscribe, currentHref), BASE).search),
};
