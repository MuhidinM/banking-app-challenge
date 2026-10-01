import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, delay, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";

import { LoginForm } from "./login-form";
import { REFRESH_TOKEN_KEY } from "./session-store";

const replace = vi.fn<(href: string) => void>();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function renderForm(props: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  const user = userEvent.setup();
  render(<LoginForm returnTo="/" expired={false} {...props} />);
  const username = screen.getByLabelText("Username");
  const password = screen.getByLabelText("Password");
  const submit = screen.getByRole("button", { name: "Login" });
  const signIn = async (name: string, secret: string) => {
    await user.type(username, name);
    await user.type(password, secret);
    await user.click(submit);
  };
  return { user, username, password, submit, signIn };
}

beforeEach(() => {
  replace.mockClear();
  localStorage.clear();
});

describe("LoginForm", () => {
  it("signs in, stores the refresh token and goes to the return path", async () => {
    const { signIn } = renderForm({ returnTo: "/accounts" });

    await signIn("demo.jane", DEMO_PASSWORD);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/accounts"));
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeTruthy();
  });

  it("shows the friendly message for wrong credentials and focuses the password", async () => {
    const { signIn, password } = renderForm();

    await signIn("demo.jane", "not-the-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Username or password is incorrect.",
    );
    expect(password).toHaveFocus();
    expect(replace).not.toHaveBeenCalled();
  });

  it("disables Login while signing in", async () => {
    server.use(
      http.post(apiUrl("/api/auth/login"), async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const { signIn, submit } = renderForm();

    await signIn("demo.jane", DEMO_PASSWORD);

    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
  });

  it("asks for missing fields without calling the API", async () => {
    const { user, submit, username } = renderForm();

    await user.click(submit);

    expect(screen.getByText("Enter your username.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(username).toHaveFocus();
    expect(username).toHaveAttribute("aria-invalid", "true");
  });

  it("explains a network failure in plain words", async () => {
    server.use(http.post(apiUrl("/api/auth/login"), () => HttpResponse.error()));
    const { signIn } = renderForm();

    await signIn("demo.jane", DEMO_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can't reach the bank right now. Check your connection and try again.",
    );
  });

  it("shows the session-expired banner until the next attempt", async () => {
    const { signIn } = renderForm({ expired: true });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your session expired. Please sign in again.",
    );

    await signIn("demo.jane", "not-the-password");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Your session expired. Please sign in again.")).toBeNull();
  });

  it("lets the password be shown and hidden", async () => {
    const { user, password } = renderForm();

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });
});
