import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
const projectRoot = path.join(root, "commons");
const output = path.join(root, "netlify-dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(projectRoot, "dist/client"), output, { recursive: true });

const workerUrl = pathToFileURL(path.join(projectRoot, "dist/server/index.js"));
workerUrl.searchParams.set("static-export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://employee-portal-hikinex.netlify.app/", {
    headers: { accept: "text/html" },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Failed to render H!KINEX Commons: ${response.status}`);
}

await writeFile(path.join(output, "index.html"), await response.text());

