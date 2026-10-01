import { z } from "zod";

const flag = z
  .enum(["on", "off"], { error: 'must be "on" or "off"' })
  .default("off")
  .transform((value) => value === "on");

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .url({
      protocol: /^https?$/,
      error: (issue) =>
        issue.input === undefined
          ? "is required, e.g. https://challenge-api.qena.dev"
          : "must be an http(s) URL, e.g. https://challenge-api.qena.dev",
    })
    .transform((url) => url.replace(/\/+$/, "")),
  NEXT_PUBLIC_API_MOCKING: flag,
  NEXT_PUBLIC_DEV_TOOLS: flag,
});

export interface Env {
  /** API origin without a trailing slash, e.g. `https://challenge-api.qena.dev`. */
  apiBaseUrl: string;
  /** Serve API responses from the MSW mock instead of the network. */
  apiMocking: boolean;
  /** Show the session inspector and other demo-only tools. */
  devTools: boolean;
}

type EnvSource = Record<keyof z.input<typeof envSchema>, string | undefined>;

export function parseEnv(source: EnvSource): Env {
  // An empty value in a .env file (`NAME=`) means "not set", so defaults apply.
  const normalised = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value?.trim() || undefined]),
  );

  const result = envSchema.safeParse(normalised);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}\n` +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }

  return {
    apiBaseUrl: result.data.NEXT_PUBLIC_API_BASE_URL,
    apiMocking: result.data.NEXT_PUBLIC_API_MOCKING,
    devTools: result.data.NEXT_PUBLIC_DEV_TOOLS,
  };
}

// Each variable is read by its full literal name: Next.js only inlines
// `process.env.NEXT_PUBLIC_*` into the browser bundle when written out like this.
export const env: Env = parseEnv({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_DEV_TOOLS: process.env.NEXT_PUBLIC_DEV_TOOLS,
});
