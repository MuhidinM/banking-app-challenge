import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RadioCards } from "./radio-cards";

function AccountType({ error }: { error?: string }) {
  const [value, setValue] = useState("SAVINGS");
  return (
    <RadioCards
      label="Account type"
      value={value}
      onValueChange={setValue}
      error={error}
      options={[
        { value: "SAVINGS", label: "Savings", description: "Set money aside and earn interest." },
        { value: "CHECKING", label: "Checking", description: "Everyday spending and transfers." },
        {
          value: "MONEY_MARKET",
          label: "Money market",
          description: "Higher interest, limited withdrawals.",
        },
      ]}
    />
  );
}

describe("RadioCards", () => {
  it("is a group of radios named by its label, with one option checked", () => {
    render(<AccountType />);
    expect(screen.getByRole("group", { name: "Account type" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Savings/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Checking/ })).not.toBeChecked();
  });

  it("changes the choice on click", async () => {
    render(<AccountType />);
    await userEvent.click(screen.getByRole("radio", { name: /Money market/ }));
    expect(screen.getByRole("radio", { name: /Money market/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Savings/ })).not.toBeChecked();
  });

  it("moves between options with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<AccountType />);
    await user.tab();
    expect(screen.getByRole("radio", { name: /Savings/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Checking/ })).toBeChecked();
  });

  it("is described by its error", () => {
    render(<AccountType error="Choose an account type." />);
    expect(screen.getByRole("group", { name: "Account type" })).toHaveAccessibleDescription(
      "Choose an account type.",
    );
  });
});
