import { Profile } from "@/features/profile/profile";
import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile" };

/** `/profile`: the signed-in user, their total, the theme and Log out. */
export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-section">
      <PageHeader title="Profile" />
      <Profile />
    </div>
  );
}
