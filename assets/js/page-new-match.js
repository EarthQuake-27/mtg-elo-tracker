(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const formMsg = document.getElementById("form-msg");
  const form = document.getElementById("new-match-form");
  const playerASelect = document.getElementById("player-a");
  const playerBSelect = document.getElementById("player-b");
  const outcomeGroup = document.getElementById("outcome-group");
  const scoreGroup = document.getElementById("score-group");
  const colorsA = document.getElementById("colors-a");
  const colorsB = document.getElementById("colors-b");
  const dateInput = document.getElementById("match-date");
  const noteInput = document.getElementById("match-note");
  const submitBtn = document.getElementById("submit-match-btn");

  dateInput.value = new Date().toISOString().slice(0, 10);

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

  let selectedOutcome = null;
  let selectedScore = null;

  function showMsg(el, type, text) {
    el.innerHTML = `<div class="msg ${type}">${text}</div>`;
  }

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
      checkbox.addEventListener("change", () => {
        label.classList.toggle("checked", checkbox.checked);
      });
    });
  }

  function getSelectedColors(container) {
    return Array.from(container.querySelectorAll("input:checked")).map((i) => i.value);
  }

  function renderScoreOptions() {
    if (!selectedOutcome) {
      scoreGroup.innerHTML = '<span class="empty-state" style="padding:0;">Scegli prima l\'esito</span>';
      return;
    }
    scoreGroup.innerHTML = SCORE_OPTIONS[selectedOutcome]
      .map(
        (opt, i) =>
          `<button type="button" class="choice-btn" data-index="${i}">${opt.label}</button>`
      )
      .join("");
    selectedScore = null;
    scoreGroup.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        scoreGroup.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedScore = SCORE_OPTIONS[selectedOutcome][Number(btn.dataset.index)];
      });
    });
  }

  outcomeGroup.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      outcomeGroup.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedOutcome = btn.dataset.outcome;
      renderScoreOptions();
    });
  });

  buildColorCheckboxes(colorsA, "ca");
  buildColorCheckboxes(colorsB, "cb");

  let players = [];
  let matches = [];

  try {
    const data = await EloApp.loadData();
    players = data.players;
    matches = data.matches;

    if (players.length < 2) {
      showMsg(
        msgArea,
        "info",
        `Servono almeno due giocatori per registrare una partita. <a href="players.html">Aggiungili qui</a>.`
      );
    }

    const options = players
      .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
      .join("");
    playerASelect.innerHTML = options;
    playerBSelect.innerHTML = options;
    if (players.length > 1) playerBSelect.selectedIndex = 1;
  } catch (err) {
    showMsg(msgArea, "error", err.message || err);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formMsg.innerHTML = "";

    const playerA = playerASelect.value;
    const playerB = playerBSelect.value;

    if (!playerA || !playerB) {
      showMsg(formMsg, "error", "Seleziona entrambi i giocatori.");
      return;
    }
    if (playerA === playerB) {
      showMsg(formMsg, "error", "I due giocatori devono essere diversi.");
      return;
    }
    if (!selectedOutcome || !selectedScore) {
      showMsg(formMsg, "error", "Seleziona l'esito e il punteggio del match.");
      return;
    }
    if (!dateInput.value) {
      showMsg(formMsg, "error", "Inserisci la data della partita.");
      return;
    }
    if (!EloApp.github.hasToken()) {
      showMsg(formMsg, "error", 'Nessun token configurato. Vai in <a href="settings.html">Impostazioni</a>.');
      return;
    }

    const match = {
      id: "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: dateInput.value,
      playerA,
      playerB,
      scoreA: selectedScore.scoreA,
      scoreB: selectedScore.scoreB,
      colorsA: getSelectedColors(colorsA),
      colorsB: getSelectedColors(colorsB),
      note: noteInput.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvataggio…";

    try {
      const { content: freshMatches, sha } = await EloApp.github.getFileWithSha("data/matches.json");
      const updated = [...freshMatches, match];

      const nameA = players.find((p) => p.id === playerA)?.name || playerA;
      const nameB = players.find((p) => p.id === playerB)?.name || playerB;

      await EloApp.github.saveJsonFile(
        "data/matches.json",
        updated,
        `Nuova partita: ${nameA} ${match.scoreA}-${match.scoreB} ${nameB}`,
        sha
      );

      showMsg(
        formMsg,
        "success",
        `Partita salvata! Potrebbero volerci alcuni secondi prima che il sito pubblicato si aggiorni. Vai alla <a href="index.html">Classifica</a>.`
      );
      form.reset();
      selectedOutcome = null;
      selectedScore = null;
      outcomeGroup.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
      renderScoreOptions();
      colorsA.querySelectorAll(".color-check").forEach((l) => l.classList.remove("checked"));
      colorsB.querySelectorAll(".color-check").forEach((l) => l.classList.remove("checked"));
      dateInput.value = new Date().toISOString().slice(0, 10);
    } catch (err) {
      showMsg(formMsg, "error", err.message || err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Salva partita";
    }
  });
})();
