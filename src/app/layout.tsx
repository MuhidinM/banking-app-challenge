import { SessionBootstrap } from "@/features/auth/session-bootstrap";
import { MockApiProvider } from "@/mocks/mock-api-provider";
import { fontVariables } from "@/shared/theme/fonts";
import { themeInitScript } from "@/shared/theme/theme-preference";
import { Toaster } from "@/shared/ui/toast";

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kifiya Banking",
    template: "%s · Kifiya Banking",
  },
  description: "Reference banking web client for the Kifiya developer challenge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may add data-theme before React hydrates, hence suppressHydrationWarning
    // (it only covers this element's own attributes, not its children).
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          // Applies the stored theme before the first paint so a reload never flashes the
          // wrong theme (Next.js guide: "Preventing flash before hydration"). The content is
          // a constant from theme-preference.ts with no user data in it.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        <MockApiProvider>
          <SessionBootstrap />
          {children}
        </MockApiProvider>
        <Toaster />
      </body>
    </html>
  );
}
