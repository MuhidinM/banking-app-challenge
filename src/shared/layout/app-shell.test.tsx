import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";
import { PageHeader } from "./page-header";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

// jsdom ignores the md: classes, so both navigations are in the document: the
// sidebar (<aside>) and the bottom nav.
const sidebar = () => within(screen.getByRole("complementary"));
const bottomNav = () => {
  const [, bottom] = screen.getAllByRole("navigation", { name: "Main" });
  return within(bottom!);
};

beforeEach(() => {
  pathname = "/";
});

describe("AppShell", () => {
  it("links every section from both navigations", () => {
    render(<AppShell>Page</AppShell>);
    for (const nav of [sidebar(), bottomNav()]) {
      for (const [name, href] of [
        ["Home", "/"],
        ["Accounts", "/accounts"],
        ["Activity", "/activity"],
        ["Transfer", "/transfer"],
        ["Profile", "/profile"],
      ] as const) {
        expect(nav.getByRole("link", { name })).toHaveAttribute("href", href);
      }
    }
  });

  it("marks the current section, including its sub-pages", () => {
    pathname = "/accounts/12";
    render(<AppShell>Page</AppShell>);

    for (const nav of [sidebar(), bottomNav()]) {
      expect(nav.getByRole("link", { name: "Accounts" })).toHaveAttribute("aria-current", "page");
      expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    }
  });

  it("puts the page in the main landmark and the footer in the sidebar", () => {
    render(<AppShell sidebarFooter={<p>Jane Doe</p>}>Your accounts</AppShell>);

    expect(screen.getByRole("main")).toHaveTextContent("Your accounts");
    expect(sidebar().getByText("Jane Doe")).toBeInTheDocument();
    expect(sidebar().getByRole("link", { name: "Kifiya, home" })).toHaveAttribute("href", "/");
  });
});

describe("AppShell keyboard support", () => {
  it("reaches the skip link first, and it points at the main region", async () => {
    render(<AppShell>Page</AppShell>);

    await userEvent.tab();

    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveFocus();
    const target = document.querySelector(skip.getAttribute("href")!);
    expect(target).toBe(screen.getByRole("main"));
  });

  it("moves focus to the new page's heading after a navigation, not on first load", () => {
    const page = (title: string) => (
      <AppShell>
        <PageHeader title={title} />
      </AppShell>
    );
    pathname = "/";
    const { rerender } = render(page("Kifiya Banking"));
    expect(document.body).toHaveFocus();

    pathname = "/accounts";
    rerender(page("Accounts"));

    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toHaveFocus();
  });

  it("moves focus to a heading that appears after the data loads", async () => {
    const page = (title: string | null) => (
      <AppShell>{title ? <PageHeader title={title} /> : <p>Loading the receipt</p>}</AppShell>
    );
    pathname = "/transfer";
    const { rerender } = render(page("Transfer"));

    pathname = "/transfer/receipt/1";
    rerender(page(null));
    expect(screen.getByRole("main")).toHaveFocus();

    rerender(page("Transfer sent"));
    await vi.waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Transfer sent" })).toHaveFocus(),
    );
  });

  it("leaves focus alone if the user moved it before the heading appeared", async () => {
    const page = (title: string | null) => (
      <AppShell>
        <button type="button">Elsewhere</button>
        {title ? <PageHeader title={title} /> : null}
      </AppShell>
    );
    pathname = "/";
    const { rerender } = render(page("Home"));

    pathname = "/accounts/1";
    rerender(page(null));
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    rerender(page("Checking"));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("falls back to the main region when the page has no heading", () => {
    pathname = "/";
    const { rerender } = render(<AppShell>Home</AppShell>);

    pathname = "/activity";
    rerender(<AppShell>Activity</AppShell>);

    expect(screen.getByRole("main")).toHaveFocus();
  });
});
