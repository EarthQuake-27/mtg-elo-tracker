/**
 * Small rendering helpers shared between pages that show match/deck data
 * (currently the player page and the head-to-head page), so both stay
 * visually consistent without duplicating the same markup logic twice.
 */
(function (window) {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /** Renders a deck's main + splash colors as small circular color icons. */
  function colorPips(mainColors, splashColors) {
    const main = mainColors || [];
    const splash = splashColors || [];
    if (main.length === 0 && splash.length === 0) return '<span class="pip-row">—</span>';
    const pip = (c, isSplash) => {
      const meta = window.EloApp.COLOR_META[c];
      if (!meta) return "";
      const title = isSplash ? `${meta.name} (splash)` : meta.name;
      return `<span class="pip${isSplash ? " splash" : ""}" title="${title}">${window.EloApp.colorIconSvg(c)}</span>`;
    };
    return (
      '<span class="pip-row">' +
      main.map((c) => pip(c, false)).join("") +
      splash.map((c) => pip(c, true)).join("") +
      "</span>"
    );
  }

  /** Renders a deck's archetype tags as a small muted line, or "" if none. */
  function archetypeLine(list) {
    return list && list.length
      ? `<div style="font-size:.75rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(list.join(" + "))}</div>`
      : "";
  }

  /** A horizontal bar made of one or more colored segments (each { pct, color, label }). */
  function statBar(segments) {
    const fills = segments
      .filter((s) => s.pct > 0)
      .map((s) => `<div class="fill" style="width:${s.pct}%; background:${s.color};" title="${s.label}: ${Math.round(s.pct)}%"></div>`)
      .join("");
    return `<div class="track">${fills}</div>`;
  }

  function resultBadge(myScore, oppScore) {
    if (myScore > oppScore) return '<span class="badge win">Win</span>';
    if (myScore < oppScore) return '<span class="badge loss">Loss</span>';
    return '<span class="badge draw">Draw</span>';
  }

  function eloDelta(delta) {
    return `<span class="${delta >= 0 ? "delta-pos" : "delta-neg"}">${delta >= 0 ? "+" : ""}${delta.toFixed(1)}</span>`;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.escapeHtml = escapeHtml;
  window.EloApp.colorPips = colorPips;
  window.EloApp.archetypeLine = archetypeLine;
  window.EloApp.statBar = statBar;
  window.EloApp.resultBadge = resultBadge;
  window.EloApp.eloDelta = eloDelta;
})(window);
