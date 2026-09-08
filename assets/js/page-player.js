(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const content = document.getElementById("player-content");
  const { escapeHtml, colorPips, archetypeLine, statBar } = EloApp;

  function showError(text) {
    msgArea.innerHTML = `<div class="msg error">${text}</div>`;
  }

  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  if (!playerId) {
    showError('No player specified. Go back to the <a href="players.html">Players</a> page.');
    return;
  }

  try {
    const { players, matches } = await EloApp.loadData();
    const player = players.find((p) => p.id === playerId);

    if (!player) {
      showError('Player not found. Go back to the <a href="players.html">Players</a> page.');
      return;
    }

    const { standings, matchLog } = EloApp.computeStandings(players, matches, cfg);
    const rank = standings.findIndex((s) => s.id === playerId) + 1;
    const stats = standings.find((s) => s.id === playerId);

    document.title = `${player.name} – ${cfg.SITE_NAME}`;
    document.getElementById("player-name").textContent = player.name;
    document.getElementById("player-subtitle").textContent = player.joined
      ? `In the group since ${player.joined}`
      : "";

    document.getElementById("stat-elo").textContent = Math.round(stats.elo);
    document.getElementById("stat-rank").textContent = `#${rank} / ${standings.length}`;
    document.getElementById("stat-matches").textContent = stats.matches;
    document.getElementById("stat-record").textContent = `${stats.wins}-${stats.draws}-${stats.losses}`;
    const winrate = stats.matches > 0 ? Math.round(((stats.wins + stats.draws * 0.5) / stats.matches) * 100) : 0;
    document.getElementById("stat-winrate").textContent = stats.matches > 0 ? `${winrate}%` : "—";
    document.getElementById("stat-games").textContent = `${stats.gamesWon}-${stats.gamesLost}`;

    // Deck stats: computed per DECK (one tournament = one deck), not per round.
    const deckStats = EloApp.computeDeckStats(playerId, matches);
    const splashRate = deckStats.totalDecks > 0 ? Math.round((deckStats.splashDeckCount / deckStats.totalDecks) * 100) : 0;
    document.getElementById("stat-splashrate").textContent = deckStats.totalDecks > 0 ? `${splashRate}%` : "—";

    // Win / draw / loss bar (graphical, alongside the numeric tiles above)
    const recordBarEl = document.getElementById("record-bar");
    if (stats.matches === 0) {
      recordBarEl.innerHTML = '<p class="empty-state" style="padding:8px 0;">No matches recorded yet.</p>';
    } else {
      const winPct = (stats.wins / stats.matches) * 100;
      const drawPct = (stats.draws / stats.matches) * 100;
      const lossPct = (stats.losses / stats.matches) * 100;
      recordBarEl.innerHTML = `
        ${statBar([
          { pct: winPct, color: "var(--success)", label: "Wins" },
          { pct: drawPct, color: "var(--warn)", label: "Draws" },
          { pct: lossPct, color: "var(--danger)", label: "Losses" },
        ])}
        <div class="legend-row">
          <span><span class="swatch-dot" style="background:var(--success);"></span>Win ${Math.round(winPct)}%</span>
          <span><span class="swatch-dot" style="background:var(--warn);"></span>Draw ${Math.round(drawPct)}%</span>
          <span><span class="swatch-dot" style="background:var(--danger);"></span>Loss ${Math.round(lossPct)}%</span>
        </div>`;
    }

    // Colors played: main-color presence and splash presence, per color.
    const colorCard = document.getElementById("color-usage-card");
    const deckCountNote = document.getElementById("deck-count-note");

    if (deckStats.totalDecks === 0) {
      deckCountNote.textContent = "";
      colorCard.innerHTML = '<p class="empty-state">No decks recorded yet.</p>';
    } else {
      deckCountNote.textContent = `Across ${deckStats.totalDecks} deck(s) played (one tournament counts as one deck).`;

      const mainPct = {};
      const splashPct = {};
      EloApp.COLORS.forEach((c) => {
        mainPct[c] = Math.round((deckStats.colorPresenceMain[c] / deckStats.totalDecks) * 100);
        splashPct[c] = Math.round((deckStats.colorPresenceSplash[c] / deckStats.totalDecks) * 100);
      });

      colorCard.innerHTML = `
        <div id="color-radar"></div>
        <div class="legend-row" style="justify-content:center; margin-top:4px;">
          <span><span class="swatch-dot" style="background:var(--accent);"></span>solid = main color</span>
          <span><span class="swatch-dot" style="background:var(--accent-dark); opacity:.6;"></span>dashed = splash</span>
        </div>`;
      EloApp.renderColorRadarChart(document.getElementById("color-radar"), mainPct, splashPct);
    }

    // Colors per deck: distribution of how many MAIN colors a deck has,
    // plus how often a splash color was added on top.
    const colorDistCard = document.getElementById("color-dist-card");
    if (deckStats.totalDecks === 0) {
      colorDistCard.innerHTML = '<p class="empty-state">No decks recorded yet.</p>';
    } else {
      const distLabels = { 0: "Colorless", 1: "Mono-color", 2: "Two-color", 3: "Three-color", 4: "Four-color", 5: "Five-color" };
      const rows = [0, 1, 2, 3, 4, 5]
        .filter((n) => n > 0 || deckStats.colorCountHist[0] > 0)
        .map((n) => {
          const count = deckStats.colorCountHist[n];
          const pct = Math.round((count / deckStats.totalDecks) * 100);
          return `<div class="color-bar">
            <div class="bar-label">${distLabels[n]}</div>
            ${statBar([{ pct, color: "var(--accent)", label: distLabels[n] }])}
            <div class="count">${pct}% <span style="opacity:.6;">(${count})</span></div>
          </div>`;
        })
        .join("");

      const splashRow = `<div class="color-bar">
        <div class="bar-label">Splash used</div>
        ${statBar([{ pct: splashRate, color: "var(--accent-dark)", label: "Splash used" }])}
        <div class="count">${splashRate}% <span style="opacity:.6;">(${deckStats.splashDeckCount})</span></div>
      </div>`;

      colorDistCard.innerHTML = rows + `<hr style="border:none; border-top:1px solid var(--border); margin:14px 0;">` + splashRow;
    }

    // Archetypes played (one per deck, same tournament-based dedup as colors)
    const archetypeCard = document.getElementById("archetype-card");
    if (deckStats.totalDecks === 0) {
      archetypeCard.innerHTML = '<p class="empty-state">No decks recorded yet.</p>';
    } else {
      const entries = Object.entries(deckStats.archetypeCounts).sort((a, b) => b[1] - a[1]);
      archetypeCard.innerHTML = entries
        .map(([name, count]) => {
          const pct = Math.round((count / deckStats.totalDecks) * 100);
          return `<div class="color-bar">
            <div class="bar-label">${escapeHtml(name)}</div>
            ${statBar([{ pct, color: "var(--accent)", label: name }])}
            <div class="count">${pct}% <span style="opacity:.6;">(${count})</span></div>
          </div>`;
        })
        .join("");
    }

    // Match history (only this player's matches)
    const myMatches = matchLog.filter((m) => m.playerA === playerId || m.playerB === playerId).reverse();
    const matchesBody = document.getElementById("matches-body");
    if (myMatches.length === 0) {
      matchesBody.innerHTML = '<tr><td colspan="6" class="empty-state">No matches recorded yet.</td></tr>';
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
          const mySplash = isA ? m.splashA : m.splashB;
          const oppSplash = isA ? m.splashB : m.splashA;
          const myArchetypes = isA ? m.archetypesA : m.archetypesB;
          const oppArchetypes = isA ? m.archetypesB : m.archetypesA;
          const roundPart = m.round ? `Round ${m.round}` : "";
          const namePart = m.tournamentName ? escapeHtml(m.tournamentName) : "";
          const suffix = [namePart, roundPart].filter(Boolean).join(" · ");
          const dateLabel = suffix ? `${m.date} <span style="color:var(--text-muted);">· ${suffix}</span>` : m.date;

          return `<tr>
            <td>${dateLabel}</td>
            <td><a href="player.html?id=${encodeURIComponent(oppId)}">${escapeHtml(oppName)}</a></td>
            <td>${myScore}-${oppScore} ${EloApp.resultBadge(myScore, oppScore)}</td>
            <td>${colorPips(myColors, mySplash)}${archetypeLine(myArchetypes)}</td>
            <td>${colorPips(oppColors, oppSplash)}${archetypeLine(oppArchetypes)}</td>
            <td class="num">${EloApp.eloDelta(delta)}</td>
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
