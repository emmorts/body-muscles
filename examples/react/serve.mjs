import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderApp } from "./dist/server.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5174);

// The same props are rendered on the server and handed to the client, which is
// what makes hydration a match.
const initialProps = {
  initialView: "FRONT",
  initialBodyState: { "biceps-left": { intensity: 7, selected: true } },
};

const shell = (mode, markup) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>body-muscles — React example (${mode})</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0 auto; padding: 1.5rem; max-width: 52rem; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
      button { font: inherit; padding: 0.4rem 0.7rem; border-radius: 0.4rem; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
      button[aria-pressed="true"] { background: #2563eb; border-color: #2563eb; color: #ffffff; }
      .chart { width: 100%; min-height: 24rem; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 0.5rem; }
      .log { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    </style>
  </head>
  <body>
    <script id="initial-props" type="application/json">${JSON.stringify(initialProps).replace(/</g, "\\u003c")}</script>
    <div id="root" data-mode="${mode}">${markup}</div>
    <script type="module" src="/client.js"></script>
  </body>
</html>`;

const assets = new Map([
  ["/client.js", "dist/client.js"],
  ["/client.js.map", "dist/client.js.map"],
]);

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (url.pathname === "/") {
    response
      .writeHead(200, { "content-type": "text/html; charset=utf-8" })
      .end(shell("ssr", renderApp(initialProps)));
    return;
  }

  // The same App, mounted without any server markup, for comparison.
  if (url.pathname === "/client-only") {
    response
      .writeHead(200, { "content-type": "text/html; charset=utf-8" })
      .end(shell("client", ""));
    return;
  }

  const asset = assets.get(url.pathname);
  if (asset) {
    response
      .writeHead(200, { "content-type": asset.endsWith(".map") ? "application/json" : "text/javascript" })
      .end(readFileSync(path.join(root, asset)));
    return;
  }

  response.writeHead(404).end();
}).listen(port, "127.0.0.1", () => {
  console.log(`react example: http://127.0.0.1:${port}/ (server-rendered, hydrated)`);
  console.log(`              http://127.0.0.1:${port}/client-only (client-only mount)`);
});
