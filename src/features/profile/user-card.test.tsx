import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";

import { initials } from "./initials";
import { UserCard } from "./user-card";

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UserCard />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("UserCard", () => {
  it("shows the signed-in user's initials, name and username", async () => {
    renderCard();

    expect(screen.getByRole("status", { name: "Loading your profile" })).toBeInTheDocument();
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("demo.jane")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("logs out", async () => {
    renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(getAppSession().store.getSnapshot()).toEqual({
      status: "anonymous",
      endedBecause: "signed-out",
    });
  });
});

describe("initials", () => {
  it.each([
    ["Jane", "Doe", "JD"],
    [" abebe ", "kebede", "AK"],
    ["Ünal", "Öz", "ÜÖ"],
  ])("%s %s → %s", (first, last, expected) => {
    expect(initials(first, last)).toBe(expected);
  });
});
