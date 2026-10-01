import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Landmark } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SelectField, type SelectOption } from "./select-field";

const accounts: SelectOption[] = [
  {
    value: "1",
    label: "Checking · •••• 8057",
    description: "Available ETB 8,640.00",
    icon: Landmark,
  },
  { value: "2", label: "Savings · •••• 8911", description: "Available ETB 2,200.00" },
];

function AccountSelect({
  onValueChange,
  error,
}: {
  onValueChange?: (v: string) => void;
  error?: string;
}) {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <SelectField
      label="From"
      placeholder="Choose an account"
      options={accounts}
      value={value}
      error={error}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    />
  );
}

describe("SelectField", () => {
  it("is a combobox named by its label, showing the placeholder until a choice is made", () => {
    render(<AccountSelect />);
    const select = screen.getByRole("combobox", { name: "From" });
    expect(select).toHaveTextContent("Choose an account");
  });

  it("can be used with the keyboard alone", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<AccountSelect onValueChange={onValueChange} />);

    await user.tab();
    expect(screen.getByRole("combobox", { name: "From" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("2");
    expect(screen.getByRole("combobox", { name: "From" })).toHaveTextContent("Savings · •••• 8911");
  });

  it("shows the selected option's second line, like the spec's account picker", async () => {
    const user = userEvent.setup();
    render(<AccountSelect />);
    await user.click(screen.getByRole("combobox", { name: "From" }));
    await user.click(await screen.findByRole("option", { name: /Checking/ }));
    expect(screen.getByRole("combobox", { name: "From" })).toHaveTextContent(
      "Available ETB 8,640.00",
    );
  });

  it("marks itself invalid and is described by the error", () => {
    render(<AccountSelect error="Choose the account to pay from." />);
    const select = screen.getByRole("combobox", { name: "From" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Choose the account to pay from.");
  });
});
