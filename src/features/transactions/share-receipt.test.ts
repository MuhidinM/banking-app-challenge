import { afterEach, describe, expect, it, vi } from "vitest";

import { shareReceipt } from "./share-receipt";

function stubNavigator(fields: Partial<Navigator>) {
  for (const [key, value] of Object.entries(fields)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("shareReceipt", () => {
  it("uses the share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });

    expect(await shareReceipt("Receipt", "TX-000001")).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Receipt", text: "TX-000001" });
  });

  it("treats closing the share sheet as done, not as a failure", async () => {
    stubNavigator({ share: vi.fn().mockRejectedValue(new DOMException("", "AbortError")) });

    expect(await shareReceipt("Receipt", "TX-000001")).toBe("shared");
  });

  it("copies to the clipboard when sharing isn't possible", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(new DOMException("", "NotAllowedError")),
      clipboard: { writeText } as unknown as Clipboard,
    });

    expect(await shareReceipt("Receipt", "TX-000001")).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("TX-000001");
  });

  it("reports a failure when the clipboard refuses too", async () => {
    stubNavigator({
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      } as unknown as Clipboard,
    });

    expect(await shareReceipt("Receipt", "TX-000001")).toBe("failed");
  });
});
