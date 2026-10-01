// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createSessionChannel } from "./session-channel";

// Two channels with the same name stand in for two tabs.
describe("session channel", () => {
  it("delivers a logout to the other tabs, not to the sender", async () => {
    const thisTab = createSessionChannel()!;
    const otherTab = createSessionChannel()!;
    const heardHere = vi.fn();
    const heardThere = vi.fn();
    thisTab.subscribe(heardHere);
    otherTab.subscribe(heardThere);

    thisTab.post({ type: "signed-out" });

    await vi.waitFor(() => expect(heardThere).toHaveBeenCalledWith({ type: "signed-out" }));
    expect(heardHere).not.toHaveBeenCalled();
  });

  it("ignores messages it doesn't know", async () => {
    const listener = vi.fn();
    createSessionChannel()!.subscribe(listener);
    const stranger = new BroadcastChannel("kb-session");

    stranger.postMessage({ type: "something-else" });
    stranger.postMessage("signed-out");
    createSessionChannel()!.post({ type: "signed-out" });

    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    stranger.close();
  });

  it("stops listening when unsubscribed", async () => {
    const listener = vi.fn();
    const control = vi.fn();
    const tab = createSessionChannel()!;
    tab.subscribe(listener)();
    tab.subscribe(control);

    createSessionChannel()!.post({ type: "signed-out" });

    await vi.waitFor(() => expect(control).toHaveBeenCalled());
    expect(listener).not.toHaveBeenCalled();
  });
});
