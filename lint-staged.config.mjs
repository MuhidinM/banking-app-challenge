/**
 * Runs on staged files before each commit (see .husky/pre-commit).
 * Type-checking needs the whole project, so it runs on pre-push and in CI instead.
 * @type {import("lint-staged").Configuration}
 */
const config = {
  "*.{ts,tsx,js,mjs}": ["eslint --fix --max-warnings=0 --no-warn-ignored", "prettier --write"],
  "*.{json,md,css,yml,yaml}": "prettier --write",
};

export default config;
