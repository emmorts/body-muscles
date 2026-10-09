import { renderToString } from "react-dom/server";
import { App, type AppProps } from "./App";

/**
 * Server rendering: React emits the controls and an empty chart container.
 * `renderToString` never constructs the chart, so no DOM is required here.
 */
export function renderApp(props: AppProps): string {
  return renderToString(<App {...props} />);
}
