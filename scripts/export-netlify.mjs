import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
const projectRoot = path.join(root, "commons");
const output = path.join(root, "netlify-dist");
const basePath = process.env.PORTAL_BASE_PATH || "";
if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) {
  throw new Error("PORTAL_BASE_PATH must be a single absolute path segment");
}
const publicOutput = path.join(output, basePath.slice(1));

await rm(output, { recursive: true, force: true });
await mkdir(publicOutput, { recursive: true });
// Vinext already prefixes generated assets with basePath, but public files
// remain at the client root. Keep generated paths and mount public files too.
await cp(path.join(projectRoot, "dist/client"), output, { recursive: true });
if (basePath) {
  await cp(path.join(projectRoot, "public"), publicOutput, { recursive: true });
}

const workerUrl = pathToFileURL(path.join(projectRoot, "dist/server/index.js"));
workerUrl.searchParams.set("static-export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request(`https://hikinex.com${basePath || "/"}`, {
    headers: { accept: "text/html" },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Failed to render H!KINEX Commons: ${response.status}`);
}

const html = await response.text();
await writeFile(path.join(publicOutput, "index.html"), html);
// Keep existing bookmarks usable while the main site's proxy is deployed.
if (basePath) await writeFile(path.join(output, "index.html"), html);
