(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;
  document.getElementById("cfg-base-elo").textContent = cfg.BASE_ELO;
  document.getElementById("cfg-base-k").textContent = cfg.BASE_K;

  const msgArea = document.getElementById("msg-area");
  const rankingBody = document.getElementById("ranking-body");
  const recentBody = document.getElementById("recent-body");

  function showError(err) {
    msgArea.innerHTML = `<div class="msg error">${err.message || err}</div>`;
  }

  function fmtElo(v) {
    return Math.round(v);
  }

  function outcomeBadge(sa) {
    if (sa === 1) return '<span class="badge win">V</span>';
    if (sa === 0) return '<span class="badge loss">S</span>';
    return '<span class="badge draw">P</span>';
  }

  try {
    const { players, matches } = await EloApp.loadData();

    if (players.length === 0) {
      rankingBody.innerHTML = `<tr><td colspan="6" class="empty-state">Nessun giocatore ancora. <a href="players.html">Aggiungine uno</a>.</td></tr>`;
    } else {
      const { standings, matchLog } = EloApp.computeStandings(players, matches, cfg);

      rankingBody.innerHTML = standings
        .map((s, i) => {
          const rank = i + 1;
          const rankClass = rank <= 3 ? `rank-${rank}` : "";
          const winrate = s.matches > 0 ? Math.round(((s.wins + s.draws * 0.5) / s.matches) * 100) : 0;
          return `<tr>
            <td class="${rankClass}">${rank}</td>
            <td><a class="player-link" href="player.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.name)}</a></td>
            <td class="num">${fmtElo(s.elo)}</td>
            <td class="num">${s.matches}</td>
            <td>${s.wins}-${s.draws}-${s.losses}</td>
            <td class="num">${s.matches > 0 ? winrate + "%" : "—"}</td>
          </tr>`;
        })
        .join("");

      if (matchLog.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="4" class="empty-state">Nessuna partita registrata ancora. <a href="new-match.html">Aggiungine una</a>.</td></tr>`;
      } else {
        const recent = [...matchLog].reverse().slice(0, 15);
        recentBody.innerHTML = recent
          .map((m) => {
            const sa = m.scoreA > m.scoreB ? 1 : m.scoreA < m.scoreB ? 0 : 0.5;
            const sb = 1 - sa;
            return `<tr>
              <td>${m.date}</td>
              <td><a href="player.html?id=${encodeURIComponent(m.playerA)}">${escapeHtml(m.nameA)}</a> ${outcomeBadge(sa)} vs ${outcomeBadge(sb)} <a href="player.html?id=${encodeURIComponent(m.playerB)}">${escapeHtml(m.nameB)}</a></td>
              <td>${m.scoreA} - ${m.scoreB}</td>
              <td class="num">
                <span class="${m.deltaA >= 0 ? "delta-pos" : "delta-neg"}">${m.deltaA >= 0 ? "+" : ""}${m.deltaA.toFixed(1)}</span>
                /
                <span class="${m.deltaB >= 0 ? "delta-pos" : "delta-neg"}">${m.deltaB >= 0 ? "+" : ""}${m.deltaB.toFixed(1)}</span>
              </td>
            </tr>`;
          })
          .join("");
      }
    }
  } catch (err) {
    showError(err);
    rankingBody.innerHTML = `<tr><td colspan="6" class="empty-state">Errore nel caricamento dati.</td></tr>`;
    recentBody.innerHTML = `<tr><td colspan="4" class="empty-state">Errore nel caricamento dati.</td></tr>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
