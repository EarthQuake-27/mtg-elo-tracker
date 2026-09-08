/**
 * Five-axis radar ("spiderweb") chart for color presence, one axis per
 * WUBRG color, laid out in the same clockwise order as Magic's own color
 * pie (White at the top, then Blue, Black, Red, Green). Pure SVG, no
 * dependency -- consistent with the rest of the site's charts.
 *
 * Main-color and splash presence are each 0-100%, but they answer two
 * different questions ("how often is this a main color" vs "how often is
 * it a splash"), so instead of overlaying both on one shared radius they
 * get their own concentric zone: a shaded inner disc for main-color
 * presence, and an outer band -- starting where the inner disc ends -- for
 * splash presence. To keep the two scales from reading as one continuous
 * ruler (which made a 50%-of-inner-disc point look like "25% of the whole
 * chart"), the inner disc gets a visible tint, the 100% boundary of each
 * zone is drawn bold, and a small labeled ruler along the empty space
 * between Black and Red spells out 50%/100% for both zones explicitly.
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
   * @param mainPct   { W,U,B,R,G: 0-100 } main-color presence percentages (inner disc)
   * @param splashPct { W,U,B,R,G: 0-100 } splash presence percentages (outer band)
   */
  function renderColorRadarChart(container, mainPct, splashPct) {
    splashPct = splashPct || {};
    const size = 260;
    const cx = size / 2;
    const innerR = 44; // full extent of the main-color disc
    const outerR = 80; // full extent of the splash band (starts at innerR)
    const labelR = outerR + 30;
    // White sits at the very top of the pentagon (12 o'clock, same spot as
    // in Magic's own color wheel), so its label needs the most headroom of
    // any vertex above the chart's center -- cy leaves enough room for
    // that top label (icon + text) to stay fully inside the viewBox
    // instead of poking out above it.
    const cy = labelR + 44;
    const height = cy + labelR + 30;
    const EloApp = window.EloApp;

    const mainRadius = (pct) => (pct / 100) * innerR;
    const splashRadius = (pct) => innerR + (pct / 100) * (outerR - innerR);

    function ring(r, cls) {
      const pts = ORDER.map((c, i) => polar(cx, cy, r, i * 72));
      return `<polygon points="${pointsAttr(pts)}" class="${cls}" />`;
    }

    // Filled disc for the inner (main-color) zone, so it visibly reads as
    // its own bounded region rather than "the middle of one big chart".
    const innerDiscPts = ORDER.map((c, i) => polar(cx, cy, innerR, i * 72));
    const innerDiscFill = `<polygon points="${pointsAttr(innerDiscPts)}" class="radar-inner-disc" />`;

    // Just the two zone boundaries, drawn as faint dashed background
    // markers (not bold data-weight lines) -- the ruler's numbers already
    // cover the 50% mark, so an extra ring there was one pentagon too many
    // and started to look like a third data line.
    const boundaryRing = ring(innerR, "radar-boundary-ring"); // main 100% / splash 0%
    const outerRing = ring(outerR, "radar-boundary-ring"); // splash 100%

    const axisLines = ORDER.map((c, i) => {
      const p = polar(cx, cy, outerR, i * 72);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="radar-axis" />`;
    }).join("");

    // A small labeled ruler in the empty gap between the Black (144°) and
    // Red (216°) axes -- pointing straight down (180°) -- gives an
    // absolute reference for both scales instead of leaving the viewer to
    // guess a percentage purely from a dot's position.
    const rulerAngle = 180;
    const rulerTicks = [
      { r: mainRadius(50), text: "50%" },
      { r: innerR, text: "100%" },
      { r: splashRadius(50), text: "50%" },
      { r: outerR, text: "100%" },
    ]
      .map(({ r, text }) => {
        const p = polar(cx, cy, r, rulerAngle);
        return `<text x="${(p.x + 6).toFixed(1)}" y="${(p.y + 3).toFixed(1)}" class="radar-ruler-label">${text}</text>`;
      })
      .join("");
    const rulerLine = `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${(cy + outerR).toFixed(1)}" class="radar-ruler-line" />`;

    const mainPts = polygonPoints(mainPct, cx, cy, mainRadius);
    const splashPts = polygonPoints(splashPct, cx, cy, splashRadius);

    const mainShape = `
      <polygon points="${pointsAttr(mainPts)}" class="radar-shape-main-fill" />
      <polygon points="${pointsAttr(mainPts)}" class="radar-shape-main-line" />
    `;
    const splashShape = `<polygon points="${pointsAttr(splashPts)}" class="radar-shape-splash-fill" /><polygon points="${pointsAttr(splashPts)}" class="radar-shape-splash-line" />`;

    const dots = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const mp = clampPct(mainPct[c]);
      const sp = clampPct(splashPct[c]);
      const mainP = polar(cx, cy, mainRadius(mp), i * 72);
      const splashP = polar(cx, cy, splashRadius(sp), i * 72);
      return `
        <circle cx="${mainP.x.toFixed(1)}" cy="${mainP.y.toFixed(1)}" r="4" fill="${meta.hex}" stroke="rgba(128,128,128,0.55)" stroke-width="1.5"><title>${meta.name} (main): ${Math.round(mp)}%</title></circle>
        <circle cx="${splashP.x.toFixed(1)}" cy="${splashP.y.toFixed(1)}" r="3.5" fill="var(--surface)" stroke="${meta.hex}" stroke-width="2"><title>${meta.name} (splash): ${Math.round(sp)}%</title></circle>
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
        ${innerDiscFill}
        ${boundaryRing}
        ${outerRing}
        ${axisLines}
        ${rulerLine}
        ${mainShape}
        ${splashShape}
        ${dots}
        ${rulerTicks}
        ${labels}
      </svg>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderColorRadarChart = renderColorRadarChart;
})(window);
