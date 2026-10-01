import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedirectWhenSignedIn } from "./redirect-when-signed-in";
import { RequireSession } from "./require-session";

import type { SessionState } from "./session-store";

const replace = vi.fn<(href: string) => void>();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

let session: SessionState = { status: "unknown", endedBecause: null };
vi.mock("./use-session", () => ({ useSession: () => session }));

const page = <RequireSession>Your accounts</RequireSession>;

beforeEach(() => {
  replace.mockClear();
  window.history.replaceState(null, "", "/accounts/12?tx=117");
});

describe("RequireSession", () => {
  it("shows the page with a session", () => {
    session = { status: "authenticated", endedBecause: null };
    render(page);
    expect(screen.getByText("Your accounts")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows only a loading state while the session is being restored", () => {
    session = { status: "unknown", endedBecause: null };
    render(page);
    expect(screen.queryByText("Your accounts")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to login with the way back", () => {
    session = { status: "anonymous", endedBecause: null };
    render(page);
    expect(screen.queryByText("Your accounts")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/login?next=%2Faccounts%2F12%3Ftx%3D117");
  });

  it("sends an expired session to login with the banner and the way back", () => {
    session = { status: "anonymous", endedBecause: "expired" };
    render(page);
    expect(replace).toHaveBeenCalledWith("/login?next=%2Faccounts%2F12%3Ftx%3D117&reason=expired");
  });

  it("sends a user who signed out to a plain login page", () => {
    session = { status: "anonymous", endedBecause: "signed-out" };
    render(page);
    expect(replace).toHaveBeenCalledWith("/login");
  });
});

describe("RedirectWhenSignedIn", () => {
  it("sends a signed-in user on", () => {
    session = { status: "authenticated", endedBecause: null };
    render(<RedirectWhenSignedIn to="/transfer" />);
    expect(replace).toHaveBeenCalledWith("/transfer");
  });

  it.each(["unknown", "anonymous"] as const)("stays put while %s", (status) => {
    session = { status, endedBecause: null };
    render(<RedirectWhenSignedIn to="/" />);
    expect(replace).not.toHaveBeenCalled();
  });
});
