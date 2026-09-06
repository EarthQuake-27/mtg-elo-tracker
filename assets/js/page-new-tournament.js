(function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const step1 = document.getElementById("step-1");
  const step2 = document.getElementById("step-2");
  const step1Msg = document.getElementById("step1-msg");
  const step2Msg = document.getElementById("step2-msg");
  const participantsList = document.getElementById("participants-list");
  const addParticipantBtn = document.getElementById("add-participant-btn");
  const tournamentDateInput = document.getElementById("tournament-date");
  const roundsCountInput = document.getElementById("rounds-count");
  const toStep2Btn = document.getElementById("to-step2-btn");
  const backToStep1Btn = document.getElementById("back-to-step1-btn");
  const roundsContainer = document.getElementById("rounds-container");
  const saveTournamentBtn = document.getElementById("save-tournament-btn");

  tournamentDateInput.value = new Date().toISOString().slice(0, 10);

  const SCORE_OPTIONS = {
    A: [
      { label: "2 - 0", scoreA: 2, scoreB: 0 },
      { label: "2 - 1", scoreA: 2, scoreB: 1 },
      { label: "1 - 0", scoreA: 1, scoreB: 0 },
    ],
    DRAW: [
      { label: "1 - 1", scoreA: 1, scoreB: 1 },
      { label: "0 - 0", scoreA: 0, scoreB: 0 },
    ],
    B: [
      { label: "0 - 2", scoreA: 0, scoreB: 2 },
      { label: "1 - 2", scoreA: 1, scoreB: 2 },
      { label: "0 - 1", scoreA: 0, scoreB: 1 },
    ],
  };
  const OUTCOME_LABELS = { A: "Vince A", DRAW: "Pareggio", B: "Vince B" };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showMsg(el, type, textOrList) {
    if (Array.isArray(textOrList)) {
      el.innerHTML = `<div class="msg error"><ul style="margin:0; padding-left:18px;">${textOrList
        .map((t) => `<li>${t}</li>`)
        .join("")}</ul></div>`;
    } else {
      el.innerHTML = `<div class="msg ${type}">${textOrList}</div>`;
    }
  }

  function genId(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  // --- Colori mazzo (checkbox) ---
  function buildColorCheckboxes(container, prefix) {
    container.innerHTML = EloApp.COLORS.map((c) => {
      const meta = EloApp.COLOR_META[c];
      return `<label class="color-check" data-color="${c}">
        <input type="checkbox" value="${c}" id="${prefix}-${c}">
        <span class="dot" style="background:${meta.hex};"></span>
        ${meta.name}
      </label>`;
    }).join("");

    container.querySelectorAll(".color-check").forEach((label) => {
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => label.classList.toggle("checked", checkbox.checked));
    });
  }

  function getSelectedColors(container) {
    return Array.from(container.querySelectorAll("input:checked")).map((i) => i.value);
  }

  // --- Step 1: partecipanti ---
  let players = [];
  let participantRows = [];
  let rowUid = 0;

  function addParticipantRow() {
    const uid = rowUid++;
    const row = document.createElement("div");
    row.className = "participant-row";
    row.innerHTML = `
      <div class="combobox-col"></div>
      <div class="colors-col">
        <div class="color-check-group" id="colors-${uid}"></div>
      </div>
      <div class="remove-col"><button type="button" class="row-remove-btn" title="Rimuovi giocatore">✕</button></div>
    `;
    participantsList.appendChild(row);

    const combo = EloApp.createPlayerCombobox(row.querySelector(".combobox-col"), players, {
      placeholder: "Nome giocatore",
    });
    const colorsContainer = row.querySelector(".color-check-group");
    buildColorCheckboxes(colorsContainer, `pc${uid}`);

    row.querySelector(".row-remove-btn").addEventListener("click", () => {
      row.remove();
      participantRows = participantRows.filter((r) => r.row !== row);
    });

    participantRows.push({ row, combo, colorsContainer });
  }

  function gatherParticipants() {
    const errors = [];
    const result = [];
    const seenKeys = new Set();

    participantRows.forEach((pr, idx) => {
      const val = pr.combo.getValue();
      const colors = getSelectedColors(pr.colorsContainer);

      if (val.mode === "empty" && colors.length === 0) return; // riga vuota, ignorata

      if (val.mode === "empty" && colors.length > 0) {
        errors.push(`Riga ${idx + 1}: hai selezionato dei colori ma non hai scritto un nome.`);
        return;
      }
      if (colors.length === 0) {
        errors.push(`${escapeHtml(val.name)}: seleziona almeno un colore per il mazzo.`);
        return;
      }
      const key = val.mode === "existing" ? `id:${val.id}` : `name:${val.name.trim().toLowerCase()}`;
      if (seenKeys.has(key)) {
        errors.push(`"${escapeHtml(val.name)}" compare più di una volta tra i partecipanti.`);
        return;
      }
      seenKeys.add(key);
      result.push({ name: val.name.trim(), colors, existingId: val.mode === "existing" ? val.id : null });
    });

    return { result, errors };
  }

  addParticipantBtn.addEventListener("click", addParticipantRow);

  // --- Step 2: turni e matchup ---
  let resolvedParticipants = [];
  let tournamentDate = "";
  let roundsCount = 3;

  function buildOutcomeButtons(outcomeGroupEl, scoreGroupEl, state) {
    outcomeGroupEl.innerHTML = Object.keys(SCORE_OPTIONS)
      .map((o) => `<button type="button" class="choice-btn" data-outcome="${o}">${OUTCOME_LABELS[o]}</button>`)
      .join("");
    outcomeGroupEl.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        outcomeGroupEl.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.outcome = btn.dataset.outcome;
        renderScoreButtons(scoreGroupEl, state);
      });
    });
  }

  function renderScoreButtons(scoreGroupEl, state) {
    if (!state.outcome) {
      scoreGroupEl.innerHTML = "";
      return;
    }
    scoreGroupEl.innerHTML = SCORE_OPTIONS[state.outcome]
      .map((opt, i) => `<button type="button" class="choice-btn" data-i="${i}">${opt.label}</button>`)
      .join("");
    state.score = null;
    scoreGroupEl.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        scoreGroupEl.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.score = SCORE_OPTIONS[state.outcome][Number(btn.dataset.i)];
      });
    });
  }

  function addMatchupRow(container, participantsForRound) {
    const row = document.createElement("div");
    row.className = "matchup-row";
    const options = participantsForRound
      .map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`)
      .join("");
    row.innerHTML = `
      <div class="vs-select">
        <label style="margin-top:0;">Giocatore A</label>
        <select class="matchup-a"><option value="">-- scegli --</option>${options}</select>
      </div>
      <div class="vs-sep">vs</div>
      <div class="vs-select">
        <label style="margin-top:0;">Giocatore B</label>
        <select class="matchup-b"><option value="">-- scegli --</option>${options}</select>
      </div>
      <div class="outcome-col">
        <label style="margin-top:0;">Esito</label>
        <div class="choice-group outcome-group"></div>
        <div class="choice-group score-group" style="margin-top:8px;"></div>
      </div>
      <div class="remove-col"><button type="button" class="row-remove-btn" title="Rimuovi matchup">✕</button></div>
    `;
    container.appendChild(row);

    const aSelect = row.querySelector(".matchup-a");
    const bSelect = row.querySelector(".matchup-b");
    const outcomeGroupEl = row.querySelector(".outcome-group");
    const scoreGroupEl = row.querySelector(".score-group");
    const state = { outcome: null, score: null };
    buildOutcomeButtons(outcomeGroupEl, scoreGroupEl, state);

    row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());

    row._getValue = () => {
      const aVal = aSelect.value;
      const bVal = bSelect.value;
      const isEmpty = aVal === "" && bVal === "" && !state.outcome;
      if (isEmpty) return { status: "empty" };
      if (aVal === "" || bVal === "") return { status: "incomplete", reason: "seleziona entrambi i giocatori" };
      if (aVal === bVal) return { status: "incomplete", reason: "i due giocatori devono essere diversi" };
      if (!state.outcome || !state.score) return { status: "incomplete", reason: "seleziona esito e punteggio" };
      return {
        status: "ok",
        aIndex: Number(aVal),
        bIndex: Number(bVal),
        scoreA: state.score.scoreA,
        scoreB: state.score.scoreB,
      };
    };
  }

  function renderStep2() {
    roundsContainer.innerHTML = "";
    const defaultMatchups = Math.max(1, Math.floor(resolvedParticipants.length / 2));

    for (let r = 1; r <= roundsCount; r++) {
      const roundCard = document.createElement("div");
      roundCard.className = "card round-card";
      roundCard.dataset.round = String(r);
      roundCard.innerHTML = `<h3>Turno ${r}</h3><div class="matchups-list"></div>`;
      const matchupsList = roundCard.querySelector(".matchups-list");

      for (let i = 0; i < defaultMatchups; i++) addMatchupRow(matchupsList, resolvedParticipants);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn secondary";
      addBtn.style.marginTop = "10px";
      addBtn.textContent = "+ Aggiungi matchup";
      addBtn.addEventListener("click", () => addMatchupRow(matchupsList, resolvedParticipants));
      roundCard.appendChild(addBtn);

      roundsContainer.appendChild(roundCard);
    }
  }

  toStep2Btn.addEventListener("click", () => {
    step1Msg.innerHTML = "";
    const { result, errors } = gatherParticipants();

    if (!tournamentDateInput.value) errors.push("Inserisci la data del torneo.");
    const roundsVal = parseInt(roundsCountInput.value, 10);
    if (!roundsVal || roundsVal < 1) errors.push("Inserisci un numero di turni valido (almeno 1).");
    if (result.length < 2) errors.push("Servono almeno due partecipanti.");

    if (errors.length) {
      showMsg(step1Msg, "error", errors);
      return;
    }

    resolvedParticipants = result;
    tournamentDate = tournamentDateInput.value;
    roundsCount = Math.min(roundsVal, 12);

    renderStep2();
    step1.hidden = true;
    step2.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  backToStep1Btn.addEventListener("click", () => {
    step2.hidden = true;
    step1.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // --- Salvataggio ---
  saveTournamentBtn.addEventListener("click", async () => {
    step2Msg.innerHTML = "";

    if (!EloApp.github.hasToken()) {
      showMsg(step2Msg, "error", 'Nessun token configurato. Vai in <a href="settings.html">Impostazioni</a>.');
      return;
    }

    const errors = [];
    const matchesByRound = [];
    roundsContainer.querySelectorAll(".round-card").forEach((roundCard) => {
      const round = Number(roundCard.dataset.round);
      const valid = [];
      roundCard.querySelectorAll(".matchup-row").forEach((row, i) => {
        const v = row._getValue();
        if (v.status === "empty") return;
        if (v.status === "incomplete") {
          errors.push(`Turno ${round}, matchup ${i + 1}: ${v.reason}.`);
          return;
        }
        valid.push(v);
      });
      matchesByRound.push({ round, valid });
    });

    const totalValid = matchesByRound.reduce((n, r) => n + r.valid.length, 0);
    if (totalValid === 0) errors.push("Non hai inserito nessun risultato.");

    if (errors.length) {
      showMsg(step2Msg, "error", errors);
      return;
    }

    saveTournamentBtn.disabled = true;
    backToStep1Btn.disabled = true;
    saveTournamentBtn.textContent = "Salvataggio…";

    try {
      // 1. Crea eventuali nuovi giocatori
      const newParticipants = resolvedParticipants.filter((p) => !p.existingId);
      if (newParticipants.length > 0) {
        const { content: freshPlayers, sha } = await EloApp.github.getFileWithSha("data/players.json");
        newParticipants.forEach((p) => {
          p.finalId = genId("p");
        });
        const newPlayerObjs = newParticipants.map((p) => ({ id: p.finalId, name: p.name, joined: tournamentDate }));
        const updatedPlayers = [...freshPlayers, ...newPlayerObjs];
        await EloApp.github.saveJsonFile(
          "data/players.json",
          updatedPlayers,
          `Nuovi giocatori dal torneo del ${tournamentDate}: ${newParticipants.map((p) => p.name).join(", ")}`,
          sha
        );
      }
      resolvedParticipants.forEach((p) => {
        if (p.existingId) p.finalId = p.existingId;
      });

      // 2. Costruisci e salva tutte le partite del torneo in un unico commit
      const tournamentId = genId("t");
      let matchCounter = 0;
      const newMatches = [];
      matchesByRound.forEach(({ round, valid }) => {
        valid.forEach((v) => {
          const pA = resolvedParticipants[v.aIndex];
          const pB = resolvedParticipants[v.bIndex];
          newMatches.push({
            id: `${tournamentId}_r${round}_${matchCounter++}`,
            date: tournamentDate,
            tournamentId,
            round,
            playerA: pA.finalId,
            playerB: pB.finalId,
            scoreA: v.scoreA,
            scoreB: v.scoreB,
            colorsA: pA.colors,
            colorsB: pB.colors,
            note: "",
          });
        });
      });

      const { content: freshMatches, sha: matchesSha } = await EloApp.github.getFileWithSha("data/matches.json");
      const updatedMatches = [...freshMatches, ...newMatches];
      await EloApp.github.saveJsonFile(
        "data/matches.json",
        updatedMatches,
        `Torneo del ${tournamentDate}: ${newMatches.length} partite, ${roundsCount} turni`,
        matchesSha
      );

      showMsg(
        step2Msg,
        "success",
        `Torneo salvato: ${newMatches.length} partite in ${roundsCount} turni` +
          (newParticipants.length ? `, ${newParticipants.length} nuovo/i giocatore/i creato/i` : "") +
          `. Potrebbero volerci alcuni secondi prima che il sito pubblicato si aggiorni. Vai alla <a href="index.html">Classifica</a>.`
      );

      resetForm();
    } catch (err) {
      showMsg(step2Msg, "error", err.message || String(err));
    } finally {
      saveTournamentBtn.disabled = false;
      backToStep1Btn.disabled = false;
      saveTournamentBtn.textContent = "Salva torneo";
    }
  });

  function resetForm() {
    participantsList.innerHTML = "";
    participantRows = [];
    for (let i = 0; i < 8; i++) addParticipantRow();
    tournamentDateInput.value = new Date().toISOString().slice(0, 10);
    roundsCountInput.value = "3";
    step2.hidden = true;
    step1.hidden = false;
    step1Msg.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Init ---
  (async function init() {
    try {
      const data = await EloApp.loadData();
      players = data.players;
      for (let i = 0; i < 8; i++) addParticipantRow();
      if (players.length === 0) {
        showMsg(
          msgArea,
          "info",
          "Non c'è ancora nessun giocatore: scrivi semplicemente i nomi dei partecipanti, verranno creati automaticamente."
        );
      }
    } catch (err) {
      showMsg(msgArea, "error", err.message || String(err));
    }
  })();
})();
