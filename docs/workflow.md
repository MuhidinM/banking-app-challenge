# Workflow

How work moves from the backlog to `main`.

## Where work is tracked

- **Issues** — one per backlog task. The title says what changes in plain language; the body has context, scope, acceptance criteria and the requirement IDs it covers. The backlog ID (`T-021`) is in the body so [backlog.md](backlog.md) and GitHub stay linked.
- **Milestones** — one per stage of the build (M0–M10), in the order they're built.
- **Project board** — "Kifiya Banking Web Client": _Todo → In progress → Done_.
- **Labels** — a type (`feature`, `chore`, `test`, `documentation`, `bug`, `accessibility`, `security`), an area (`area: auth`, `area: accounts`, …) and a size (`size: small` < 1 h, `size: medium` 1–3 h, `size: large` > 3 h).

## Flow per task

1. Take the next open issue in milestone order; move it to _In progress_.
2. Create a branch from `main` named `<type>/<issue-number>-<what-it-does>`, e.g. `feature/24-login-page`, `fix/31-refresh-loop-on-login`, `chore/3-lint-and-format-setup`.
3. Build to the Definition of Done below, committing in small steps.
4. Push and open a pull request using the template. The description links the issue with `Closes #<number>`.
5. On the branch, mark the task `done` in [backlog.md](backlog.md) and tick the [requirements.md](requirements.md) rows it covers, with evidence.
6. Tick every item in the issue's _What to do_ and _Done when_ lists that was delivered. A closed issue or merged PR never keeps an empty checkbox — see _Work that is not done_ below.
7. CI must be green — GitHub enforces this (see _Protected `main`_ below). Review the diff as if someone else wrote it.
8. Merge with a **merge commit** so every detailed commit stays visible on `main`. The branch is deleted automatically.
9. Spec gaps or conflicts go into [spec-notes.md](spec-notes.md). Any choice someone could reasonably question gets an ADR in [decisions/](decisions/README.md).

## Work that is not done

An empty checkbox on something closed reads as forgotten work, so deferred items are rewritten instead:

- **In an issue:** strike the item through and say which issue owns it now — `~~End-to-end job~~ **Moved to #48**`. If no issue owns it yet, open one first.
- **In a pull request:** list it as a plain bullet — `**Not in this PR:** unit tests — added in #58` — not as an unticked box.

## Protected `main`

`main` only changes through pull requests. Branch protection requires:

- the CI check **Lint, type-check, test and build** to pass ([ci.yml](../.github/workflows/ci.yml)),
- the branch to be up to date with `main` before merging,
- all review conversations to be resolved.

The rules apply to administrators too. Force-pushes to `main` and deleting it are blocked.

## Commits

[Conventional Commits](https://www.conventionalcommits.org). One logical change per commit. The subject says _what_ changed; the body says _why_ and anything non-obvious. The footer references the issue.

```
feat(auth): share one token refresh between concurrent requests

When several requests get a 401 at the same time, only the first one
calls /api/auth/refresh-token. The others wait for the same promise and
retry once with the new access token.

Refs #21
```

Types: `feat`, `fix`, `test`, `refactor`, `style`, `docs`, `chore`, `perf`, `ci`, `build`.
Scopes match feature folders: `auth`, `accounts`, `transactions`, `transfers`, `bills`, `profile`, `ui`, `api`, `theme`, `mocks`, `ci`, `deps`.

## Definition of Done

- [ ] Types are strict; no `any`, no unneeded casts
- [ ] Logic has unit tests; interactive components have at least one RTL test where behaviour matters
- [ ] Loading, empty and error (with retry) states exist
- [ ] Works by keyboard; labels, focus and `aria-live` correct
- [ ] Checked in light and dark, at 360 px and 1440 px
- [ ] Matches the spec screen (compared side by side)
- [ ] No `console.log`, dead code, or stray TODOs (open an issue instead)
- [ ] Lint, typecheck and tests pass locally and in CI
- [ ] Requirement rows ticked with evidence

## AI usage

The brief allows AI. We use it openly and say how in the README: planning, scaffolding, test generation and review. Every line is read, understood and owned by the author, and decisions are recorded in ADRs so they can be explained.
