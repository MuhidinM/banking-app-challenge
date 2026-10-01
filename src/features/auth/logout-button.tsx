"use client";

import { LogOut } from "lucide-react";

import { Button, type ButtonVariant } from "@/shared/ui/button";

import { getAppSession } from "./session";

/**
 * Logs out. The session ending is what moves the user on: RequireSession sees
 * it and opens a plain /login, in this tab and in the others.
 */
export function LogoutButton({
  variant = "ghost",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      icon={LogOut}
      onClick={() => getAppSession().signOut()}
      className={className}
    >
      Log out
    </Button>
  );
}
