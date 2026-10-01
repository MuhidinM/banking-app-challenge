import { cn } from "@/shared/lib/cn";
import { Logo } from "@/shared/ui/logo";

import type { ReactNode } from "react";

interface AuthShellProps {
  /** The panel's headline, e.g. "Banking that fits in your day." */
  headline: string;
  /** One or two sentences under the headline. */
  intro: string;
  /** Form column width: 420 px for login, 480 px for register's two-column rows. */
  width?: "narrow" | "wide";
  /**
   * Narrow screens show the logo above the form. Register shows a back button
   * and its title instead (mobile Register screen).
   */
  mobileLogo?: boolean;
  children: ReactNode;
}

const widths = { narrow: "max-w-[26.25rem]", wide: "max-w-[30rem]" } as const;

/**
 * The sign-in and register layout (UI spec, WebLogin and Login).
 *
 * Wide screens: brand panel on the left (logo, headline, the spec's "reference
 * client" footer), the form centred on the right. Narrow screens: the logo
 * above the form, no panel. The panel appears from 1024 px: at 768 px it would
 * leave the form under 280 px wide.
 */
export function AuthShell({
  headline,
  intro,
  width = "narrow",
  mobileLogo = true,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[53fr_47fr]">
      <aside className="hidden flex-col justify-between bg-auth-panel p-12 text-on-primary lg:flex">
        <Logo className="self-start text-(--auth-panel-logo)" />
        <div className="flex max-w-[27.5rem] flex-col gap-4">
          <p className="text-[2.5rem] leading-[1.2] font-semibold">{headline}</p>
          <p className="text-base leading-[1.6]">{intro}</p>
        </div>
        <p className="type-label font-normal">
          Reference client for the Kifiya developer challenge
        </p>
      </aside>

      <main className="flex flex-col items-center px-page pt-14 pb-10 lg:justify-center lg:p-12">
        <div className={cn("flex w-full flex-col gap-6 lg:gap-[1.375rem]", widths[width])}>
          {mobileLogo ? <Logo className="mb-4 self-center text-primary lg:hidden" /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
