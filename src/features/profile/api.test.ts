import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";

import { createProfileApi } from "./api";

describe("profile API", () => {
  it("loads the signed-in user", async () => {
    const session = getAppSession();
    await session.signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });

    const user = await createProfileApi(session.client).getCurrentUser();

    expect(user).toMatchObject({ username: "demo.jane", firstName: "Jane", lastName: "Doe" });
  });

  it("refuses a response that isn't a user", async () => {
    const session = getAppSession();
    await session.signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
    server.use(http.get(apiUrl("/api/users/me"), () => HttpResponse.json({ username: 42 })));

    await expect(createProfileApi(session.client).getCurrentUser()).rejects.toThrow();
  });
});
