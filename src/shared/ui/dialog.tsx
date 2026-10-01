"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import type { ReactNode } from "react";

interface DialogProps {
  /** Heading of the dialog; also its accessible name. */
  title: ReactNode;
  /** Read with the title by screen readers. Visually hidden unless `showDescription`. */
  description?: ReactNode;
  showDescription?: boolean;
  /** Element that opens the dialog, e.g. a Button. Optional when `open` is controlled. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pinned under the content, e.g. "Confirm and send" and "Edit details". */
  footer?: ReactNode;
  /**
   * Where focus goes on close. By default it returns to `trigger`; a dialog
   * opened another way (a list row, the URL) can call `event.preventDefault()`
   * and focus the right element itself.
   */
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
  className?: string;
}

/**
 * A modal dialog that is a centred card on desktop and a bottom sheet below
 * 768px (UI spec: "Transaction detail (modal)" on web, "Transaction detail
 * sheet" on mobile). One component and one DOM; only CSS changes, so there is
 * nothing to hydrate differently.
 *
 * Radix provides the dialog role and name, focus trapping, focus return to the
 * trigger, Escape and outside-click to close, and hiding the page behind it
 * from screen readers.
 */
export function Dialog({
  title,
  description,
  showDescription = false,
  trigger,
  open,
  onOpenChange,
  footer,
  onCloseAutoFocus,
  children,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-ink/45",
            "data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in motion-reduce:animate-none",
          )}
        />
        <DialogPrimitive.Content
          // Without a description Radix warns unless aria-describedby is explicitly undefined.
          {...(description ? {} : { "aria-describedby": undefined })}
          {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
          className={cn(
            "fixed z-50 flex flex-col gap-5 bg-surface text-ink shadow-float outline-none",
            // Mobile: bottom sheet.
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[1.25rem] px-page pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
            // Desktop: centred card.
            "md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[85dvh] md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2",
            "md:rounded-card md:p-6",
            "md:data-[state=closed]:animate-dialog-out md:data-[state=open]:animate-dialog-in",
            "motion-reduce:animate-none md:motion-reduce:animate-none",
            className,
          )}
        >
          {/* Sheet grab handle (decorative; the sheet closes with the button, Escape or the backdrop). */}
          <span
            aria-hidden="true"
            className="mx-auto h-1 w-10 shrink-0 rounded-pill bg-border md:hidden"
          />

          <div className="flex items-center justify-between gap-4">
            <DialogPrimitive.Title className="type-heading text-ink">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-ink transition-colors hover:bg-border"
            >
              <X aria-hidden="true" className="size-icon" strokeWidth={1.75} />
            </DialogPrimitive.Close>
          </div>

          {description && (
            <DialogPrimitive.Description
              className={showDescription ? "-mt-3 type-body text-ink-muted" : "sr-only"}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          <div className="-mx-1 min-h-0 overflow-y-auto px-1">{children}</div>

          {footer && <div className="flex flex-col gap-2">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Closes the surrounding Dialog; wrap a button, e.g. "Edit details". */
export const DialogClose = DialogPrimitive.Close;
