import { headers } from "next/headers";

import { SessionBootstrap } from "@/features/auth/session-bootstrap";
import { DevTools } from "@/features/dev-tools/dev-tools";
import { MockApiProvider } from "@/mocks/mock-api-provider";
import { QueryProvider } from "@/shared/api/query-provider";
import { NONCE_HEADER } from "@/shared/config/security-headers";
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
  // A Kifiya-branded sign-in page must not show up in search results (spec note N-013).
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The Content-Security-Policy only runs scripts with this response's nonce
  // (src/proxy.ts). Reading the request makes every page render per request.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    // The inline script may add data-theme before React hydrates, hence suppressHydrationWarning
    // (it only covers this element's own attributes, not its children).
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
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
          <QueryProvider>{children}</QueryProvider>
          <DevTools />
        </MockApiProvider>
        <Toaster />
      </body>
    </html>
  );
}
