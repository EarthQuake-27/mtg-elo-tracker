/**
 * Proportional donut charts: one slice per WUBRG color (White at the top,
 * clockwise -- same order as Magic's own color pie), each slice's ANGLE
 * scaled to its own value relative to the other colors, like a normal pie
 * chart -- not five fixed equal wedges. A color at 0% (or never played)
 * gets a zero-width slice, i.e. no slice at all. Pure SVG, no dependency.
 */
(function (window) {
  const ORDER = ["W", "U", "B", "R", "G"];

  function polar(cx, cy, r, angleDeg) {
    const rad = (Math.PI / 180) * angleDeg;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function clampPct(v) {
    return Math.max(0, v || 0);
  }

  function sectorPath(cx, cy, rInner, rOuter, a0, a1) {
    // A true 360° arc is ambiguous for the SVG arc command (same start and
    // end point), so a single dominant slice is drawn just short of a full
    // circle -- visually indistinguishable from one.
    if (a1 - a0 >= 359.99) a1 = a0 + 359.99;
    const p1 = polar(cx, cy, rOuter, a0);
    const p2 = polar(cx, cy, rOuter, a1);
    const p3 = polar(cx, cy, rInner, a1);
    const p4 = polar(cx, cy, rInner, a0);
    const largeArc = a1 - a0 > 180 ? 1 : 0;
    return (
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} ` +
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`
    );
  }

  /**
   * Renders one proportional donut. `values` is { W,U,B,R,G: number >=0 }
   * (percentages or any comparable magnitude); each slice's share of the
   * full circle is value / sum(values). Returns false (renders an empty
   * state instead) if every value is 0.
   *
   * @param displayValues optional { W,U,B,R,G } used for the label text
   *   when it should show something other than `values` itself (e.g. the
   *   win-rate chart sizes slices by match count but labels them with the
   *   win rate percentage).
   */
  function renderColorDonut(container, values, opts) {
    opts = opts || {};
    const EloApp = window.EloApp;
    const total = ORDER.reduce((sum, c) => sum + clampPct(values[c]), 0);

    if (total <= 0) {
      container.innerHTML = `<p class="empty-state">${opts.emptyText || "No data yet."}</p>`;
      return false;
    }

    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const rInner = opts.rInner || 40;
    const rOuter = opts.rOuter || 118;
    const labelR = rOuter + 26;
    const displayValues = opts.displayValues || values;
    const labelSuffix = opts.labelSuffix || "%";
    const showZeroLabel = !!opts.showZeroLabel;

    let cursor = 0;
    const parts = ORDER.map((c) => {
      const meta = EloApp.COLOR_META[c];
      const v = clampPct(values[c]);
      const angle = (v / total) * 360;
      const a0 = cursor;
      const a1 = cursor + angle;
      cursor = a1;

      if (angle <= 0.01) {
        if (!showZeroLabel) return "";
        // Still label a truly-zero slice at its "would be" position so a
        // color that's simply absent isn't silently omitted from the chart.
        const mid = a0;
        const labelP = polar(cx, cy, labelR, mid);
        return labelAt(labelP, c, "0" + labelSuffix);
      }

      const mid = (a0 + a1) / 2;
      const labelP = polar(cx, cy, labelR, mid);
      const dv = Math.round(displayValues[c] != null ? displayValues[c] : v);
      return `
        <path d="${sectorPath(cx, cy, rInner, rOuter, a0, a1)}" fill="${meta.hex}" stroke="var(--surface)" stroke-width="2" class="donut-wedge"><title>${meta.name}: ${dv}${labelSuffix}</title></path>
        ${labelAt(labelP, c, `${dv}${labelSuffix}`)}
      `;
    });

    function labelAt(labelP, colorCode, text) {
      const iconSize = 20;
      return `
        <foreignObject x="${(labelP.x - iconSize / 2).toFixed(1)}" y="${(labelP.y - iconSize - 13).toFixed(1)}" width="${iconSize}" height="${iconSize}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${iconSize}px; height:${iconSize}px;">${EloApp.colorIconSvg(colorCode)}</div>
        </foreignObject>
        <text x="${labelP.x.toFixed(1)}" y="${(labelP.y - 5).toFixed(1)}" text-anchor="middle" class="donut-label">${text}</text>
      `;
    }

    container.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="donut-chart-svg" role="img" aria-label="${opts.ariaLabel || "Color donut chart"}">
        ${parts.join("")}
      </svg>
    `;
    return true;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderColorDonut = renderColorDonut;
})(window);
