
import { lazy, Suspense } from "react";
import { ChartNoAxesCombined } from "lucide-react";

const Plot = lazy(() => import("./PlotlyBasic.jsx"));

export function TrendChart({
  variableName = "Selected variable",
  unit = "unit",
  analysis
}) {
  const trace = (points, name, color, dash) => ({
    x: points.map(p => `${p.time}-01`),
    y: points.map(p => p.value),
    name,
    type: "scatter",
    mode: "lines",
    connectgaps: false,
    line: { color, width: 2, ...(dash ? { dash } : {}) },
    hovertemplate: `%{x|%Y-%m}<br>%{y:.5g} ${unit}<extra>${name}</extra>`,
  });

  const data = analysis
    ? [
        trace(analysis.series, "Monthly source values", "#8eaac4"),
        ...(analysis.trend
          ? [
              trace(analysis.trend.deseasonalized, "Seasonally adjusted", "#69bd9a"),
              trace(analysis.trend.trend_line, "Fitted trend", "#f5b64d", "dash"),
            ]
          : []),
      ]
    : [];

  return (
    <div className="chart-shell">
      <Suspense fallback={<div className="plot-loading">Loading chart module…</div>}>
        <Plot
          data={data}
          layout={{
            autosize: true,
            height: 280,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "#B8C8BD", family: "Inter, sans-serif", size: 11 },
            margin: { l: 52, r: 16, t: 10, b: 42 },
            xaxis: {
              title: { text: "Month" },
              type: "date",
              gridcolor: "rgba(217,199,167,.08)",
              zeroline: false,
              showline: true,
              linecolor: "rgba(217,199,167,.18)",
            },
            yaxis: {
              title: { text: `${variableName} (${unit})` },
              gridcolor: "rgba(217,199,167,.08)",
              zeroline: false,
              showline: true,
              linecolor: "rgba(217,199,167,.18)",
            },
            showlegend: true,
            legend: { orientation: "h", x: 0, y: -0.28 },
          }}
          config={{ responsive: true, displayModeBar: false }}
          useResizeHandler
          style={{ width: "100%", height: "280px" }}
        />
      </Suspense>

      {!analysis && (
        <div className="chart-empty">
          <span><ChartNoAxesCombined size={18} /></span>
          <b>Waiting for time-series analysis</b>
          <small>Run an analysis with an available dataset.</small>
        </div>
      )}
    </div>
  );
}
