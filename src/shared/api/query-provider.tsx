"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "./query-client";

import type { ReactNode } from "react";

/** Makes the app's query cache available to feature hooks (useAccounts…). */
export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
