import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/shared/ui/button";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as the page's focusable h1, with description and actions", () => {
    render(
      <PageHeader
        title="Transfer"
        description="Send money to any Kifiya Bank account."
        actions={<Button>Pay bill</Button>}
      />,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Transfer" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Send money to any Kifiya Bank account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay bill" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("adds a labelled back button when given one", () => {
    render(
      <PageHeader title="Activity" back={{ href: "/accounts/12", label: "Back to Checking" }} />,
    );

    expect(screen.getByRole("link", { name: "Back to Checking" })).toHaveAttribute(
      "href",
      "/accounts/12",
    );
  });
});
