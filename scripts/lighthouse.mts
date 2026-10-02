/**
 * Lighthouse on every page, signed out and signed in (`pnpm lighthouse`).
 *
 * Run it against a production build whose API is a mock, never the shared API:
 * it signs in with the demo password. It refuses to run unless the app's CSP
 * shows the API is on localhost or the never-resolving E2E host.
 *
 *   pnpm lighthouse [base URL, default http://localhost:3003]
 *   LH_PAGES=/activity,/transfer LH_RUNS=5 pnpm lighthouse
 *
 * Chromium comes from Playwright. Signing in happens in the same browser
 * profile Lighthouse tests in, so the signed-in pages see the session.
 * Each page runs LH_RUNS times (default 3) per form factor and the median run
 * counts. Reports land in lighthouse-reports/ (HTML and JSON per page and form factor).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium } from "@playwright/test";
import lighthouse, { desktopConfig, type Result } from "lighthouse";

import { DEMO_PASSWORD } from "../src/mocks/fixtures.ts";

const BASE_URL = (process.argv[2] ?? "http://localhost:3003").replace(/\/+$/, "");
const PORT = 9333;
const OUT_DIR = "lighthouse-reports";
const CATEGORIES = ["performance", "accessibility", "best-practices"] as const;
// Scores move with machine load; the median of a few runs is the usual remedy.
const RUNS = Number(process.env.LH_RUNS ?? 3);
// Optional comma-separated subset, e.g. LH_PAGES=/activity,/transfer.
const ONLY = process.env.LH_PAGES?.split(",").filter(Boolean);
const MOCK_API_HOSTS = new Set(["localhost", "127.0.0.1", "api.e2e.invalid"]);

/** The API origin the build talks to, read from the CSP connect-src. */
async function apiHost(): Promise<string | undefined> {
  const response = await fetch(`${BASE_URL}/login`);
  const policy = response.headers.get("content-security-policy") ?? "";
  const connect = /connect-src ([^;]+)/.exec(policy)?.[1]?.split(" ") ?? [];
  const origin = connect.find((source) => /^https?:\/\//.test(source));
  return origin ? new URL(origin).hostname : undefined;
}

type FormFactor = "mobile" | "desktop";
interface Row {
  page: string;
  formFactor: FormFactor;
  scores: Record<(typeof CATEGORIES)[number], number>;
  failing: string[];
}

async function audit(
  pagePath: string,
  formFactor: FormFactor,
): Promise<{ row: Row; lhr: Result; report: string }> {
  const result = await lighthouse(
    `${BASE_URL}${pagePath}`,
    {
      port: PORT,
      output: "html",
      logLevel: "error",
      onlyCategories: [...CATEGORIES],
      // Keep the session the script signed in with.
      disableStorageReset: true,
    },
    formFactor === "desktop" ? desktopConfig : undefined,
  );
  if (!result) throw new Error(`Lighthouse returned nothing for ${pagePath}`);
  const { lhr, report } = result;

  const scores = Object.fromEntries(
    CATEGORIES.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)]),
  ) as Row["scores"];
  // Audits that count towards a score and didn't pass.
  const failing = CATEGORIES.flatMap((id) =>
    (lhr.categories[id]?.auditRefs ?? [])
      .filter((ref) => ref.weight > 0)
      .flatMap((ref) => {
        const result = lhr.audits[ref.id];
        return result && result.score !== null && result.score < 0.9 ? [result] : [];
      })
      .map((result) => `${id}/${result.id} (${result.displayValue ?? result.score})`),
  );
  if (lhr.finalDisplayedUrl !== `${BASE_URL}${pagePath}`) {
    failing.unshift(`ended on ${lhr.finalDisplayedUrl}`);
  }
  return { row: { page: pagePath, formFactor, scores, failing }, lhr, report: report as string };
}

/** Runs one page RUNS times and keeps the run with the median performance score. */
async function auditMedian(pagePath: string, formFactor: FormFactor, before: () => Promise<void>) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    await before();
    runs.push(await audit(pagePath, formFactor));
  }
  runs.sort((a, b) => a.row.scores.performance - b.row.scores.performance);
  const median = runs[Math.floor(runs.length / 2)];
  if (!median) throw new Error("LH_RUNS must be at least 1");
  const name = `${pagePath === "/" ? "dashboard" : pagePath.slice(1).replaceAll("/", "-")}-${formFactor}`;
  await writeFile(path.join(OUT_DIR, `${name}.html`), median.report);
  await writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(median.lhr));
  const all = runs.map((r) => r.row.scores.performance).join("/");
  console.log(`done ${pagePath} (${formFactor}): performance ${all}`);
  return median.row;
}

async function main() {
  const host = await apiHost();
  if (!host || !MOCK_API_HOSTS.has(host)) {
    throw new Error(
      `The app at ${BASE_URL} talks to ${host ?? "an unknown API"}. ` +
        "Run Lighthouse only against a build that uses the mock API (it signs in with the demo password).",
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  const profile = await mkdtemp(path.join(tmpdir(), "kb-lighthouse-"));
  // A persistent context is the browser's default one, which Lighthouse's tab shares.
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: [`--remote-debugging-port=${PORT}`],
  });
  const rows: Row[] = [];
  try {
    const page = context.pages()[0] ?? (await context.newPage());

    // Refresh tokens work once. Lighthouse's back/forward-cache check reloads the
    // page and closes it while that reload's refresh may still be in flight, so
    // the rotated token can be lost. Each signed-in audit therefore starts from a
    // fresh sign-in, and the script's own tab then leaves the app so only
    // Lighthouse's tab uses the session.
    const signIn = async () => {
      await context.clearCookies();
      await page.goto(`${BASE_URL}/robots.txt`);
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel("Username").fill("demo.jane");
      await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForURL(`${BASE_URL}/`);
    };

    const run = async (pagePath: string, { signedIn }: { signedIn: boolean }) => {
      if (ONLY && !ONLY.includes(pagePath)) return;
      for (const formFactor of ["mobile", "desktop"] as const) {
        rows.push(
          await auditMedian(pagePath, formFactor, async () => {
            if (!signedIn) return;
            await signIn();
            await page.goto("about:blank");
          }),
        );
      }
    };

    await run("/login", { signedIn: false });
    await run("/register", { signedIn: false });

    await signIn();
    await page.goto(`${BASE_URL}/accounts`);
    const accountPath = await page
      .locator('a[href^="/accounts/"]:not([href="/accounts/new"])')
      .first()
      .getAttribute("href");

    for (const pagePath of [
      "/",
      "/accounts",
      ...(accountPath ? [accountPath] : []),
      "/accounts/new",
      "/activity",
      "/transfer",
      "/profile",
    ]) {
      await run(pagePath, { signedIn: true });
    }
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }

  console.log();
  console.table(
    rows.map(({ page, formFactor, scores }) => ({
      page,
      formFactor,
      performance: scores.performance,
      accessibility: scores.accessibility,
      "best practices": scores["best-practices"],
    })),
  );
  for (const row of rows.filter((r) => r.failing.length > 0)) {
    console.log(`${row.page} (${row.formFactor}): ${row.failing.join(", ")}`);
  }
  await writeFile(path.join(OUT_DIR, "summary.json"), JSON.stringify(rows, null, 2));

  const below = rows.filter((r) => CATEGORIES.some((id) => r.scores[id] < 90));
  if (below.length > 0) {
    console.error(`\n${below.length} page runs scored under 90.`);
    process.exitCode = 1;
  }
}

await main();
