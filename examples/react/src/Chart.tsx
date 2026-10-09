import { useEffect, useRef } from "react";
import { BodyChart, type BodyState, type MuscleId, type ViewSide } from "@emmorts/body-muscles";

export interface ChartProps {
  view: ViewSide;
  bodyState: BodyState;
  onSelect: (id: MuscleId, name: string) => void;
  onMounted?: () => void;
  onUnmounted?: () => void;
}

/**
 * The chart needs a DOM node, so it is constructed inside an effect and never
 * during render. That makes server rendering safe: `renderToString` emits the
 * empty container, and the chart is created when the component hydrates.
 *
 * The effect keyed on `view` owns the instance and destroys it on cleanup, so
 * unmounting, remounting (a changed `key`), or switching view never leaks a
 * chart or its listeners.
 */
export function Chart({ view, bodyState, onSelect, onMounted, onUnmounted }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);

  // Props are read through a ref so the creation effect does not re-run when a
  // callback identity changes.
  const latest = useRef({ bodyState, onSelect, onMounted, onUnmounted });
  latest.current = { bodyState, onSelect, onMounted, onUnmounted };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const chart = new BodyChart(container, {
      view,
      bodyState: latest.current.bodyState,
      onMuscleClick: (id, name) => latest.current.onSelect(id, name),
    });
    chartRef.current = chart;
    latest.current.onMounted?.();

    return () => {
      chart.destroy();
      chartRef.current = null;
      latest.current.onUnmounted?.();
    };
  }, [view]);

  // Prop changes are applied in place, which preserves focus inside the chart.
  useEffect(() => {
    chartRef.current?.update({
      bodyState,
      onMuscleClick: (id, name) => onSelect(id, name),
    });
  }, [bodyState, onSelect]);

  return <div className="chart" ref={containerRef} />;
}
