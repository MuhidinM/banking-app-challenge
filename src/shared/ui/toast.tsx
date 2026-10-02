"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { CircleAlert, CircleCheck, Info, type LucideIcon, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/shared/lib/cn";

export type ToastTone = "success" | "info" | "error";

export interface ToastInput {
  /** Short and already in user-facing words, e.g. "Sent ETB 250.00 to 2899010846." */
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends Required<Pick<ToastInput, "title" | "tone">> {
  id: number;
  description: string | undefined;
  open: boolean;
}

// A tiny store outside React, so any component (or a mutation's onSuccess) can
// call toast() without a context. Only ever used in the browser.
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Shows a toast. Returns its id, for `dismissToast`. */
export function toast({ title, description, tone = "success" }: ToastInput): number {
  const id = nextId++;
  items = [...items, { id, title, description, tone, open: true }];
  emit();
  return id;
}

/** Exit animation length plus a margin; the closed toast is removed after it. */
const REMOVE_AFTER_MS = 300;

export function dismissToast(id: number): void {
  items = items.map((item) => (item.id === id ? { ...item, open: false } : item));
  emit();
  // A timer rather than animationend, which never fires under reduced motion.
  setTimeout(() => removeToast(id), REMOVE_AFTER_MS);
}

function removeToast(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

/** Clears every toast; for tests and for logout. */
export function clearToasts(): void {
  items = [];
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getItems = () => items;
// Must return the same array every time: React compares snapshots by identity.
const NO_ITEMS: ToastItem[] = [];
const getNoItems = () => NO_ITEMS;

const tones: Record<ToastTone, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CircleCheck, iconClass: "text-credit" },
  info: { icon: Info, iconClass: "text-primary" },
  error: { icon: CircleAlert, iconClass: "text-debit" },
};

/**
 * Renders toasts at the top centre (UI spec, web Transfer: "Sent ETB 250.00 to
 * 2899010846."). Radix announces each one through a live region, pauses the
 * timer while hovered or focused, supports swipe-to-dismiss, and F8 jumps to
 * the toast region. Errors are announced assertively, everything else politely.
 * Placed once, in the root layout.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getItems, getNoItems);

  return (
    <ToastPrimitive.Provider swipeDirection="up" duration={5000} label="Notification">
      {toasts.map(({ id, title, description, tone, open }) => {
        const { icon: Icon, iconClass } = tones[tone];
        return (
          <ToastPrimitive.Root
            key={id}
            open={open}
            onOpenChange={(isOpen) => {
              if (!isOpen) dismissToast(id);
            }}
            type={tone === "error" ? "foreground" : "background"}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-button border border-border bg-surface px-4 py-3.5 text-ink shadow-float",
              "motion-safe:data-[state=closed]:animate-toast-out motion-safe:data-[state=open]:animate-toast-in",
              "data-[swipe=move]:translate-y-(--radix-toast-swipe-move-y) motion-safe:data-[swipe=end]:animate-toast-out",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn("mt-px size-icon shrink-0", iconClass)}
              strokeWidth={1.75}
            />
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="type-body-strong font-normal">
                {title}
              </ToastPrimitive.Title>
              {description && (
                <ToastPrimitive.Description className="type-caption text-ink-muted">
                  {description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss notification"
              className="hit-area -my-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}

      <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  );
}
