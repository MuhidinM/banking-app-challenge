import { z } from "zod";

import type { HttpClient } from "@/shared/api/http-client";
import type { User } from "@/shared/api/types";

// The user's name shows on every screen (sidebar, greeting), so the response is
// checked once here rather than trusted everywhere.
const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullish(),
  phoneNumber: z.string(),
}) satisfies z.ZodType<User>;

export function createProfileApi(client: HttpClient) {
  return {
    /** GET /api/users/me: the signed-in user. */
    async getCurrentUser(): Promise<User> {
      return userSchema.parse(await client.request<unknown>("/api/users/me"));
    },
  };
}
