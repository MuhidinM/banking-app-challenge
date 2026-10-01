import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NetworkError } from "@/shared/api/api-error";

import { RouteError, RouteLoading, RouteNotFound } from "./route-states";

describe("RouteNotFound", () => {
  it("says the page doesn't exist and offers a way home", () => {
    render(<RouteNotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute("href", "/");
  });
});

describe("RouteError", () => {
  it("explains a lost connection and retries", async () => {
    const onRetry = vi.fn();
    render(<RouteError error={new NetworkError("offline")} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You're offline. Check your connection and try again.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("never shows a bug's own message", () => {
    render(
      <RouteError error={new TypeError("cannot read 'balance' of undefined")} onRetry={() => {}} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(alert).not.toHaveTextContent("balance");
  });
});

describe("RouteLoading", () => {
  it("is announced as loading", () => {
    render(<RouteLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the page");
  });
});
