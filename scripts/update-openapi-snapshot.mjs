// Downloads the API's current OpenAPI document into docs/api/openapi.json.
// Run `pnpm api:snapshot`, review the diff, then `pnpm api:types` to regenerate types.
import { writeFile } from "node:fs/promises";

const source = "https://challenge-api.qena.dev/v3/api-docs";
const target = new URL("../docs/api/openapi.json", import.meta.url);

const response = await fetch(source);
if (!response.ok) {
  throw new Error(`GET ${source} failed: ${response.status} ${response.statusText}`);
}

// Saved exactly as served, so the file can be compared byte for byte with the live API.
await writeFile(target, await response.text());
console.log(`Saved ${source} to docs/api/openapi.json`);
