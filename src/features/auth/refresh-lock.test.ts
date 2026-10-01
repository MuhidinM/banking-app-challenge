import { afterEach, describe, expect, it, vi } from "vitest";

import { REFRESH_LOCK_NAME, createRefreshLock } from "./refresh-lock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRefreshLock", () => {
  it("runs the refresh inside the Web Locks lock and returns its result", async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
    vi.stubGlobal("navigator", { locks: { request } });

    const runExclusive = createRefreshLock()!;

    await expect(runExclusive(async () => "new-access")).resolves.toBe("new-access");
    expect(request).toHaveBeenCalledWith(REFRESH_LOCK_NAME, expect.any(Function));
  });

  it("is undefined without Web Locks, so each tab refreshes on its own", () => {
    vi.stubGlobal("navigator", {});
    expect(createRefreshLock()).toBeUndefined();
  });
});
