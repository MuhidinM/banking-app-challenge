import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { getQueryClient } from "@/shared/api/query-client";
import { Toaster, toast } from "@/shared/ui/toast";

import { LogoutButton } from "./logout-button";
import { getAppSession } from "./session";

describe("LogoutButton", () => {
  it("ends the session and drops the cached data and toasts", async () => {
    const session = getAppSession();
    await session.signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
    getQueryClient().setQueryData(["accounts"], [{ accountNumber: "8751138057" }]);
    render(
      <>
        <LogoutButton />
        <Toaster />
      </>,
    );
    toast({ title: "Sent ETB 250.00 to 2899010846." });
    expect(await screen.findByText("Sent ETB 250.00 to 2899010846.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(session.store.getSnapshot()).toEqual({
      status: "anonymous",
      endedBecause: "signed-out",
    });
    expect(getQueryClient().getQueryData(["accounts"])).toBeUndefined();
    expect(getQueryClient().getQueryCache().getAll()).toHaveLength(0);
    await vi.waitFor(() => expect(screen.queryByText("Sent ETB 250.00 to 2899010846.")).toBeNull());
  });
});
