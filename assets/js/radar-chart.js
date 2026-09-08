/**
 * Five-axis radar ("spiderweb") chart for color presence, one axis per
 * WUBRG color, laid out in the same clockwise order as Magic's own color
 * pie (White at the top, then Blue, Black, Red, Green). Pure SVG, no
 * dependency -- consistent with the rest of the site's charts.
 *
 * One shared 0-100% scale, and two nested shapes per axis:
 *  - the MAIN shape (solid, filled) sits at that color's main-deck %.
 *  - the TOTAL shape (dashed outline) sits at main% + splash% -- i.e. how
 *    often the color shows up at all, whether as a main color or a
 *    splash. Since a deck can't count as both for the same color, this
 *    sum is always <= 100%, and the total shape always reaches at least
 *    as far out as the main shape on every axis (they coincide exactly
 *    when splash is 0). A color played 50% main + 50% splash therefore
 *    reaches the very edge (100% total), with the solid main line
 *    stopping halfway and the dashed line continuing the rest of the way.
 */
(function (window) {
  const ORDER = ["W", "U", "B", "R", "G"];

  function polar(cx, cy, r, angleDeg) {
    const rad = (Math.PI / 180) * angleDeg;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function clampPct(v) {
    return Math.max(0, Math.min(100, v || 0));
  }

  function pointsAttr(points) {
    return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }

  /** Builds a pentagon's points given a function mapping a 0-100 value to a radius. */
  function polygonPoints(values, cx, cy, radiusFor) {
    return ORDER.map((c, i) => polar(cx, cy, radiusFor(clampPct(values[c])), i * 72));
  }

  /**
   * @param container element to render into
   * @param mainPct   { W,U,B,R,G: 0-100 } main-color presence percentages
   * @param splashPct { W,U,B,R,G: 0-100 } splash presence percentages
   */
  function renderColorRadarChart(container, mainPct, splashPct) {
    splashPct = splashPct || {};
    const size = 260;
    const cx = size / 2;
    const maxR = 74;
    const labelR = maxR + 34;
    // White sits at the very top of the pentagon (12 o'clock, same spot as
    // in Magic's own color wheel), so its label needs the most headroom of
    // any vertex above the chart's center -- cy leaves enough room for
    // that top label (icon + text) to stay fully inside the viewBox
    // instead of poking out above it.
    const cy = labelR + 44;
    const height = cy + labelR + 30;
    const EloApp = window.EloApp;

    const totalPct = {};
    ORDER.forEach((c) => {
      totalPct[c] = Math.min(100, clampPct(mainPct[c]) + clampPct(splashPct[c]));
    });

    const radiusFor = (pct) => (pct / 100) * maxR;

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

    const mainPts = polygonPoints(mainPct, cx, cy, radiusFor);
    const totalPts = polygonPoints(totalPct, cx, cy, radiusFor);

    const mainShape = `
      <polygon points="${pointsAttr(mainPts)}" class="radar-shape-main-fill" />
      <polygon points="${pointsAttr(mainPts)}" class="radar-shape-main-line" />
    `;
    const totalShape = `<polygon points="${pointsAttr(totalPts)}" class="radar-shape-total-line" />`;

    const dots = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const mp = clampPct(mainPct[c]);
      const tp = totalPct[c];
      const sp = clampPct(splashPct[c]);
      const mainP = polar(cx, cy, radiusFor(mp), i * 72);
      const totalP = polar(cx, cy, radiusFor(tp), i * 72);
      return `
        <circle cx="${mainP.x.toFixed(1)}" cy="${mainP.y.toFixed(1)}" r="4" fill="${meta.hex}" stroke="rgba(128,128,128,0.55)" stroke-width="1.5"><title>${meta.name}: ${Math.round(mp)}% main</title></circle>
        <circle cx="${totalP.x.toFixed(1)}" cy="${totalP.y.toFixed(1)}" r="3.5" fill="var(--surface)" stroke="${meta.hex}" stroke-width="2"><title>${meta.name}: ${Math.round(mp)}% main + ${Math.round(sp)}% splash = ${Math.round(tp)}% total</title></circle>
      `;
    }).join("");

    const labels = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const labelP = polar(cx, cy, labelR, i * 72);
      const mp = Math.round(clampPct(mainPct[c]));
      const sp = Math.round(clampPct(splashPct[c]));
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
        ${totalShape}
        ${dots}
        ${labels}
      </svg>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderColorRadarChart = renderColorRadarChart;
})(window);
