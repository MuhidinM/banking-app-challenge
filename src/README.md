# src/

Application code, organised by feature. The full picture (rendering model, auth, state) is in [docs/architecture.md](../docs/architecture.md).

## Where things go

| Folder             | What lives here                                                                                                  | Examples                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/`             | Routes only: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`. Pages are thin and compose feature components | `app/(app)/transfer/page.tsx`                                                                                                  |
| `features/<name>/` | Everything for one area of the product: API calls, queries and mutations, schemas, components, hooks             | `features/transfers/`, `features/accounts/`                                                                                    |
| `shared/`          | Code with no product knowledge, used by several features                                                         | `shared/api/` (HTTP client, API types), `shared/ui/` (Button, TextField), `shared/lib/` (money, dates), `shared/config/` (env) |
| `mocks/`           | The MSW mock of the banking API, for tests and offline use                                                       | `mocks/handlers/`, `mocks/fixtures.ts`                                                                                         |
| `test/`            | Test setup shared by every test file                                                                             | `test/setup.ts`                                                                                                                |

New code starts in the feature that needs it. It moves to `shared/` only once a second feature needs it, and only if it has no feature-specific logic.

## Dependency direction

```
app  ──►  features  ──►  shared
                           ▲
                 mocks ────┘     (tests and MockApiProvider only)
```

- `shared/` never imports `features/` or `app/`.
- `features/` never imports `app/`.
- `mocks/` depends only on `shared/`; application code reaches it only through `MockApiProvider` in the root layout.
- Only `shared/api/` calls `fetch`.

ESLint enforces all four rules (`import/no-restricted-paths`, `no-restricted-globals`), so a wrong import fails lint and CI.

## Conventions

- **Tests** sit next to the code they test as `*.test.ts(x)`.
- **File names** are kebab-case (`account-number.ts`, `transfer-form.tsx`); components are PascalCase exports.
- **Imports** use the `@/` alias across folders and relative paths within a feature.
- **Generated files** are never edited by hand: `shared/api/schema.ts` comes from `pnpm api:types`.
- **Folders exist only when they have a file.** No empty placeholders and no layers (services, repositories, managers) without a second use.
- **Grids start with `grid-cols-1`.** A grid without explicit columns gets one `auto` column that grows to its content's widest unbreakable line (such as a truncated row title), which overflowed a 375px screen. `grid-cols-1` is `minmax(0, 1fr)`, so content shrinks and truncates instead.
