import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

/** Intercepts requests in the browser through public/mockServiceWorker.js. */
export const worker = setupWorker(...handlers);
