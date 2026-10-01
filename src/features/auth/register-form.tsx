"use client";

import { ChevronLeft, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { describeError } from "@/shared/api/error-messages";
import { formatAccountNumber } from "@/shared/lib/account-number";
import { Button } from "@/shared/ui/button";
import { InlineMessage } from "@/shared/ui/feedback";
import { PasswordField, TextField } from "@/shared/ui/text-field";
import { toast } from "@/shared/ui/toast";

import { type RegisterErrors, type RegisterField, validateRegister } from "./register-schema";
import { HOME_PATH, LOGIN_PATH } from "./routes";
import { getAppSession } from "./session";

/** Form order: the first invalid one gets focus. */
const FIELDS: RegisterField[] = [
  "firstName",
  "lastName",
  "username",
  "phoneNumber",
  "email",
  "password",
  "confirmPassword",
];

/** The API names the password `passwordHash`; the form calls it `password`. */
const formFieldFor = (field: string): RegisterField =>
  field === "passwordHash" ? "password" : (field as RegisterField);

function readForm(form: HTMLFormElement): Record<RegisterField, string> {
  const data = new FormData(form);
  return Object.fromEntries(
    FIELDS.map((field) => [field, String(data.get(field) ?? "")]),
  ) as Record<RegisterField, string>;
}

/**
 * Registration (UI spec, WebRegister and Register): checks the API's rules
 * before sending, puts a duplicate username or email on its field, then signs
 * the new user in and opens the dashboard.
 */
export function RegisterForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Client checks run on submit, then again on every change so errors clear
  // as they're fixed. Server errors (AUTH_003, AUTH_004) clear when their field changes.
  const [checked, setChecked] = useState(false);
  const [clientErrors, setClientErrors] = useState<RegisterErrors>({});
  const [serverErrors, setServerErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errorFor = (field: RegisterField) => clientErrors[field] ?? serverErrors[field];

  const focusField = (field: RegisterField) =>
    formRef.current?.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus();

  function handleChange(event: FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name as RegisterField;
    if (serverErrors[name]) setServerErrors(({ [name]: _cleared, ...rest }) => rest);
    if (checked) {
      const result = validateRegister(readForm(event.currentTarget));
      setClientErrors(result.ok ? {} : result.errors);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const values = readForm(event.currentTarget);
    const result = validateRegister(values);
    setChecked(true);
    setFormError(null);
    setServerErrors({});
    if (!result.ok) {
      setClientErrors(result.errors);
      const first = FIELDS.find((field) => result.errors[field]);
      if (first) focusField(first);
      return;
    }
    setClientErrors({});

    setSubmitting(true);
    const session = getAppSession();
    let accountNumber: string;
    try {
      ({ initialAccountNumber: accountNumber } = await session.authApi.register(result.request));
    } catch (error) {
      const { message, field } = describeError(error, "register");
      if (field) {
        const formField = formFieldFor(field);
        setServerErrors({ [formField]: message });
        focusField(formField);
      } else {
        setFormError(message);
      }
      setSubmitting(false);
      return;
    }

    const { firstName, username, passwordHash } = result.request;
    try {
      await session.signIn({ username, passwordHash });
    } catch {
      // The account exists; only the automatic sign-in failed (e.g. the
      // connection dropped). Signing in by hand works.
      toast({ title: "Your account is ready. Please sign in.", tone: "info" });
      router.replace(LOGIN_PATH);
      return;
    }
    toast({
      title: `Welcome, ${firstName}. Your account is ready.`,
      description: `Your checking account ${formatAccountNumber(accountNumber)} was opened for you.`,
    });
    // Stay "registering" until the dashboard replaces this page.
    router.replace(HOME_PATH);
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onChange={handleChange}
      className="flex flex-col gap-6 lg:gap-[1.375rem]"
    >
      <header className="flex flex-col gap-1.5 lg:text-center">
        <div className="flex items-center gap-3">
          <Link
            href={LOGIN_PATH}
            aria-label="Back to login"
            className="flex size-hit shrink-0 items-center justify-center rounded-pill border border-border text-ink hover:bg-surface-muted lg:hidden"
          >
            <ChevronLeft aria-hidden="true" className="size-icon" strokeWidth={1.75} />
          </Link>
          <h1 className="type-title text-[1.625rem] text-ink lg:w-full">Create your account</h1>
        </div>
        <p className="type-body text-ink-muted">
          A checking account is opened for you automatically.
        </p>
      </header>

      {formError ? (
        <InlineMessage tone="error" announce="assertive">
          {formError}
        </InlineMessage>
      ) : null}

      <div className="grid grid-cols-2 gap-x-3 gap-y-[1.125rem]">
        <TextField
          label="First name"
          name="firstName"
          placeholder="Jane"
          autoComplete="given-name"
          error={errorFor("firstName")}
        />
        <TextField
          label="Last name"
          name="lastName"
          placeholder="Doe"
          autoComplete="family-name"
          error={errorFor("lastName")}
        />
        <TextField
          label="Username"
          name="username"
          icon={User}
          placeholder="choose a username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errorFor("username")}
          className="col-span-2"
        />
        <TextField
          label="Phone number"
          name="phoneNumber"
          type="tel"
          icon={Phone}
          placeholder="+251 9xx xxx xxx"
          autoComplete="tel"
          error={errorFor("phoneNumber")}
          className="col-span-2 lg:col-span-1"
        />
        <TextField
          label="Email (optional)"
          name="email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          error={errorFor("email")}
          className="col-span-2 lg:col-span-1"
        />
        <PasswordField
          label="Password"
          name="password"
          placeholder="at least 6 characters"
          autoComplete="new-password"
          hint="At least 6 characters."
          error={errorFor("password")}
          className="col-span-2 lg:col-span-1"
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          placeholder="repeat your password"
          autoComplete="new-password"
          error={errorFor("confirmPassword")}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <Button type="submit" fullWidth loading={submitting}>
        Register
      </Button>

      <p className="flex flex-wrap justify-center gap-1.5 type-body text-ink-muted">
        Already have an account?
        <Link
          href={LOGIN_PATH}
          className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
