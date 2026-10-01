import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";

import { SessionInspector } from "./session-inspector";

async function openInspector() {
  const user = userEvent.setup();
  render(<SessionInspector />);
  await user.click(screen.getByRole("button", { name: "Session" }));
  const panel = screen.getByRole("region", { name: "Session inspector" });
  const press = (name: string) => user.click(within(panel).getByRole("button", { name }));
  const result = () => within(panel).getByText(/call|expired/i, { selector: "p" });
  return { panel, press, result };
}

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("SessionInspector", () => {
  it("shows the session and both token countdowns", async () => {
    const { panel } = await openInspector();

    expect(within(panel).getByText("authenticated")).toBeInTheDocument();
    // The mock's tokens last 10 minutes and 24 hours.
    expect(within(panel).getByText(/^(10:00|9:5\d)$/)).toBeInTheDocument();
    expect(within(panel).getByText(/^(24:00:00|23:59:5\d)$/)).toBeInTheDocument();
  });

  it("after expiring the access token, the next call refreshes exactly once", async () => {
    const { press, result } = await openInspector();

    await press("Expire access token now");
    await press("Call the API");

    await vi.waitFor(() =>
      expect(result()).toHaveTextContent("1 call, 1 refresh. Signed in as demo.jane."),
    );
  });

  it("three calls at once share one refresh", async () => {
    const { press, result } = await openInspector();

    await press("Expire access token now");
    await press("3 calls at once");

    await vi.waitFor(() =>
      expect(result()).toHaveTextContent("3 calls, 1 refresh. Signed in as demo.jane."),
    );
  });

  it("a call with a valid token needs no refresh", async () => {
    const { press, result } = await openInspector();

    await press("Call the API");

    await vi.waitFor(() => expect(result()).toHaveTextContent("1 call, 0 refreshes."));
  });

  it("expiring the refresh token too ends the session on the next call", async () => {
    const { press, panel } = await openInspector();

    await press("Expire refresh token too");
    await press("Call the API");

    await vi.waitFor(() =>
      expect(getAppSession().store.getSnapshot()).toEqual({
        status: "anonymous",
        endedBecause: "expired",
      }),
    );
    expect(within(panel).getByText("anonymous (expired)")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Call the API" })).toBeDisabled();
  });
});
