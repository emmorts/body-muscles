import { useState } from "react";
import {
  ViewSide,
  createBodyPartState,
  type BodyState,
  type MuscleId,
} from "@emmorts/body-muscles";
import { Chart } from "./Chart";

export interface AppProps {
  initialView?: ViewSide;
  initialBodyState?: BodyState;
}

const VIEWS: ReadonlyArray<[ViewSide, string]> = [
  [ViewSide.FRONT, "Anterior"],
  [ViewSide.BACK, "Posterior"],
  [ViewSide.BOTH, "Both"],
];

export function App({ initialView = ViewSide.FRONT, initialBodyState = {} }: AppProps) {
  const [view, setView] = useState<ViewSide>(initialView);
  const [bodyState, setBodyState] = useState<BodyState>(initialBodyState);
  const [instanceKey, setInstanceKey] = useState(0);
  const [decorated, setDecorated] = useState(false);
  const [stats, setStats] = useState({ mounted: 0, unmounted: 0 });
  const [message, setMessage] = useState("Click a region");

  // A fresh function identity on every render: the chart replaces the callback
  // through `update()` instead of rebuilding, so focus inside the chart stays put.
  const handleSelect = (id: MuscleId, name: string) => {
    setBodyState((current) => {
      const entry = current[id] ?? createBodyPartState();
      return { ...current, [id]: { intensity: entry.intensity, selected: !entry.selected } };
    });
    setMessage(`${name} toggled${decorated ? " (decorated handler)" : ""}`);
  };

  const selected = Object.values(bodyState).filter((entry) => entry.selected).length;

  return (
    <main>
      <h1>React example</h1>
      <p>
        State lives in React; the chart is constructed in an effect and destroyed on cleanup. This page
        is server-rendered and hydrated, so the chart is created only in the browser.
      </p>

      <div className="toolbar" role="group" aria-label="Chart controls">
        {VIEWS.map(([side, label]) => (
          <button
            key={side}
            type="button"
            aria-pressed={view === side}
            onClick={() => setView(side)}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={() => setDecorated((value) => !value)}>
          Toggle callback wording
        </button>
        <button type="button" onClick={() => setInstanceKey((value) => value + 1)}>
          Remount the chart
        </button>
      </div>

      <p className="log" role="status">
        {message} — {selected} selected — charts mounted {stats.mounted} / unmounted {stats.unmounted}
      </p>

      <Chart
        key={instanceKey}
        view={view}
        bodyState={bodyState}
        onSelect={handleSelect}
        onMounted={() => setStats((current) => ({ ...current, mounted: current.mounted + 1 }))}
        onUnmounted={() => setStats((current) => ({ ...current, unmounted: current.unmounted + 1 }))}
      />
    </main>
  );
}
