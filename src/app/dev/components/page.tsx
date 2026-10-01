import { notFound } from "next/navigation";

import { ComponentGallery } from "@/features/dev-tools/component-gallery";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Components (development)",
  robots: { index: false, follow: false },
};

/** Development-only preview of the UI kit. Production builds answer 404. */
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ComponentGallery />;
}
