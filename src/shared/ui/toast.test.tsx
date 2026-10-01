import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Toaster, clearToasts, toast } from "./toast";

afterEach(() => {
  act(() => clearToasts());
});

describe("toast", () => {
  it("shows a toast inside the notification region", () => {
    render(<Toaster />);
    act(() => {
      toast({ title: "Sent ETB 250.00 to 2899010846." });
    });
    expect(screen.getByRole("region", { name: /Notification/ })).toBeInTheDocument();
    expect(screen.getAllByText("Sent ETB 250.00 to 2899010846.").length).toBeGreaterThan(0);
  });

  // Radix copies each toast's text, prefixed with the provider label, into a
  // separate visually hidden live region a frame after it appears.
  const announcement = (politeness: "polite" | "assertive") =>
    document.querySelector(`[aria-live="${politeness}"]`)?.textContent ?? "";

  it("is announced to screen readers", async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: "Account opened." });
    });
    await waitFor(() => expect(announcement("polite")).toBe("Notification Account opened."));
  });

  it("announces errors assertively and other toasts politely", async () => {
    render(<Toaster />);
    act(() => {
      toast({ tone: "error", title: "Can't reach the bank right now." });
    });
    await waitFor(() =>
      expect(announcement("assertive")).toBe("Notification Can't reach the bank right now."),
    );
    expect(announcement("polite")).not.toContain("Can't reach the bank");
  });

  it("can be dismissed", async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      toast({ title: "Bill paid.", description: "Ethio Telecom · ETB 75.00" });
    });
    expect(screen.getAllByText("Ethio Telecom · ETB 75.00").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Bill paid.")).not.toBeInTheDocument());
  });
});
