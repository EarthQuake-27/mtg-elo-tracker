/**
 * Small line chart for Elo over time, drawn as plain SVG (no external
 * library: nothing to download, nothing to keep updated, works offline).
 */
(function (window) {
  function renderEloChart(container, history) {
    const W = 640;
    const H = 220;
    const PAD_L = 44;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 30;

    const values = history.map((h) => h.elo);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 20;
      max += 20;
    }
    const margin = (max - min) * 0.1;
    min -= margin;
    max += margin;

    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const xFor = (i) => PAD_L + (history.length === 1 ? innerW / 2 : (i / (history.length - 1)) * innerW);
    const yFor = (v) => PAD_T + innerH - ((v - min) / (max - min)) * innerH;

    const points = history.map((h, i) => ({ x: xFor(i), y: yFor(h.elo), h }));

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

    const gridLines = [0, 0.5, 1].map((t) => {
      const v = min + (max - min) * t;
      const y = yFor(v);
      return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" class="chart-grid" />
        <text x="${PAD_L - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart-axis-label">${Math.round(v)}</text>`;
    }).join("");

    const dots = points
      .map(
        (p) =>
          `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" class="chart-dot"><title>${p.h.date || "Start"}: ${Math.round(p.h.elo)}</title></circle>`
      )
      .join("");

    const firstLabel = history[0].date || "Start";
    const lastLabel = history[history.length - 1].date || "";

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="elo-chart-svg" preserveAspectRatio="none" role="img" aria-label="Elo over time">
        ${gridLines}
        <path d="${areaPath}" class="chart-area" />
        <path d="${linePath}" class="chart-line" />
        ${dots}
        <text x="${PAD_L}" y="${H - 6}" class="chart-axis-label">${firstLabel}</text>
        <text x="${W - PAD_R}" y="${H - 6}" text-anchor="end" class="chart-axis-label">${lastLabel}</text>
      </svg>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderEloChart = renderEloChart;
})(window);
