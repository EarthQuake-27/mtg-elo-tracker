/**
 * Five-axis radar ("spiderweb") chart for color presence, one axis per
 * WUBRG color, laid out in the same clockwise order as Magic's own color
 * pie (White at the top, then Blue, Black, Red, Green). Pure SVG, no
 * dependency -- consistent with the rest of the site's charts.
 */
(function (window) {
  const ORDER = ["W", "U", "B", "R", "G"];

  function polar(cx, cy, r, angleDeg) {
    const rad = (Math.PI / 180) * angleDeg;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function polygonPoints(values, cx, cy, maxR) {
    return ORDER.map((c, i) => {
      const pct = Math.max(0, Math.min(100, values[c] || 0));
      const r = (pct / 100) * maxR;
      return polar(cx, cy, r, i * 72);
    });
  }

  function pointsAttr(points) {
    return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }

  /**
   * @param container element to render into
   * @param mainPct   { W,U,B,R,G: 0-100 } main-color presence percentages
   * @param splashPct { W,U,B,R,G: 0-100 } splash presence percentages (optional)
   */
  function renderColorRadarChart(container, mainPct, splashPct) {
    const size = 260;
    const height = 270;
    const cx = size / 2;
    // White sits at the very top of the pentagon (12 o'clock, same spot as
    // in Magic's own color wheel), so its label needs the most headroom of
    // any vertex above the chart's center -- cy leaves enough room for
    // that top label (icon + text) to stay fully inside the viewBox
    // instead of poking out above it.
    const cy = 150;
    const maxR = 72;
    const EloApp = window.EloApp;

    const gridRings = [0.25, 0.5, 0.75, 1]
      .map((level) => {
        const pts = ORDER.map((c, i) => polar(cx, cy, level * maxR, i * 72));
        return `<polygon points="${pointsAttr(pts)}" class="radar-grid-ring" />`;
      })
      .join("");

    const axisLines = ORDER.map((c, i) => {
      const p = polar(cx, cy, maxR, i * 72);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="radar-axis" />`;
    }).join("");

    const mainPts = polygonPoints(mainPct, cx, cy, maxR);
    const splashPts = splashPct ? polygonPoints(splashPct, cx, cy, maxR) : null;

    const mainShape = `
      <polygon points="${pointsAttr(mainPts)}" class="radar-shape-main-fill" />
      <polygon points="${pointsAttr(mainPts)}" class="radar-shape-main-line" />
    `;
    const splashShape = splashPts
      ? `<polygon points="${pointsAttr(splashPts)}" class="radar-shape-splash-line" />`
      : "";

    const dots = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const p = polar(cx, cy, (Math.max(0, Math.min(100, mainPct[c] || 0)) / 100) * maxR, i * 72);
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${meta.hex}" stroke="rgba(128,128,128,0.55)" stroke-width="1.5"><title>${meta.name}: ${Math.round(mainPct[c] || 0)}%</title></circle>`;
    }).join("");

    const labels = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const labelP = polar(cx, cy, maxR + 34, i * 72);
      const mp = Math.round(mainPct[c] || 0);
      const sp = splashPct ? Math.round(splashPct[c] || 0) : 0;
      const pctText = sp > 0 ? `${mp}%+${sp}%` : `${mp}%`;
      const iconSize = 22;
      return `
        <foreignObject x="${(labelP.x - iconSize / 2).toFixed(1)}" y="${(labelP.y - iconSize - 14).toFixed(1)}" width="${iconSize}" height="${iconSize}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${iconSize}px; height:${iconSize}px;">${EloApp.colorIconSvg(c)}</div>
        </foreignObject>
        <text x="${labelP.x.toFixed(1)}" y="${(labelP.y - 6).toFixed(1)}" text-anchor="middle" class="radar-label">${pctText}</text>
      `;
    }).join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${size} ${height}" class="radar-chart-svg" role="img" aria-label="Color presence radar chart">
        ${gridRings}
        ${axisLines}
        ${mainShape}
        ${splashShape}
        ${dots}
        ${labels}
      </svg>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderColorRadarChart = renderColorRadarChart;
})(window);
