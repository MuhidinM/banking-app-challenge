import { describe, expect, it } from "vitest";

import { type RegisterField, validateRegister } from "./register-schema";

const valid: Record<RegisterField, string> = {
  firstName: " Abebe ",
  lastName: "Kebede",
  username: "abebe.k",
  phoneNumber: "+251 911 234 567",
  email: "",
  password: "secret1",
  confirmPassword: "secret1",
};

const errorsFor = (changes: Partial<Record<RegisterField, string>>) => {
  const result = validateRegister({ ...valid, ...changes });
  return result.ok ? {} : result.errors;
};

describe("validateRegister", () => {
  it("builds the API request: trimmed, passwordHash, no empty email", () => {
    expect(validateRegister(valid)).toEqual({
      ok: true,
      request: {
        firstName: "Abebe",
        lastName: "Kebede",
        username: "abebe.k",
        phoneNumber: "+251 911 234 567",
        passwordHash: "secret1",
      },
    });
  });

  it("keeps a given email", () => {
    const result = validateRegister({ ...valid, email: " abebe@example.com " });
    expect(result.ok && result.request.email).toBe("abebe@example.com");
  });

  it("asks for every required field", () => {
    const empty = Object.fromEntries(Object.keys(valid).map((key) => [key, ""])) as Record<
      RegisterField,
      string
    >;
    const result = validateRegister(empty);
    expect(result.ok ? null : result.errors).toEqual({
      firstName: "Enter your first name.",
      lastName: "Enter your last name.",
      username: "Choose a username.",
      phoneNumber: "Enter your phone number.",
      password: "Choose a password.",
      confirmPassword: "Repeat your password.",
    });
  });

  it.each([
    [{ username: "ab" }, "username", "Username must be 3 to 50 characters."],
    [{ username: "a".repeat(51) }, "username", "Username must be 3 to 50 characters."],
    [{ username: "   " }, "username", "Choose a username."],
    [{ phoneNumber: "12345" }, "phoneNumber", "Enter a phone number like +251 911 234 567."],
    [{ phoneNumber: "+251-911-abc" }, "phoneNumber", "Enter a phone number like +251 911 234 567."],
    [{ email: "abebe@" }, "email", "Enter an email address like you@example.com."],
    [
      { password: "pass", confirmPassword: "pass" },
      "password",
      "Password must be at least 6 characters.",
    ],
    [{ confirmPassword: "secret2" }, "confirmPassword", "Passwords do not match."],
  ] as const)("%j → %s: %s", (changes, field, message) => {
    expect(errorsFor(changes)).toEqual({ [field]: message });
  });

  it("accepts the API's phone formats", () => {
    for (const phoneNumber of ["0911234567", "+251911234567", "(011) 123-4567", "011.123.4567"]) {
      expect(errorsFor({ phoneNumber })).toEqual({});
    }
  });

  it("reports a mismatch together with other errors", () => {
    expect(errorsFor({ firstName: "", confirmPassword: "other1" })).toEqual({
      firstName: "Enter your first name.",
      confirmPassword: "Passwords do not match.",
    });
  });

  it("doesn't trim the password", () => {
    const result = validateRegister({
      ...valid,
      password: " secret ",
      confirmPassword: " secret ",
    });
    expect(result.ok && result.request.passwordHash).toBe(" secret ");
  });
});
