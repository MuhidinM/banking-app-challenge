# Documentation

| Doc                                | Contents                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | Rendering model, API layer, auth and token refresh, state, theming, folder structure, stack       |
| [decisions/](decisions/README.md)  | Architecture Decision Records — one file per significant choice                                   |
| [requirements.md](requirements.md) | Every requirement from the brief with an ID, the task that delivers it, and the evidence it works |
| [backlog.md](backlog.md)           | Milestones and tasks, each linked to the requirements it covers                                   |
| [spec-notes.md](spec-notes.md)     | Where the design, brief and API disagree or leave gaps, and what we decided                       |
| [api-notes.md](api-notes.md)       | Endpoints, models, error codes → user messages, integration notes                                 |
| [design-notes.md](design-notes.md) | Screen inventory, layout rules, tokens, components, formatting                                    |
| [performance.md](performance.md)   | Lighthouse scores per page (mobile and desktop), how to run them, what was fixed                  |
| [workflow.md](workflow.md)         | Branches, commits, pull requests, Definition of Done                                              |
| `api/openapi.json`                 | Snapshot of the API's OpenAPI document (v1.1, 2026-10-01); source for generated types             |
| `design/design-tokens.json`        | Kifiya design tokens (v3); source for generated CSS variables                                     |

How they connect:

```
Brief requirement ─► requirements.md (R-xxx) ─► backlog.md (T-xxx) ─► pull request ─► requirement verified with evidence
Spec gap or conflict ─► spec-notes.md (N-xxx) ─► decision (ADR) or task
```
