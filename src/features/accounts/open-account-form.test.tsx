import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiError, apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { Toaster } from "@/shared/ui/toast";

import { AccountsList } from "./accounts-list";
import { OpenAccountForm } from "./open-account-form";

const push = vi.fn<(href: string) => void>();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/**
 * The request bodies sent to POST /api/accounts. A handler that records and
 * falls through to the mock (returning nothing), reset after each test.
 */
function recordCreates() {
  const bodies: unknown[] = [];
  server.use(
    http.post(apiUrl("/api/accounts"), async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

function renderForm({ withList = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      {withList ? <AccountsList /> : null}
      <OpenAccountForm />
      <Toaster />
    </QueryClientProvider>,
  );
  const submit = () => user.click(screen.getByRole("button", { name: "Open account" }));
  return { user, submit };
}

beforeEach(async () => {
  push.mockClear();
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("OpenAccountForm", () => {
  it("opens a savings account at ETB 0.00 by default and goes to it", async () => {
    const bodies = recordCreates();
    const { submit } = renderForm();

    expect(screen.getByRole("radio", { name: /Savings/ })).toBeChecked();
    await submit();

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/accounts\/\d+$/)),
    );
    expect(bodies).toEqual([{ accountType: "SAVINGS", initialBalance: 0 }]);
    expect(await screen.findByText("Savings account opened.")).toBeInTheDocument();
  });

  it("sends the chosen type and deposit", async () => {
    const bodies = recordCreates();
    const { user, submit } = renderForm();

    await user.click(screen.getByRole("radio", { name: /Checking/ }));
    await user.type(screen.getByLabelText("Initial deposit (optional)"), "250.5");
    await submit();

    // Wait for the request to finish, so it can't spill into the next test.
    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(bodies).toEqual([{ accountType: "CHECKING", initialBalance: 250.5 }]);
  });

  it("offers the other three types behind More account types", async () => {
    const bodies = recordCreates();
    const { user, submit } = renderForm();

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "More account types" }));
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "More account types" })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /Fixed-term deposit/ }));
    await submit();

    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    expect(bodies).toEqual([{ accountType: "FIXED_TIME_DEPOSIT", initialBalance: 0 }]);
  });

  it("shows the new account in the list and total without a reload", async () => {
    const { user, submit } = renderForm({ withList: true });
    expect(await screen.findByText("2 accounts · ETB 10,840.00 total")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Initial deposit (optional)"), "160");
    await submit();

    expect(await screen.findByText("3 accounts · ETB 11,000.00 total")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: "Your accounts" })).getAllByRole("link");
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent(/^Savings•••• \d{4}ETB 160\.00Available$/);
  });

  it("refuses an amount it can't read, without sending", async () => {
    const bodies = recordCreates();
    const { user, submit } = renderForm();

    await user.type(screen.getByLabelText("Initial deposit (optional)"), ".");
    await submit();

    expect(screen.getByText("Enter an amount like 250.00, or leave it empty.")).toBeInTheDocument();
    expect(bodies).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });

  it("puts the API's amount error on the deposit field", async () => {
    server.use(
      http.post(apiUrl("/api/accounts"), ({ request }) =>
        apiError(400, "TXN_001", "Initial balance must be positive", request),
      ),
    );
    const { submit } = renderForm();

    await submit();

    expect(await screen.findByText("Enter an amount of ETB 0.00 or more.")).toBeInTheDocument();
    expect(screen.getByLabelText("Initial deposit (optional)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("explains a network failure above the form", async () => {
    server.use(http.post(apiUrl("/api/accounts"), () => HttpResponse.error()));
    const { submit } = renderForm();

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can't reach the bank right now. Check your connection and try again.",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
