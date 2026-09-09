/**
 * Five-slice donut charts, one equal-width slice per WUBRG color (72° each,
 * White at the top going clockwise -- same order as Magic's own color
 * pie), each slice labeled with its own percentage rather than encoding
 * the value through the slice's angle or size. Pure SVG, no dependency.
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

  function sectorPath(cx, cy, rInner, rOuter, a0, a1) {
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
   * Color presence, main + splash: an inner ring of 5 slices for main-deck
   * presence, and an outer ring of 5 slices for splash presence, so both
   * of our criteria show up on the same wheel instead of one number
   * overwriting the other.
   */
  function renderColorPresenceDonut(container, mainPct, splashPct) {
    splashPct = splashPct || {};
    const EloApp = window.EloApp;
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const mainInner = 46;
    const mainOuter = 92;
    const gap = 6;
    const splashInner = mainOuter + gap;
    const splashOuter = splashInner + 32;

    const wedges = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const a0 = i * 72 - 36;
      const a1 = i * 72 + 36;
      const mid = i * 72;
      const mp = Math.round(clampPct(mainPct[c]));
      const sp = Math.round(clampPct(splashPct[c]));
      const mainLabelP = polar(cx, cy, (mainInner + mainOuter) / 2, mid);
      const splashLabelP = polar(cx, cy, (splashInner + splashOuter) / 2, mid);
      return `
        <path d="${sectorPath(cx, cy, mainInner, mainOuter, a0, a1)}" fill="${meta.hex}" stroke="var(--surface)" stroke-width="2" class="donut-wedge"><title>${meta.name} main: ${mp}%</title></path>
        <path d="${sectorPath(cx, cy, splashInner, splashOuter, a0, a1)}" fill="${meta.hex}" opacity="0.5" stroke="var(--surface)" stroke-width="2" class="donut-wedge"><title>${meta.name} splash: ${sp}%</title></path>
        <text x="${mainLabelP.x.toFixed(1)}" y="${(mainLabelP.y + 5).toFixed(1)}" text-anchor="middle" class="donut-label" fill="${meta.text}">${mp}%</text>
        <text x="${splashLabelP.x.toFixed(1)}" y="${(splashLabelP.y + 3).toFixed(1)}" text-anchor="middle" class="donut-label-small">${sp}%</text>
      `;
    }).join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="donut-chart-svg" role="img" aria-label="Color presence donut chart">
        ${wedges}
      </svg>
    `;
  }

  /**
   * Win rate per color: one ring, 5 slices, each labeled with the win rate
   * across every round played with that color in the deck (main or
   * splash). A color never played shows as a muted slice with "—".
   */
  function renderColorWinrateDonut(container, winRate, matchCounts) {
    const EloApp = window.EloApp;
    const size = 280;
    const cx = size / 2;
    const cy = size / 2;
    const rInner = 58;
    const rOuter = 124;

    const wedges = ORDER.map((c, i) => {
      const meta = EloApp.COLOR_META[c];
      const a0 = i * 72 - 36;
      const a1 = i * 72 + 36;
      const mid = i * 72;
      const wr = winRate[c];
      const n = matchCounts ? matchCounts[c] : 0;
      const hasData = wr !== null && wr !== undefined;
      const fill = hasData ? meta.hex : "var(--surface-alt)";
      const textColor = hasData ? meta.text : "var(--text-muted)";
      const text = hasData ? `${Math.round(wr)}%` : "—";
      const labelP = polar(cx, cy, (rInner + rOuter) / 2, mid);
      return `
        <path d="${sectorPath(cx, cy, rInner, rOuter, a0, a1)}" fill="${fill}" stroke="var(--surface)" stroke-width="2" class="donut-wedge"><title>${meta.name}: ${hasData ? Math.round(wr) + "% win rate" : "not played"} (${n} game${n === 1 ? "" : "s"})</title></path>
        <text x="${labelP.x.toFixed(1)}" y="${(labelP.y + 5).toFixed(1)}" text-anchor="middle" class="donut-label" fill="${textColor}">${text}</text>
      `;
    }).join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" class="donut-chart-svg" role="img" aria-label="Win rate by color donut chart">
        ${wedges}
      </svg>
    `;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.renderColorPresenceDonut = renderColorPresenceDonut;
  window.EloApp.renderColorWinrateDonut = renderColorWinrateDonut;
})(window);
