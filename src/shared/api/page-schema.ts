import * as z from "zod/mini";

import type { Page } from "./types";

/**
 * The API's Spring `Page` wrapper around any item schema, so each paged
 * endpoint is checked the same way: `pageSchema(accountSchema)`.
 */
export function pageSchema<T>(item: z.ZodMiniType<T>): z.ZodMiniType<Page<T>> {
  return z.object({
    content: z.array(item),
    totalElements: z.number(),
    totalPages: z.number(),
    size: z.number(),
    number: z.number(),
    numberOfElements: z.number(),
    first: z.boolean(),
    last: z.boolean(),
    empty: z.boolean(),
  });
}
