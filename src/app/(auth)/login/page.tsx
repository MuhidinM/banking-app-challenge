import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { RedirectWhenSignedIn } from "@/features/auth/redirect-when-signed-in";
import { safeReturnPath } from "@/features/auth/return-path";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

/**
 * `/login`, also reached as `/login?next=/accounts` (go back there after
 * signing in) and `/login?reason=expired` (show the "session expired" banner).
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reason } = await searchParams;
  const returnTo = safeReturnPath(next);

  return (
    <AuthShell
      headline="Banking that fits in your day."
      intro="Check balances, move money between accounts, pay bills and follow every transaction from one place."
    >
      <RedirectWhenSignedIn to={returnTo} />
      <LoginForm returnTo={returnTo} expired={reason === "expired"} />
    </AuthShell>
  );
}
