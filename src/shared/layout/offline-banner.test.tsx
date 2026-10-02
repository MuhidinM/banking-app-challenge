import { onlineManager } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Toaster, clearToasts } from "@/shared/ui/toast";

import { OfflineBanner } from "./offline-banner";

afterEach(() =>
  act(() => {
    onlineManager.setOnline(true);
    clearToasts();
  }),
);

describe("OfflineBanner", () => {
  it("shows nothing while online", () => {
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("says so in the status region when the connection drops", () => {
    render(<OfflineBanner />);
    act(() => onlineManager.setOnline(false));
    expect(screen.getByRole("status")).toHaveTextContent(/^You're offline\./);
  });

  it("goes away and says the app is back online when the connection returns", async () => {
    render(
      <>
        <OfflineBanner />
        <Toaster />
      </>,
    );
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    expect(screen.queryByText(/^You're offline\./)).toBeNull();
    // Radix copies a toast's text into its own live region too.
    expect((await screen.findAllByText("You're back online.")).length).toBeGreaterThan(0);
  });
});
