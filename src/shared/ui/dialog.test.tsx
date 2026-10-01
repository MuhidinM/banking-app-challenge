import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { Dialog, DialogClose } from "./dialog";

function ReviewTransfer({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  return (
    <>
      <Button variant="outline">Something before</Button>
      <Dialog
        title="Review transfer"
        description="Check the details before sending."
        trigger={<Button>Continue</Button>}
        footer={
          <>
            <Button onClick={onConfirm}>Confirm and send</Button>
            <DialogClose asChild>
              <Button variant="ghost">Edit details</Button>
            </DialogClose>
          </>
        }
      >
        <p>ETB 250.00 to 2899010846</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens from its trigger as a dialog named by its title and described", async () => {
    const user = userEvent.setup();
    render(<ReviewTransfer />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    const dialog = screen.getByRole("dialog", { name: "Review transfer" });
    expect(dialog).toHaveAccessibleDescription("Check the details before sending.");
    expect(dialog).toHaveTextContent("ETB 250.00 to 2899010846");
  });

  it("moves focus inside and keeps it there", async () => {
    const user = userEvent.setup();
    render(<ReviewTransfer />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    // Tabbing past the last control wraps around inside the dialog.
    for (let i = 0; i < 5; i += 1) await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("hides the page behind it from assistive technology", async () => {
    const user = userEvent.setup();
    render(<ReviewTransfer />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    // Outside elements are no longer exposed; only the dialog's content is.
    expect(screen.queryByRole("button", { name: "Something before" })).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ReviewTransfer />);
    const trigger = screen.getByRole("button", { name: "Continue" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes with the Close button and with a DialogClose action", async () => {
    const user = userEvent.setup();
    render(<ReviewTransfer />);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Edit details" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("runs footer actions", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ReviewTransfer onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Confirm and send" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("can be controlled, e.g. opened from a row click", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Refund from merchant
          </button>
          <Dialog title="Transaction" open={open} onOpenChange={setOpen}>
            <p>TX-000117</p>
          </Dialog>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Refund from merchant" }));
    expect(screen.getByRole("dialog", { name: "Transaction" })).toHaveTextContent("TX-000117");
  });
});
