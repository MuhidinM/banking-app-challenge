# Performance

Lighthouse 13.5 on every page, signed out and signed in, as a phone (Lighthouse's default: simulated slow 4G and 4× CPU slowdown) and as a desktop. Measured on 2026-10-02 against a production build talking to the local mock API.

## How to run it

```bash
NEXT_PUBLIC_API_MOCKING=off NEXT_PUBLIC_API_BASE_URL=http://localhost:4003 pnpm build
pnpm start --port 3003        # with the mock API serving on :4003
pnpm lighthouse               # LH_PAGES=/activity,/transfer and LH_RUNS=5 narrow or widen it
```

`scripts/lighthouse.mts` signs in with the demo user through the real login form, in the same Chromium profile Lighthouse tests in. It refuses to run unless the app's CSP shows the API is a local mock, so the demo password can't go to the shared API. Each page runs three times per form factor and the median run counts. HTML and JSON reports land in `lighthouse-reports/` (not committed).

## Results

Median of three runs. "CPU" is Lighthouse's benchmark index for the run; higher means more free CPU on the machine running the test.

| Page            | Mobile perf | Desktop perf | Accessibility | Best practices | CPU (mobile) |
| --------------- | ----------: | -----------: | ------------: | -------------: | -----------: |
| `/login`        |          90 |          100 |           100 |            100 |         2004 |
| `/register`     |          94 |          100 |           100 |            100 |         2080 |
| `/` (dashboard) |          93 |          100 |            96 |             96 |         2292 |
| `/accounts`     |          97 |          100 |           100 |            100 |         3198 |
| `/accounts/1`   |          95 |          100 |            96 |             96 |         2868 |
| `/accounts/new` |          81 |          100 |           100 |            100 |         1487 |
| `/activity`     |          88 |          100 |            96 |            100 |         2077 |
| `/transfer`     |          81 |          100 |           100 |            100 |         1262 |
| `/profile`      |          79 |           99 |            96 |            100 |         1082 |

- **Desktop:** 99–100 for performance on every page; accessibility and best practices 96–100.
- **Mobile:** the score follows the machine's free CPU, not the page. The same `/transfer` scored 97 in an earlier run on a quieter machine and 81 here at benchmark 1262; every run at benchmark 2000 or more scored 88 or higher. The build machine was shared with other builds, so these are a lower bound. What remains is mostly total blocking time from parsing and compiling JavaScript (1.14 MB raw on a signed-in page). Zod is the largest piece at 383 KB, more than React DOM; moving to `zod/mini` is tracked in #116.
- **Accessibility 96:** the money-in green on white (3.49:1), a spec token kept by decision ([N-016](spec-notes.md)).
- **Best practices 96:** the navigation prefetches `/pay-bill`, which returns 404 until the bill payment page is built (#42).

## What was fixed

- **Zod probing for eval** (best practices 96 → 100). Zod v4 calls `Function("")` on its first parse to decide whether to compile validators. The CSP blocks eval ([ADR-0010](decisions/0010-content-security-policy.md)), so Chrome logged a CSP issue on every page. `z.config({ jitless: true })` in `src/shared/config/env.ts` skips the probe.
- **A new date formatter for every date** (`/activity` mobile 78 → 88, dashboard 85 → 93). A CPU profile of `/activity` at 4× slowdown showed `zonedParts()` in `src/shared/lib/dates.ts` as the most expensive function (152 ms): it built an `Intl.DateTimeFormat` on every call, several times per transaction row. Formatters are now cached per time zone, and the function dropped below 10 ms.
