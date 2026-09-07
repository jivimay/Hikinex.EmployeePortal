import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";

// Run after the /portal production build and export, before deploying.
const output = path.resolve("netlify-dist");
const html = await readFile(path.join(output, "portal/index.html"), "utf8");
assert.match(html, /H!KINEX/);
const localAssets = [...html.matchAll(/(?:src|href)="(\/[^"\s]+)"/g)].map((match) => match[1]);
assert(localAssets.some((asset) => asset.endsWith(".js")), "Missing client scripts");
assert(localAssets.some((asset) => asset.endsWith(".css")), "Missing styles");
for (const asset of localAssets) {
  assert(asset.startsWith("/portal/"), `Asset escaped portal path: ${asset}`);
  await access(path.join(output, asset.slice(1)));
}
console.log(`Portal export passed: ${localAssets.length} asset references stay under /portal and exist.`);
