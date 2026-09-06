(async function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const msgArea = document.getElementById("msg-area");
  const playersBody = document.getElementById("players-body");
  const form = document.getElementById("new-player-form");
  const nameInput = document.getElementById("player-name");
  const joinedInput = document.getElementById("player-joined");
  const newPlayerMsg = document.getElementById("new-player-msg");
  const submitBtn = document.getElementById("submit-player-btn");

  joinedInput.value = new Date().toISOString().slice(0, 10);

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showMsg(el, type, text) {
    el.innerHTML = `<div class="msg ${type}">${text}</div>`;
  }

  let cachedPlayers = [];
  let cachedMatches = [];

  async function render() {
    try {
      const { players, matches } = await EloApp.loadData();
      cachedPlayers = players;
      cachedMatches = matches;

      if (players.length === 0) {
        playersBody.innerHTML = `<tr><td colspan="4" class="empty-state">Nessun giocatore ancora. Aggiungine uno qui sotto.</td></tr>`;
        return;
      }

      const { standings } = EloApp.computeStandings(players, matches, cfg);
      playersBody.innerHTML = standings
        .map(
          (s) => `<tr>
            <td><a class="player-link" href="player.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.name)}</a></td>
            <td class="num">${Math.round(s.elo)}</td>
            <td class="num">${s.matches}</td>
            <td>${s.joined || "—"}</td>
          </tr>`
        )
        .join("");
    } catch (err) {
      showMsg(msgArea, "error", err.message || err);
      playersBody.innerHTML = `<tr><td colspan="4" class="empty-state">Errore nel caricamento dati.</td></tr>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    newPlayerMsg.innerHTML = "";

    const name = nameInput.value.trim();
    const joined = joinedInput.value;
    if (!name) return;

    if (!EloApp.github.hasToken()) {
      showMsg(newPlayerMsg, "error", 'Nessun token configurato. Vai in <a href="settings.html">Impostazioni</a>.');
      return;
    }

    const duplicate = cachedPlayers.some((p) => p.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      showMsg(newPlayerMsg, "error", "Esiste già un giocatore con questo nome.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvataggio…";

    try {
      const { content: freshPlayers, sha } = await EloApp.github.getFileWithSha("data/players.json");
      const id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const newPlayer = { id, name, joined };
      const updated = [...freshPlayers, newPlayer];

      await EloApp.github.saveJsonFile("data/players.json", updated, `Aggiunto giocatore: ${name}`, sha);

      showMsg(newPlayerMsg, "success", `${escapeHtml(name)} è stato aggiunto! Potrebbero volerci alcuni secondi prima che il sito pubblicato si aggiorni.`);
      nameInput.value = "";
      joinedInput.value = new Date().toISOString().slice(0, 10);
      await render();
    } catch (err) {
      showMsg(newPlayerMsg, "error", err.message || err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Aggiungi giocatore";
    }
  });

  render();
})();
