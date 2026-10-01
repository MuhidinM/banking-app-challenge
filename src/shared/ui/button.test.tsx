import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrowLeftRight } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("is a plain button by default, so it never submits a form by accident", () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "button");
  });

  it("submits when asked to", () => {
    render(<Button type="submit">Login</Button>);
    expect(screen.getByRole("button", { name: "Login" })).toHaveAttribute("type", "submit");
  });

  it("runs onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Pay bill</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Pay bill" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("while loading: disabled, busy, keeps its label, and ignores clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Confirm and send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Confirm and send" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the icon decorative so the name is just the label", () => {
    render(<Button icon={ArrowLeftRight}>Transfer</Button>);
    const button = screen.getByRole("button", { name: "Transfer" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a link with button styles when used asChild", () => {
    render(
      <Button asChild variant="outline">
        <a href="/accounts/new">New account</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "New account" });
    expect(link).toHaveAttribute("href", "/accounts/new");
    expect(link).toHaveClass("h-button", "rounded-button");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets a className override the variant's classes", () => {
    render(<Button className="w-full px-0">Wide</Button>);
    const button = screen.getByRole("button", { name: "Wide" });
    expect(button).toHaveClass("px-0", "w-full");
    expect(button).not.toHaveClass("px-5");
  });
});
