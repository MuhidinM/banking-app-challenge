import { RequireSession } from "@/features/auth/require-session";
import { UserCard } from "@/features/profile/user-card";
import { AppShell } from "@/shared/layout/app-shell";
import { ThemeToggle } from "@/shared/theme/theme-toggle";

/** Every page in this group needs a session, and gets the sidebar / bottom nav. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <RequireSession>
      <AppShell
        sidebarFooter={
          <>
            <ThemeToggle variant="icons" className="px-3" />
            <UserCard />
          </>
        }
      >
        {children}
      </AppShell>
    </RequireSession>
  );
}
