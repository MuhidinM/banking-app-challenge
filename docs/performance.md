# Performance

Lighthouse 13.5 on every page, signed out and signed in, as a phone (Lighthouse's default: simulated slow 4G and 4× CPU slowdown) and as a desktop, against a production build talking to the local mock API.

## How to run it

```bash
NEXT_PUBLIC_API_MOCKING=off NEXT_PUBLIC_API_BASE_URL=http://localhost:4003 pnpm build
pnpm start --port 3003        # with the mock API serving on :4003
pnpm lighthouse               # LH_PAGES=/activity,/transfer and LH_RUNS=5 narrow or widen it
```

`scripts/lighthouse.mts` signs in with the demo user through the real login form, in the same Chromium profile Lighthouse tests in. It refuses to run unless the app's CSP shows the API is a local mock, so the demo password can't go to the shared API. Each page runs three times per form factor and the median run counts. HTML and JSON reports land in `lighthouse-reports/` (not committed).

## Results

Measured on 2026-10-02 after the move to `zod/mini` (#116), on an idle machine. Median of three runs.

| Page            | Mobile perf | Desktop perf | Accessibility | Best practices | Script (raw) | Total blocking time (mobile) |
| --------------- | ----------: | -----------: | ------------: | -------------: | -----------: | ---------------------------: |
| `/login`        |         100 |          100 |           100 |            100 |       690 KB |                        13 ms |
| `/register`     |         100 |          100 |           100 |            100 |       695 KB |                        34 ms |
| `/` (dashboard) |         100 |          100 |            96 |            100 |       736 KB |                        52 ms |
| `/accounts`     |         100 |          100 |           100 |            100 |       722 KB |                        78 ms |
| `/accounts/1`   |         100 |          100 |            96 |            100 |       772 KB |                        56 ms |
| `/accounts/new` |         100 |          100 |           100 |            100 |       724 KB |                        40 ms |
| `/activity`     |          99 |          100 |            96 |            100 |       815 KB |                       137 ms |
| `/transfer`     |          99 |          100 |           100 |            100 |       820 KB |                       131 ms |
| `/profile`      |          98 |          100 |            96 |            100 |       721 KB |                        38 ms |

- **Performance:** 98–100 on mobile and 100 on desktop on every page.
- **Accessibility 96:** the money-in green on white (3.49:1), a spec token kept by decision ([N-016](spec-notes.md)). It is the only finding.
- **Best practices:** 100 everywhere.
- **Machine load matters on mobile.** Lighthouse slows the CPU by a fixed factor, so a busy machine gives a slow "phone". An earlier run, on a machine shared with other builds, scored 79–97 for the same pages. The comparisons below were all run back to back on the same idle machine.

## What was fixed

- **Zod probing for eval** (best practices 96 → 100). Zod v4 calls `Function("")` on its first parse to decide whether to compile validators. The CSP blocks eval ([ADR-0010](decisions/0010-content-security-policy.md)), so Chrome logged a CSP issue on every page. `z.config({ jitless: true })` in `src/shared/config/env.ts` skips the probe.
- **A new date formatter for every date** (`/activity` mobile 78 → 88, dashboard 85 → 93, on the loaded machine). A CPU profile of `/activity` at 4× slowdown showed `zonedParts()` in `src/shared/lib/dates.ts` as the most expensive function (152 ms): it built an `Intl.DateTimeFormat` on every call, several times per transaction row. Formatters are now cached per time zone, and the function dropped below 10 ms.
- **Zod's size** (#116). Zod was the largest piece of script on every page: one 392 KB chunk, more than React DOM. Every schema now imports `zod/mini`, which has the same checks behind a function-based API that bundlers can tree-shake: `z.string().check(z.minLength(1))` instead of `z.string().min(1)`. Only the checks the app uses are bundled, and the chunk that holds them is 63 KB. The schemas are the response checks in `src/features/*/api.ts` and `src/shared/api/page-schema.ts`, the register form, the environment check, and the mock API's request checks. Error messages are unchanged, and the full unit and end-to-end suites pass unchanged.

  | Mobile, same idle machine | Before (`zod`) | After (`zod/mini`) |
  | ------------------------- | -------------: | -----------------: |
  | Script on a page (raw)    | 1,012–1,138 KB |         690–820 KB |
  | Total blocking time       |      78–151 ms |          13–137 ms |
  | Performance score         |         96–100 |             98–100 |

  About 320 KB less script on every page, roughly 30 %. On an idle machine the scores were already high, so the gain shows mostly in blocking time.
