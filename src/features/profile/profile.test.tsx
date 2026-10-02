import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";

import { Profile } from "./profile";

function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Profile />
    </QueryClientProvider>,
  );
}

const detail = (term: string) =>
  screen.getByText(term, { selector: "dt" }).nextElementSibling as HTMLElement;

describe("Profile", () => {
  beforeEach(async () => {
    localStorage.clear();
    await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
  });

  it("shows who is signed in", async () => {
    renderProfile();

    expect(await screen.findByRole("heading", { name: "Jane Doe" })).toBeInTheDocument();
    expect(screen.getByText("@demo.jane")).toBeInTheDocument();
    expect(detail("Email")).toHaveTextContent("jane.doe@example.com");
    expect(detail("Phone")).toHaveTextContent("+251 911 000 001");
    expect(detail("User ID")).toHaveTextContent("1");
    expect(detail("Username")).toHaveTextContent("demo.jane");
  });

  it("says when there is no email", async () => {
    await getAppSession().signIn({ username: "demo.empty", passwordHash: DEMO_PASSWORD });
    renderProfile();

    expect(await screen.findByRole("heading", { name: "Sara Tesfaye" })).toBeInTheDocument();
    expect(detail("Email")).toHaveTextContent("Not provided");
  });

  it("totals every account", async () => {
    renderProfile();

    expect(await screen.findByText("ETB 10,840.00")).toBeInTheDocument();
    expect(screen.getByText("2 accounts")).toBeInTheDocument();
  });

  it("keeps the total hidden when the user hid it on the dashboard", async () => {
    localStorage.setItem("kb-hide-balance", "1");
    renderProfile();

    expect(await screen.findByText("2 accounts")).toBeInTheDocument();
    expect(screen.queryByText("ETB 10,840.00")).not.toBeInTheDocument();
    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("offers the theme switch", async () => {
    renderProfile();

    const theme = screen.getByRole("group", { name: "Theme" });
    expect(within(theme).getByRole("radio", { name: "System" })).toBeChecked();
  });

  it("shows Change password as not available, not as a control", async () => {
    renderProfile();

    expect(screen.getByText("Change password")).toBeInTheDocument();
    expect(screen.getByText("Not available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Change password/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Change password/ })).not.toBeInTheDocument();
  });

  it("logs out", async () => {
    renderProfile();
    await screen.findByText("Signed in as demo.jane");

    await userEvent.click(screen.getByRole("button", { name: /Log out/ }));

    expect(getAppSession().store.getSnapshot()).toEqual({
      status: "anonymous",
      endedBecause: "signed-out",
    });
  });

  it("offers a retry when the profile can't load", async () => {
    server.use(
      http.get(apiUrl("/api/users/me"), () =>
        HttpResponse.json({ code: "GEN_001", status: 500 }, { status: 500 }),
      ),
    );
    renderProfile();

    expect(await screen.findByText("We couldn't load your profile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
