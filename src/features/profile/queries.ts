"use client";

import { useQuery } from "@tanstack/react-query";

import { getAppSession } from "@/features/auth/session";

import { createProfileApi } from "./api";

/** Query keys for the signed-in user (ADR-0004: one key factory per feature). */
export const userKeys = {
  all: ["user"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

/** The signed-in user: sidebar card, greeting, profile. Cached for the session. */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => createProfileApi(getAppSession().client).getCurrentUser(),
    // A name changes rarely; logout clears the cache anyway (#23).
    staleTime: 5 * 60_000,
  });
}
