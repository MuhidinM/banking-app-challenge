import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScrollText } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { Badge, InlineMessage } from "./feedback";
import { FilterPills } from "./filter-pills";
import { ListRowSkeleton, LoadingRegion } from "./skeleton";
import { EmptyState, ErrorState } from "./states";

describe("LoadingRegion and skeletons", () => {
  it("announces what is loading while the skeletons stay silent", () => {
    render(
      <LoadingRegion label="Loading your accounts">
        <ul>
          <ListRowSkeleton />
          <ListRowSkeleton />
        </ul>
      </LoadingRegion>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading your accounts");
    // Skeleton rows are hidden from assistive technology entirely.
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});

describe("EmptyState", () => {
  it("says what is missing and offers the next step", () => {
    render(
      <EmptyState
        icon={ScrollText}
        title="No accounts yet"
        description="Open an account to start saving."
        action={<Button>Open an account</Button>}
      />,
    );
    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
    expect(screen.getByText("Open an account to start saving.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open an account" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("is announced, uses friendly default copy, and retries", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the retry as busy while retrying", () => {
    render(<ErrorState onRetry={() => {}} retrying />);
    expect(screen.getByRole("button", { name: "Try again" })).toHaveAttribute("aria-busy", "true");
  });

  it("has no retry button when there is nothing to retry", () => {
    render(<ErrorState title="Account not found" description="Check the link and try again." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("InlineMessage", () => {
  it("is a status for polite announcements and an alert for assertive ones", () => {
    const { rerender } = render(
      <InlineMessage announce="polite">Your session expired.</InlineMessage>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Your session expired.");
    rerender(
      <InlineMessage tone="error" announce="assertive">
        Can&apos;t reach the bank right now.
      </InlineMessage>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the bank right now.");
  });

  it("isn't a live region when present from the start, like the transfer warning", () => {
    render(
      <InlineMessage tone="warning">Transfers are instant and cannot be reversed.</InlineMessage>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("shows its label", () => {
    render(<Badge tone="credit">Money in</Badge>);
    expect(screen.getByText("Money in")).toBeInTheDocument();
  });
});

describe("FilterPills", () => {
  const options = [
    { value: "ALL", label: "All" },
    { value: "CREDIT", label: "Money in" },
    { value: "DEBIT", label: "Money out" },
  ] as const;

  it("is a named group of options with the current one checked", () => {
    render(
      <FilterPills label="Show" options={[...options]} value="ALL" onValueChange={() => {}} />,
    );
    expect(screen.getByRole("group", { name: "Show" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All" })).toBeChecked();
  });

  it("reports the chosen value, by click or arrow key", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FilterPills label="Show" options={[...options]} value="ALL" onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole("radio", { name: "Money out" }));
    expect(onValueChange).toHaveBeenLastCalledWith("DEBIT");

    screen.getByRole("radio", { name: "All" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith("CREDIT");
  });
});
