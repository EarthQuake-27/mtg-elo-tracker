(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const chartCard = document.getElementById("archetypes-chart-card");

  function showError(text) {
    msgArea.innerHTML = `<div class="msg error">${text}</div>`;
  }

  function render(stats, sortBy) {
    const sorted = [...stats].sort((a, b) => {
      if (sortBy === "winrate") {
        const av = a.winRate == null ? -1 : a.winRate;
        const bv = b.winRate == null ? -1 : b.winRate;
        return bv - av;
      }
      return b.occurrences - a.occurrences;
    });

    chartCard.innerHTML = `
      <div class="form-row" style="margin-bottom:16px;">
        <div style="flex:0 0 auto;">
          <label style="margin-top:0;">Sort by</label>
          <div class="choice-group" id="sort-toggle">
            <button type="button" class="choice-btn${sortBy === "occurrences" ? " selected" : ""}" data-sort="occurrences">Occurrences</button>
            <button type="button" class="choice-btn${sortBy === "winrate" ? " selected" : ""}" data-sort="winrate">Win rate</button>
          </div>
        </div>
      </div>
      <div id="archetypes-chart"></div>
    `;

    EloApp.renderDualBarChart(
      document.getElementById("archetypes-chart"),
      sorted.map((s) => ({ name: s.name, valueA: s.occurrences, valueB: s.winRate })),
      {
        label1: "Decks played",
        label2: "Win rate",
        ariaLabel: "Archetype occurrences and win rate chart",
        emptyText: "No archetypes recorded yet.",
      }
    );

    document.getElementById("sort-toggle").addEventListener("click", (e) => {
      const btn = e.target.closest(".choice-btn");
      if (!btn) return;
      render(stats, btn.dataset.sort);
    });
  }

  try {
    const { players, matches } = await EloApp.loadData();
    if (matches.length === 0) {
      chartCard.innerHTML = '<p class="empty-state">No tournaments recorded yet.</p>';
      return;
    }
    const stats = EloApp.computeGlobalArchetypeStats(matches);
    render(stats, "occurrences");
  } catch (err) {
    showError(err.message || String(err));
  }
})();
