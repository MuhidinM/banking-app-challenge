import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Landmark, RotateCcw } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Card, SectionHeader } from "./card";
import { ListRow, RowList } from "./list-row";

describe("ListRow", () => {
  it("reads as one sentence when given a label, hiding the visible pieces", () => {
    render(
      <RowList>
        <ListRow
          icon={RotateCcw}
          title="Refund from merchant"
          meta="Refund · 15:18"
          value="+ETB 1,665.00"
          label="Refund from merchant, money in, ETB 1,665.00."
          onClick={() => {}}
        />
      </RowList>,
    );
    expect(
      screen.getByRole("button", { name: "Refund from merchant, money in, ETB 1,665.00." }),
    ).toBeInTheDocument();
  });

  it("is a link to the account when given an href, named by its whole content", () => {
    render(
      <RowList>
        <ListRow
          icon={Landmark}
          tone="primary"
          title="Checking"
          meta="•••• 8057"
          value="ETB 8,640.00"
          valueMeta="Available"
          href="/accounts/1"
        />
      </RowList>,
    );
    const link = screen.getByRole("link", { name: /Checking.*8057.*ETB 8,640\.00.*Available/ });
    expect(link).toHaveAttribute("href", "/accounts/1");
    // Disc icon and chevron are decorative.
    link
      .querySelectorAll("svg")
      .forEach((svg) => expect(svg).toHaveAttribute("aria-hidden", "true"));
  });

  it("is a button when given onClick, e.g. to open transaction details", async () => {
    const onClick = vi.fn();
    render(
      <RowList>
        <ListRow
          icon={RotateCcw}
          tone="credit"
          title="Refund from merchant"
          meta="Refund · 15:18"
          value="+ETB 1,665.00"
          valueClassName="text-credit"
          onClick={onClick}
        />
      </RowList>,
    );
    const button = screen.getByRole("button", { name: /Refund from merchant/ });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("+ETB 1,665.00")).toHaveClass("text-credit");
  });

  it("is plain content without href or onClick", () => {
    render(
      <RowList>
        <ListRow icon={Landmark} title="Checking" />
      </RowList>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders rows as a list, so screen readers say how many there are", () => {
    render(
      <RowList aria-label="My accounts">
        <ListRow icon={Landmark} title="Checking" />
        <ListRow icon={Landmark} title="Savings" />
      </RowList>,
    );
    const list = screen.getByRole("list", { name: "My accounts" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("SectionHeader", () => {
  it("is a heading at the given level with an optional link", () => {
    render(
      <Card>
        <SectionHeader
          as="h3"
          title="Recent activity"
          action={{ label: "View all", href: "/activity" }}
        />
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Recent activity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/activity");
  });
});
