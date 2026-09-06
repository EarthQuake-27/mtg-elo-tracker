(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const content = document.getElementById("player-content");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showError(text) {
    msgArea.innerHTML = `<div class="msg error">${text}</div>`;
  }

  function colorPips(colors) {
    if (!colors || colors.length === 0) return '<span class="pip-row">—</span>';
    return (
      '<span class="pip-row">' +
      colors
        .map((c) => {
          const meta = EloApp.COLOR_META[c];
          if (!meta) return "";
          return `<span class="pip" style="background:${meta.hex}; color:${meta.text};" title="${meta.name}">${c}</span>`;
        })
        .join("") +
      "</span>"
    );
  }

  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  if (!playerId) {
    showError('Nessun giocatore specificato. Torna alla pagina <a href="players.html">Giocatori</a>.');
    return;
  }

  try {
    const { players, matches } = await EloApp.loadData();
    const player = players.find((p) => p.id === playerId);

    if (!player) {
      showError('Giocatore non trovato. Torna alla pagina <a href="players.html">Giocatori</a>.');
      return;
    }

    const { standings, matchLog } = EloApp.computeStandings(players, matches, cfg);
    const rank = standings.findIndex((s) => s.id === playerId) + 1;
    const stats = standings.find((s) => s.id === playerId);

    document.title = `${player.name} – ${cfg.SITE_NAME}`;
    document.getElementById("player-name").textContent = player.name;
    document.getElementById("player-subtitle").textContent = player.joined
      ? `Nel gruppo dal ${player.joined}`
      : "";

    document.getElementById("stat-elo").textContent = Math.round(stats.elo);
    document.getElementById("stat-rank").textContent = `#${rank} / ${standings.length}`;
    document.getElementById("stat-matches").textContent = stats.matches;
    document.getElementById("stat-record").textContent = `${stats.wins}-${stats.draws}-${stats.losses}`;
    const winrate = stats.matches > 0 ? Math.round(((stats.wins + stats.draws * 0.5) / stats.matches) * 100) : 0;
    document.getElementById("stat-winrate").textContent = stats.matches > 0 ? `${winrate}%` : "—";
    document.getElementById("stat-games").textContent = `${stats.gamesWon}-${stats.gamesLost}`;

    // Color usage
    const colorCard = document.getElementById("color-usage-card");
    const totalColorPicks = Object.values(stats.colorCounts).reduce((a, b) => a + b, 0);
    if (totalColorPicks === 0) {
      colorCard.innerHTML = '<p class="empty-state">Nessun dato sui colori ancora.</p>';
    } else {
      colorCard.innerHTML = EloApp.COLORS.map((c) => {
        const meta = EloApp.COLOR_META[c];
        const count = stats.colorCounts[c];
        const pct = totalColorPicks > 0 ? Math.round((count / totalColorPicks) * 100) : 0;
        return `<div class="color-bar">
          <div class="swatch" style="background:${meta.hex}; color:${meta.text};">${c}</div>
          <div class="track"><div class="fill" style="width:${pct}%; background:${meta.hex};"></div></div>
          <div class="count">${count}</div>
        </div>`;
      }).join("");
    }

    // Match history (only this player's matches)
    const myMatches = matchLog.filter((m) => m.playerA === playerId || m.playerB === playerId).reverse();
    const matchesBody = document.getElementById("matches-body");
    if (myMatches.length === 0) {
      matchesBody.innerHTML = '<tr><td colspan="6" class="empty-state">Nessuna partita registrata ancora.</td></tr>';
    } else {
      matchesBody.innerHTML = myMatches
        .map((m) => {
          const isA = m.playerA === playerId;
          const myScore = isA ? m.scoreA : m.scoreB;
          const oppScore = isA ? m.scoreB : m.scoreA;
          const oppId = isA ? m.playerB : m.playerA;
          const oppName = isA ? m.nameB : m.nameA;
          const delta = isA ? m.deltaA : m.deltaB;
          const myColors = isA ? m.colorsA : m.colorsB;
          const oppColors = isA ? m.colorsB : m.colorsA;
          const badge = myScore > oppScore ? '<span class="badge win">Vittoria</span>' : myScore < oppScore ? '<span class="badge loss">Sconfitta</span>' : '<span class="badge draw">Pareggio</span>';

          return `<tr>
            <td>${m.date}</td>
            <td><a href="player.html?id=${encodeURIComponent(oppId)}">${escapeHtml(oppName)}</a></td>
            <td>${myScore}-${oppScore} ${badge}</td>
            <td>${colorPips(myColors)}</td>
            <td>${colorPips(oppColors)}</td>
            <td class="num"><span class="${delta >= 0 ? "delta-pos" : "delta-neg"}">${delta >= 0 ? "+" : ""}${delta.toFixed(1)}</span></td>
          </tr>`;
        })
        .join("");
    }

    // Elo chart
    EloApp.renderEloChart(document.getElementById("elo-chart"), stats.history);

    content.style.display = "block";
  } catch (err) {
    showError(err.message || err);
  }
})();
