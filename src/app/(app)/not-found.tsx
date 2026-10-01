import { RouteNotFound } from "@/shared/layout/route-states";

/** notFound() from a signed-in page, e.g. an account that isn't the user's. */
export default function AppNotFound() {
  return <RouteNotFound />;
}
