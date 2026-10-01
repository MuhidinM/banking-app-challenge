import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { User } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { PasswordField, TextField } from "./text-field";

describe("TextField", () => {
  it("is labelled, so it can be found and announced by its label", () => {
    render(<TextField label="Username" icon={User} placeholder="demo.jane" />);
    expect(screen.getByRole("textbox", { name: "Username" })).toBeInTheDocument();
  });

  it("is described by its hint", () => {
    render(
      <TextField label="To account number" hint="Kifiya Bank account numbers have 10 digits." />,
    );
    expect(screen.getByRole("textbox", { name: "To account number" })).toHaveAccessibleDescription(
      "Kifiya Bank account numbers have 10 digits.",
    );
  });

  it("shows an error instead of the hint, marks the input invalid and announces it", () => {
    render(
      <TextField
        label="Username"
        hint="Letters, numbers and dots."
        error="This username is taken. Try another."
      />,
    );
    const input = screen.getByRole("textbox", { name: "Username" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("This username is taken. Try another.");
    expect(screen.queryByText("Letters, numbers and dots.")).not.toBeInTheDocument();
    // Inside a polite live region, so it is read out when it appears.
    expect(
      screen.getByText("This username is taken. Try another.").closest("[aria-live]"),
    ).toHaveAttribute("aria-live", "polite");
  });

  it("is not invalid without an error", () => {
    render(<TextField label="First name" />);
    expect(screen.getByRole("textbox", { name: "First name" })).not.toHaveAttribute("aria-invalid");
  });

  it("passes input props through, as react-hook-form's register() needs", async () => {
    const onChange = vi.fn();
    render(<TextField label="Email (optional)" name="email" type="email" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Email (optional)" });
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("type", "email");
    await userEvent.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("can be disabled", () => {
    render(<TextField label="Account" disabled defaultValue="Not editable" />);
    expect(screen.getByRole("textbox", { name: "Account" })).toBeDisabled();
  });
});

describe("PasswordField", () => {
  it("hides the password until the user asks to show it", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" defaultValue="Password123!" />);
    const input = screen.getByLabelText("Password", { selector: "input" });
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("keeps the show/hide button out of form submission", () => {
    render(<PasswordField label="Password" />);
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("type", "button");
  });
});
