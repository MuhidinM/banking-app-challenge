import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, delay, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { Toaster } from "@/shared/ui/toast";

import { RegisterForm } from "./register-form";
import { REFRESH_TOKEN_KEY } from "./session-store";

const replace = vi.fn<(href: string) => void>();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const newUser = {
  "First name": "Abebe",
  "Last name": "Kebede",
  Username: "abebe.k",
  "Phone number": "+251 911 234 567",
  Password: "secret1",
  "Confirm password": "secret1",
};

function renderForm() {
  const user = userEvent.setup();
  render(
    <>
      <RegisterForm />
      <Toaster />
    </>,
  );
  const fill = async (values: Record<string, string>) => {
    for (const [label, value] of Object.entries(values)) {
      const field = screen.getByLabelText(label, { selector: "input" });
      await user.clear(field);
      if (value) await user.type(field, value);
    }
  };
  const submit = () => user.click(screen.getByRole("button", { name: "Register" }));
  return { user, fill, submit };
}

const field = (label: string) => screen.getByLabelText(label, { selector: "input" });

beforeEach(() => {
  replace.mockClear();
  localStorage.clear();
});

afterEach(() => {
  server.events.removeAllListeners();
});

describe("RegisterForm", () => {
  it("registers, signs in and opens the dashboard with a welcome", async () => {
    const { fill, submit } = renderForm();

    await fill(newUser);
    await submit();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeTruthy();
    expect(await screen.findByText("Welcome, Abebe. Your account is ready.")).toBeInTheDocument();
    expect(
      screen.getByText(/^Your checking account \d{4} \d{4} \d{2} was opened/),
    ).toBeInTheDocument();
  });

  it("catches invalid input before sending anything", async () => {
    const sent = vi.fn();
    server.events.on("request:start", sent);
    const { fill, submit } = renderForm();

    await fill({ ...newUser, Username: "ab", Password: "pass", "Confirm password": "pas" });
    await submit();

    expect(screen.getByText("Username must be 3 to 50 characters.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 6 characters.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(field("Username")).toHaveFocus();
    expect(sent).not.toHaveBeenCalled();
  });

  it("clears an error once it is fixed", async () => {
    const { fill, submit } = renderForm();

    await fill({ ...newUser, "First name": "" });
    await submit();
    expect(screen.getByText("Enter your first name.")).toBeInTheDocument();

    await fill({ "First name": "Abebe" });
    expect(screen.queryByText("Enter your first name.")).toBeNull();
  });

  it("shows a taken username on the username field", async () => {
    const { fill, submit, user } = renderForm();

    await fill({ ...newUser, Username: "demo.jane" });
    await submit();

    expect(await screen.findByText("This username is taken. Try another.")).toBeInTheDocument();
    expect(field("Username")).toHaveAttribute("aria-invalid", "true");
    expect(field("Username")).toHaveFocus();
    expect(replace).not.toHaveBeenCalled();

    await user.type(field("Username"), "2");
    expect(screen.queryByText("This username is taken. Try another.")).toBeNull();
  });

  it("shows a registered email on the email field", async () => {
    const { fill, submit } = renderForm();

    await fill({ ...newUser, "Email (optional)": "jane.doe@example.com" });
    await submit();

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(field("Email (optional)")).toHaveAttribute("aria-invalid", "true");
  });

  it("disables Register while sending", async () => {
    server.use(
      http.post(apiUrl("/api/auth/register"), async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const { fill, submit } = renderForm();

    await fill(newUser);
    await submit();

    const button = screen.getByRole("button", { name: "Register" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("sends to login if the account was created but signing in failed", async () => {
    server.use(http.post(apiUrl("/api/auth/login"), () => HttpResponse.error()));
    const { fill, submit } = renderForm();

    await fill(newUser);
    await submit();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(await screen.findByText("Your account is ready. Please sign in.")).toBeInTheDocument();
  });
});
