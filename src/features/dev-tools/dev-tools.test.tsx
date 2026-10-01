import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ devTools: false }));
vi.mock("@/shared/config/env", () => ({
  env: {
    apiBaseUrl: "https://api.test",
    apiMocking: false,
    get devTools() {
      return flags.devTools;
    },
  },
}));

const { DevTools } = await import("./dev-tools");

describe("DevTools", () => {
  it("renders nothing unless NEXT_PUBLIC_DEV_TOOLS is on", () => {
    flags.devTools = false;
    const { container } = render(<DevTools />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the session inspector when it is on", async () => {
    flags.devTools = true;
    render(<DevTools />);
    // The inspector is lazy-loaded; its first import can take over findBy's
    // default second on a busy machine, which made this test flaky.
    expect(
      await screen.findByRole("button", { name: "Session" }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });
});
