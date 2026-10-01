"use client";

import { CircleAlert, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { describeError } from "@/shared/api/error-messages";
import { Button } from "@/shared/ui/button";
import { InlineMessage } from "@/shared/ui/feedback";
import { PasswordField, TextField } from "@/shared/ui/text-field";

import { getAppSession } from "./session";
import { useSession } from "./use-session";

interface LoginFormProps {
  /** Where to go once signed in: already checked with safeReturnPath(). */
  returnTo: string;
  /** The URL says the last session expired (`?reason=expired`). */
  expired: boolean;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

/** Username and password, then `POST /api/auth/login` (UI spec, WebLogin and Login). */
export function LoginForm({ returnTo, expired }: LoginFormProps) {
  const router = useRouter();
  const session = useSession();
  const formRef = useRef<HTMLFormElement>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Expired in this tab (no redirect yet) or arrived from a redirect. Hidden
  // once there's something newer to say.
  const showExpired =
    (expired || session.endedBecause === "expired") && formError === null && !submitting;

  const focusField = (name: keyof FieldErrors) =>
    formRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const errors: FieldErrors = {};
    if (!username) errors.username = "Enter your username.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    setFormError(null);
    if (errors.username || errors.password) {
      focusField(errors.username ? "username" : "password");
      return;
    }

    setSubmitting(true);
    try {
      // The API names the field `passwordHash`; it takes the plain password.
      await getAppSession().signIn({ username, passwordHash: password });
    } catch (error) {
      setFormError(describeError(error, "login").message);
      setSubmitting(false);
      focusField("password");
      return;
    }
    // Stay "signing in" until the next page replaces this one, so it can't be sent twice.
    router.replace(returnTo);
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 lg:gap-[1.375rem]"
    >
      <header className="flex flex-col gap-1.5 text-center">
        <h1 className="type-title text-[1.625rem] text-ink">Welcome back</h1>
        <p className="type-body text-ink-muted">Sign in to manage your accounts.</p>
      </header>

      {formError ? (
        <InlineMessage tone="error" announce="assertive">
          {formError}
        </InlineMessage>
      ) : showExpired ? (
        <InlineMessage tone="info" icon={CircleAlert} announce="polite">
          Your session expired. Please sign in again.
        </InlineMessage>
      ) : null}

      <div className="flex flex-col gap-[1.125rem]">
        <TextField
          label="Username"
          name="username"
          icon={User}
          placeholder="your username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={fieldErrors.username}
          onChange={() =>
            fieldErrors.username && setFieldErrors((e) => ({ ...e, username: undefined }))
          }
        />
        <PasswordField
          label="Password"
          name="password"
          placeholder="your password"
          autoComplete="current-password"
          error={fieldErrors.password}
          onChange={() =>
            fieldErrors.password && setFieldErrors((e) => ({ ...e, password: undefined }))
          }
        />
      </div>

      <Button type="submit" fullWidth loading={submitting}>
        Login
      </Button>

      <p className="flex flex-wrap justify-center gap-1.5 type-body text-ink-muted">
        Don&apos;t have an account?
        <Link
          href="/register"
          className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
