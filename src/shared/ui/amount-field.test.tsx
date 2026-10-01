import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AmountField, sanitizeAmountInput } from "./amount-field";

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
