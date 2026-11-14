import { lazy, Suspense } from "react";
import { ChartNoAxesCombined } from "lucide-react";

const Plot = lazy(() => import("./PlotlyBasic.jsx"));

export function TrendChart({ variableName = "Selected variable", unit = "unit" }) {
  return (
    <div className="chart-shell">
      <Suspense fallback={<div className="plot-loading">Loading chart module…</div>}>
        <Plot
          data={[]}
          layout={{
            autosize: true, height: 280, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "#B8C8BD", family: "Inter, sans-serif", size: 11 },
            margin: { l: 52, r: 16, t: 10, b: 42 },
            xaxis: { title: "Date", gridcolor: "rgba(217,199,167,.08)", zeroline: false, showline: true, linecolor: "rgba(217,199,167,.18)" },
            yaxis: { title: `${variableName} (${unit})`, gridcolor: "rgba(217,199,167,.08)", zeroline: false, showline: true, linecolor: "rgba(217,199,167,.18)" },
            showlegend: true, legend: { orientation: "h", x: 0, y: -0.28 },
          }}
          config={{ responsive: true, displayModeBar: false }}
          useResizeHandler
          style={{ width: "100%", height: "280px" }}
        />
      </Suspense>
      <div className="chart-empty"><span><ChartNoAxesCombined size={18} /></span><b>Waiting for verified time-series data</b><small>Raw observations, seasonal adjustment and trend line appear after analysis.</small></div>
    </div>
  );
}
