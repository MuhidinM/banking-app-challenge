import { AuthShell } from "@/features/auth/auth-shell";
import { RedirectWhenSignedIn } from "@/features/auth/redirect-when-signed-in";
import { RegisterForm } from "@/features/auth/register-form";
import { HOME_PATH } from "@/features/auth/routes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create your account" };

/** `/register`: a new customer gets a profile and a checking account. */
export default function RegisterPage() {
  return (
    <AuthShell
      headline="Open your account in a minute."
      intro="A checking account is created for you the moment you register. Add savings or other accounts later."
      width="wide"
      mobileLogo={false}
    >
      <RedirectWhenSignedIn to={HOME_PATH} />
      <RegisterForm />
    </AuthShell>
  );
}
