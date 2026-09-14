/**
 * Paired bar chart: two bars per category (e.g. occurrences count and win
 * rate %), each on its own scale, with rotated category labels along the
 * bottom. Pure SVG, no dependency.
 */
(function (window) {
  function renderDualBarChart(container, items, opts) {
    opts = opts || {};
    if (!items.length) {
      container.innerHTML = `<p class="empty-state">${opts.emptyText || "No data yet."}</p>`;
      return;
    }

    const barW = 16;
    const barGap = 4;
    const groupGap = 22;
    const groupW = barW * 2 + barGap;
    const PAD_L = 40;
    const PAD_R = 40;
    const PAD_T = 26;
    const PAD_B = 90;
    const chartH = 260;
    const W = PAD_L + PAD_R + items.length * (groupW + groupGap);
    const H = PAD_T + chartH + PAD_B;

    const maxA = Math.max(1, ...items.map((i) => i.valueA));
    const label1 = opts.label1 || "Series A";
    const label2 = opts.label2 || "Series B (%)";
    const color1 = opts.color1 || "var(--accent)";
    const color2 = opts.color2 || "var(--text)";

    const gridLines = [0, 0.25, 0.5, 0.75, 1]
      .map((t) => {
        const y = PAD_T + chartH - t * chartH;
        return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" class="chart-grid" />`;
      })
      .join("");

    const bars = items
      .map((item, i) => {
        const gx = PAD_L + i * (groupW + groupGap);
        const hA = (item.valueA / maxA) * chartH;
        const yA = PAD_T + chartH - hA;
        const hasB = item.valueB !== null && item.valueB !== undefined;
        const hB = hasB ? (item.valueB / 100) * chartH : 0;
        const yB = PAD_T + chartH - hB;
        const labelX = gx + groupW / 2;

        const barBHtml = hasB
          ? `<rect x="${(gx + barW + barGap).toFixed(1)}" y="${yB.toFixed(1)}" width="${barW}" height="${hB.toFixed(1)}" fill="${color2}" opacity="0.18" stroke="${color2}" stroke-width="1.5"><title>${item.name}: ${Math.round(item.valueB)}%</title></rect>
             <text x="${(gx + barW + barGap + barW / 2).toFixed(1)}" y="${(yB - 5).toFixed(1)}" text-anchor="middle" class="bar-chart-value">${Math.round(item.valueB)}%</text>`
          : "";

        return `
          <rect x="${gx.toFixed(1)}" y="${yA.toFixed(1)}" width="${barW}" height="${hA.toFixed(1)}" fill="${color1}" class="bar-chart-bar"><title>${item.name}: ${item.valueA}</title></rect>
          <text x="${(gx + barW / 2).toFixed(1)}" y="${(yA - 5).toFixed(1)}" text-anchor="middle" class="bar-chart-value">${item.valueA}</text>
          ${barBHtml}
          <text x="0" y="0" transform="translate(${labelX.toFixed(1)}, ${(PAD_T + chartH + 12).toFixed(1)}) rotate(-40)" text-anchor="end" class="chart-axis-label">${item.name}</text>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="table-scroll">
        <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="bar-chart-svg" role="img" aria-label="${opts.ariaLabel || "Bar chart"}">
          ${gridLines}
          ${bars}
        </svg>
      </div>
      <div class="legend-row" style="justify-content:center; margin-top:8px;">
        <span><span class="swatch-dot" style="background:${color1};"></span>${label1}</span>
        <span><span class="swatch-dot" style="background:${color2}; opacity:.4; border:1px solid ${color2};"></span>${label2}</span>
      </div>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderDualBarChart = renderDualBarChart;
})(window);
