import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** Intercepts requests in Node (Vitest). Started in src/test/setup.ts. */
export const server = setupServer(...handlers);
