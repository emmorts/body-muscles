import { createRoot, hydrateRoot } from "react-dom/client";
import { App, type AppProps } from "./App";

const root = document.getElementById("root");
const propsElement = document.getElementById("initial-props");
const props: AppProps = propsElement?.textContent ? JSON.parse(propsElement.textContent) : {};

if (root) {
  // Server-rendered markup is hydrated in place; the client-only page mounts
  // from scratch. Either way the chart itself is constructed in an effect.
  if (root.dataset.mode === "ssr") {
    hydrateRoot(root, <App {...props} />);
  } else {
    createRoot(root).render(<App {...props} />);
  }
}
