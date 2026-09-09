/**
 * Small line chart for Elo over time, drawn as plain SVG (no external
 * library: nothing to download, nothing to keep updated, works offline).
 *
 * Points are placed on a genuine time axis (proportional to how many days
 * actually separate two matches), not just evenly spaced by index -- a
 * long gap between tournaments shows up as a long flat stretch, and a
 * flurry of matches on the same day cluster tightly together. Each point
 * gets its own date label along the bottom.
 */
(function (window) {
  function renderEloChart(container, history) {
    const W = 640;
    const H = 250;
    const PAD_L = 44;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 56;

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

    const timestamps = history.map((h) => (h.date ? new Date(h.date).getTime() : NaN));
    const validTs = timestamps.filter((t) => !isNaN(t));
    const minTs = validTs.length ? Math.min(...validTs) : 0;
    const maxTs = validTs.length ? Math.max(...validTs) : 0;
    const hasTimeSpread = validTs.length === timestamps.length && maxTs > minTs;

    const xFor = (i) => {
      if (hasTimeSpread) {
        return PAD_L + ((timestamps[i] - minTs) / (maxTs - minTs)) * innerW;
      }
      // No usable date spread (missing dates, or every point on the same
      // day) -- fall back to even spacing by index.
      return PAD_L + (history.length === 1 ? innerW / 2 : (i / (history.length - 1)) * innerW);
    };
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

    // A date label under every point would overlap into an unreadable
    // smear when several matches land close together, so a label is only
    // drawn once there's enough horizontal room since the last one --
    // the first and last points always get one regardless.
    const minLabelGap = 34;
    let lastLabelX = -Infinity;
    const dateLabels = points
      .map((p, i) => {
        const isEdge = i === 0 || i === points.length - 1;
        if (!isEdge && p.x - lastLabelX < minLabelGap) return "";
        lastLabelX = p.x;
        const label = p.h.date || "Start";
        return `<text x="0" y="0" transform="translate(${p.x.toFixed(1)}, ${(H - PAD_B + 14).toFixed(1)}) rotate(-40)" text-anchor="end" class="chart-axis-label chart-date-label">${label}</text>`;
      })
      .join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="elo-chart-svg" preserveAspectRatio="none" role="img" aria-label="Elo over time">
        ${gridLines}
        <path d="${areaPath}" class="chart-area" />
        <path d="${linePath}" class="chart-line" />
        ${dots}
        ${dateLabels}
      </svg>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderEloChart = renderEloChart;
})(window);
