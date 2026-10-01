import { LogoutButton } from "@/features/auth/logout-button";
import { PageHeader } from "@/shared/layout/page-header";
import { ThemeToggle } from "@/shared/theme/theme-toggle";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile" };

// Placeholder until the profile is built (#44). Phones have no sidebar, so the
// theme switch and logout live here for now, as they will in the full profile.
export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-section">
      <PageHeader title="Profile" />
      <ThemeToggle />
      <LogoutButton variant="outline" className="self-start" />
    </div>
  );
}
