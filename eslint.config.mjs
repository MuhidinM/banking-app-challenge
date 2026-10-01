import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Function components and hooks only.
const noClassComponents = {
  selector:
    "ClassDeclaration[superClass.name=/^(Component|PureComponent)$/], ClassDeclaration[superClass.property.name=/^(Component|PureComponent)$/]",
  message: "Use a function component and hooks instead of a class component.",
};

// Colours come from the design tokens (bg-surface, text-ink...). The default Tailwind
// palette is removed, so a raw hex value is the only way around them.
const noHexColours = {
  selector:
    "Literal[value=/#[0-9a-fA-F]{3,8}(?![\\w-])/], TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}(?![\\w-])/]",
  message: "Use a design-token colour (bg-surface, text-ink-muted...) instead of a hex value.",
};

// Raw backend text must never reach the screen (brief): only src/shared/api reads it,
// and describeError() turns errors into user copy.
const noServerMessage = {
  selector: "MemberExpression[property.name='serverMessage']",
  message: "Show describeError(error, context).message instead of the server's text.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Full recommended accessibility rules (next only enables a few).
  // The plugin itself is already registered by eslint-config-next.
  { rules: jsxA11y.flatConfigs.recommended.rules },

  {
    rules: {
      // Typed API models with no `any` leaks.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],

      // Raw HTML injection is the main XSS risk for tokens kept in the browser.
      "react/no-danger": "error",

      // Debug output must not ship; warnings and errors are allowed on purpose.
      "no-console": ["error", { allow: ["warn", "error"] }],

      "no-restricted-syntax": ["error", noClassComponents],

      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "type"],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  // Only the shared API client may talk to the network.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/shared/api/**", "src/mocks/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Call the API through src/shared/api, not fetch directly." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "fetch", message: "Call the API through src/shared/api." },
        {
          object: "globalThis",
          property: "fetch",
          message: "Call the API through src/shared/api.",
        },
      ],
    },
  },

  // Layers (see src/README.md): app → features → shared. Lower layers never
  // import higher ones, and the mock API stays out of application code.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "src/test/**"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/shared",
              from: ["./src/features", "./src/app"],
              message: "Shared code must not depend on features or routes.",
            },
            {
              target: "./src/features",
              from: "./src/app",
              message: "Features must not depend on routes; pass data in as props instead.",
            },
            {
              target: "./src/mocks",
              from: ["./src/features", "./src/app"],
              message: "The mock API only depends on src/shared, like the real API's contract.",
            },
            {
              target: ["./src/app", "./src/features", "./src/shared"],
              from: "./src/mocks",
              except: ["./mock-api-provider.tsx"],
              message:
                "Only tests may use the mock API directly. The app reaches it through MockApiProvider.",
            },
          ],
        },
      ],
    },
  },

  // Application code: no raw colours and no server error text (rules don't merge,
  // so the class rule is repeated in each block).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "src/mocks/**", "src/test/**", "src/shared/api/**"],
    rules: {
      "no-restricted-syntax": ["error", noClassComponents, noHexColours, noServerMessage],
    },
  },
  // The API layer may read the server message (to keep it for logs).
  {
    files: ["src/shared/api/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", noClassComponents, noHexColours] },
  },

  // Tests may assert on values they know exist.
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },

  // Command-line scripts report progress on the console.
  {
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },

  // Must stay last: turns off rules that conflict with Prettier.
  prettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "specs/**",
    // Git worktrees that Claude Code sessions create for parallel work: each is a
    // full checkout with its own node_modules, linted from its own root.
    ".claude/**",
    // Generated by `pnpm api:types`.
    "src/shared/api/schema.ts",
    // Generated by MSW on install.
    "public/mockServiceWorker.js",
  ]),
]);

export default eslintConfig;
