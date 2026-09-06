(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  const { escapeHtml, colorPips, archetypeLine, statBar, eloDelta } = EloApp;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const selectA = document.getElementById("player-a-select");
  const selectB = document.getElementById("player-b-select");
  const emptyCard = document.getElementById("h2h-empty");
  const content = document.getElementById("h2h-content");

  function showError(text) {
    msgArea.innerHTML = `<div class="msg error">${text}</div>`;
  }

  let standings = [];
  let matchLog = [];

  function eloOf(id) {
    const s = standings.find((x) => x.id === id);
    return s ? Math.round(s.elo) : "—";
  }
  function nameOf(id) {
    const s = standings.find((x) => x.id === id);
    return s ? s.name : "?";
  }

  function render() {
    const idA = selectA.value;
    const idB = selectB.value;

    if (!idA || !idB || idA === idB) {
      content.hidden = true;
      emptyCard.hidden = false;
      if (idA && idA === idB) {
        emptyCard.querySelector("p").textContent = "Pick two different players to compare.";
      } else {
        emptyCard.querySelector("p").textContent = "Pick two different players above to see their head-to-head record.";
      }
      return;
    }

    emptyCard.hidden = true;
    content.hidden = false;

    const nameA = nameOf(idA);
    const nameB = nameOf(idB);

    const rows = matchLog
      .filter((m) => (m.playerA === idA && m.playerB === idB) || (m.playerA === idB && m.playerB === idA))
      .map((m) => {
        const aFirst = m.playerA === idA;
        return {
          date: m.date,
          round: m.round,
          tournamentName: m.tournamentName,
          scoreA: aFirst ? m.scoreA : m.scoreB,
          scoreB: aFirst ? m.scoreB : m.scoreA,
          colorsA: aFirst ? m.colorsA : m.colorsB,
          colorsB: aFirst ? m.colorsB : m.colorsA,
          splashA: aFirst ? m.splashA : m.splashB,
          splashB: aFirst ? m.splashB : m.splashA,
          archetypesA: aFirst ? m.archetypesA : m.archetypesB,
          archetypesB: aFirst ? m.archetypesB : m.archetypesA,
          deltaA: aFirst ? m.deltaA : m.deltaB,
          deltaB: aFirst ? m.deltaB : m.deltaA,
        };
      });

    let aWins = 0;
    let draws = 0;
    let bWins = 0;
    let gamesA = 0;
    let gamesB = 0;
    rows.forEach((r) => {
      if (r.scoreA > r.scoreB) aWins++;
      else if (r.scoreA < r.scoreB) bWins++;
      else draws++;
      gamesA += r.scoreA;
      gamesB += r.scoreB;
    });
    const total = rows.length;
    const aWinRate = total > 0 ? Math.round(((aWins + draws * 0.5) / total) * 100) : 0;

    document.getElementById("h2h-title").textContent = `${nameA} vs ${nameB}`;
    document.getElementById("h2h-a-name-label").textContent = `${nameA} Elo`;
    document.getElementById("h2h-b-name-label").textContent = `${nameB} Elo`;
    document.getElementById("h2h-a-elo").textContent = eloOf(idA);
    document.getElementById("h2h-b-elo").textContent = eloOf(idB);
    document.getElementById("h2h-matches").textContent = total;
    document.getElementById("h2h-record-label").textContent = `Record (${nameA}-D-${nameB})`;
    document.getElementById("h2h-record").textContent = `${aWins}-${draws}-${bWins}`;
    document.getElementById("h2h-winrate-label").textContent = `${nameA} win rate`;
    document.getElementById("h2h-winrate").textContent = total > 0 ? `${aWinRate}%` : "—";
    document.getElementById("h2h-games").textContent = `${gamesA}-${gamesB}`;
    document.getElementById("h2h-a-deck-header").textContent = `${nameA}'s deck`;
    document.getElementById("h2h-b-deck-header").textContent = `${nameB}'s deck`;

    const recordBarEl = document.getElementById("h2h-record-bar");
    if (total === 0) {
      recordBarEl.innerHTML = '<p class="empty-state" style="padding:8px 0;">These two haven\'t played each other yet.</p>';
    } else {
      const aPct = (aWins / total) * 100;
      const drawPct = (draws / total) * 100;
      const bPct = (bWins / total) * 100;
      recordBarEl.innerHTML = `
        ${statBar([
          { pct: aPct, color: "var(--success)", label: `${nameA} wins` },
          { pct: drawPct, color: "var(--warn)", label: "Draws" },
          { pct: bPct, color: "var(--danger)", label: `${nameB} wins` },
        ])}
        <div class="legend-row">
          <span><span class="swatch-dot" style="background:var(--success);"></span>${escapeHtml(nameA)} ${Math.round(aPct)}%</span>
          <span><span class="swatch-dot" style="background:var(--warn);"></span>Draw ${Math.round(drawPct)}%</span>
          <span><span class="swatch-dot" style="background:var(--danger);"></span>${escapeHtml(nameB)} ${Math.round(bPct)}%</span>
        </div>`;
    }

    const body = document.getElementById("h2h-matches-body");
    if (total === 0) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">No matches recorded between these two yet.</td></tr>';
    } else {
      body.innerHTML = [...rows]
        .reverse()
        .map((r) => {
          const roundPart = r.round ? `Round ${r.round}` : "";
          const namePart = r.tournamentName ? escapeHtml(r.tournamentName) : "";
          const suffix = [namePart, roundPart].filter(Boolean).join(" · ");
          const dateLabel = suffix ? `${r.date} <span style="color:var(--text-muted);">· ${suffix}</span>` : r.date;
          return `<tr>
            <td>${dateLabel}</td>
            <td>${r.scoreA}-${r.scoreB} ${EloApp.resultBadge(r.scoreA, r.scoreB)}</td>
            <td>${colorPips(r.colorsA, r.splashA)}${archetypeLine(r.archetypesA)}</td>
            <td>${colorPips(r.colorsB, r.splashB)}${archetypeLine(r.archetypesB)}</td>
            <td class="num">${eloDelta(r.deltaA)} / ${eloDelta(r.deltaB)}</td>
          </tr>`;
        })
        .join("");
    }
  }

  function populateSelect(select, players, placeholder) {
    select.innerHTML =
      `<option value="">${placeholder}</option>` +
      players.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  }

  try {
    const { players, matches } = await EloApp.loadData();

    if (players.length < 2) {
      showError('At least two players are needed for a head-to-head comparison. <a href="players.html">Add players</a>.');
      return;
    }

    const computed = EloApp.computeStandings(players, matches, cfg);
    standings = computed.standings;
    matchLog = computed.matchLog;

    const sortedByName = [...players].sort((a, b) => a.name.localeCompare(b.name));
    populateSelect(selectA, sortedByName, "-- Player A --");
    populateSelect(selectB, sortedByName, "-- Player B --");

    const params = new URLSearchParams(window.location.search);
    const presetA = params.get("a");
    const presetB = params.get("b");
    if (presetA && players.some((p) => p.id === presetA)) selectA.value = presetA;
    if (presetB && players.some((p) => p.id === presetB)) selectB.value = presetB;

    selectA.addEventListener("change", render);
    selectB.addEventListener("change", render);

    render();
  } catch (err) {
    showError(err.message || String(err));
  }
})();
