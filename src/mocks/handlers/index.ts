import { accountHandlers } from "./accounts";
import { authHandlers } from "./auth";

/** Every endpoint in docs/api/openapi.json, served from the in-memory mock bank. */
export const handlers = [...authHandlers, ...accountHandlers];
