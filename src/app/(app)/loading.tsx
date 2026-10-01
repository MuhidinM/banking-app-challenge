import { RouteLoading } from "@/shared/layout/route-states";

/** Shown inside the app shell while a page loads, so the navigation stays put. */
export default function AppLoading() {
  return <RouteLoading />;
}
