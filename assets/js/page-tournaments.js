(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  const { escapeHtml, colorPips, archetypeLine, eloDelta } = EloApp;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const listEl = document.getElementById("tournaments-list");

  function showError(err) {
    msgArea.innerHTML = `<div class="msg error">${err.message || err}</div>`;
  }

  function placeClass(rank) {
    return rank <= 3 ? `rank-${rank}` : "";
  }

  function outcomeBadge(sa) {
    if (sa === 1) return '<span class="badge win">W</span>';
    if (sa === 0) return '<span class="badge loss">L</span>';
    return '<span class="badge draw">D</span>';
  }

  function renderTournament(t) {
    const roundNumbers = new Set(t.rounds.map((r) => r.round).filter((r) => r != null));
    const roundCount = roundNumbers.size || t.rounds.length;
    const title = t.name || "Untitled tournament";

    const standingsRows = t.participants
      .map((p, i) => {
        const rank = i + 1;
        return `<tr>
          <td class="${placeClass(rank)}">${rank}</td>
          <td><a class="player-link" href="player.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></td>
          <td>${colorPips(p.colors, p.splash)}${archetypeLine(p.archetypes)}</td>
          <td>${p.wins}-${p.draws}-${p.losses}</td>
          <td class="num">${Math.round(p.eloBefore)} → ${Math.round(p.eloAfter)} ${eloDelta(p.eloAfter - p.eloBefore)}</td>
        </tr>`;
      })
      .join("");

    const roundRows = t.rounds
      .map((m) => {
        const sa = m.scoreA > m.scoreB ? 1 : m.scoreA < m.scoreB ? 0 : 0.5;
        const sb = 1 - sa;
        const roundLabel = m.round ? `Round ${m.round}` : "—";
        return `<tr>
          <td>${roundLabel}</td>
          <td><a href="player.html?id=${encodeURIComponent(m.playerA)}">${escapeHtml(m.nameA)}</a> ${outcomeBadge(sa)} vs ${outcomeBadge(sb)} <a href="player.html?id=${encodeURIComponent(m.playerB)}">${escapeHtml(m.nameB)}</a></td>
          <td>${m.scoreA} - ${m.scoreB}</td>
          <td class="num">${eloDelta(m.deltaA)} / ${eloDelta(m.deltaB)}</td>
        </tr>`;
      })
      .join("");

    return `<div class="card tournament-card">
      <div class="tournament-card-header">
        <h3>${escapeHtml(title)}</h3>
        <p class="subtitle">Played on ${t.date} · ${t.participants.length} player${t.participants.length === 1 ? "" : "s"} · ${roundCount} round${roundCount === 1 ? "" : "s"}</p>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>#</th><th>Player</th><th>Deck</th><th>Record</th><th class="num">Elo</th></tr>
          </thead>
          <tbody>${standingsRows}</tbody>
        </table>
      </div>
      <details class="round-detail">
        <summary>Round by round</summary>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Round</th><th>Match</th><th>Score</th><th class="num">Δ Elo</th></tr>
            </thead>
            <tbody>${roundRows}</tbody>
          </table>
        </div>
      </details>
    </div>`;
  }

  try {
    const { players, matches } = await EloApp.loadData();

    if (players.length === 0 || matches.length === 0) {
      listEl.innerHTML = `<div class="card empty-state">No tournaments recorded yet. <a href="new-tournament.html">Add one</a>.</div>`;
    } else {
      const { matchLog } = EloApp.computeStandings(players, matches, cfg);
      const tournaments = EloApp.computeAllTournaments(matchLog);
      listEl.innerHTML = tournaments.map(renderTournament).join("");
    }
  } catch (err) {
    showError(err);
    listEl.innerHTML = `<div class="card empty-state">Error loading data.</div>`;
  }
})();
