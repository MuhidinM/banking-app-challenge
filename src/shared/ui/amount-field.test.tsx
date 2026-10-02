import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AmountField, groupAmountInput, sanitizeAmountInput } from "./amount-field";

describe("sanitizeAmountInput", () => {
  it.each([
    ["250", "250"],
    ["250.5", "250.5"],
    ["250.555", "250.55"],
    ["1,250.00", "1250.00"],
    ["-50", "50"],
    ["12a3", "123"],
    ["1.2.3", "1.23"],
    [" 7 ", "7"],
    [".5", ".5"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(sanitizeAmountInput(input)).toBe(expected);
  });
});

describe("groupAmountInput", () => {
  it.each([
    ["", ""],
    ["5", "5"],
    ["1250", "1,250"],
    ["1250.5", "1,250.5"],
    ["1000000", "1,000,000"],
    ["1234567.89", "1,234,567.89"],
    ["007", "7"],
    ["0", "0"],
    ["0.5", "0.5"],
    [".5", ".5"],
    ["1000.", "1,000."],
  ])("%j → %j", (input, expected) => {
    expect(groupAmountInput(input)).toBe(expected);
  });
});

function ControlledAmount({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <AmountField
      label="Amount"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("AmountField", () => {
  it("includes the currency in its accessible name and asks for a decimal keyboard", () => {
    render(<AmountField label="Amount" value="" onChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Amount in ETB" });
    expect(input).toHaveAttribute("inputmode", "decimal");
  });

  it("only accepts a positive amount with up to two decimals", async () => {
    render(<ControlledAmount />);
    const input = screen.getByRole("textbox", { name: "Amount in ETB" });
    await userEvent.type(input, "-1a2.345");
    expect(input).toHaveValue("12.34");
  });

  it("adds thousands separators as the amount is typed", async () => {
    render(<ControlledAmount />);
    const input = screen.getByRole("textbox", { name: "Amount in ETB" });
    await userEvent.type(input, "1234567.8");
    expect(input).toHaveValue("1,234,567.8");
  });

  it("keeps the caret in place when a comma comes or goes", async () => {
    render(<ControlledAmount />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Amount in ETB" });
    await userEvent.type(input, "125000");
    expect(input).toHaveValue("125,000");
    // Caret after "12", type 3: "1,235,000" with the caret after "1,23", not at the end.
    input.setSelectionRange(2, 2);
    await userEvent.type(input, "3", { initialSelectionStart: 2, initialSelectionEnd: 2 });
    expect(input).toHaveValue("1,235,000");
    expect(input.selectionStart).toBe(4);
  });

  it("runs a quick-amount chip's action", async () => {
    const onSelect = vi.fn();
    render(
      <AmountField
        label="Amount"
        value="250"
        onChange={() => {}}
        quickAmounts={[
          { label: "+100", onSelect },
          { label: "Max", onSelect: () => {} },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "+100" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Max" })).toHaveAttribute("type", "button");
  });

  it("shows and announces an error", () => {
    render(
      <AmountField
        label="Amount"
        value="9000"
        onChange={() => {}}
        error="Insufficient funds. Available: ETB 8,640.00"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Amount in ETB" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Insufficient funds. Available: ETB 8,640.00");
  });
});
