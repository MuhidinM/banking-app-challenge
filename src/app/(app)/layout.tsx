import { RequireSession } from "@/features/auth/require-session";

/** Every page in this group needs a session. The app shell (#26) goes here too. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <RequireSession>{children}</RequireSession>;
}
