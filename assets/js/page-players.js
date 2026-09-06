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

  async function render() {
    try {
      const { players, matches } = await EloApp.loadData();
      cachedPlayers = players;

      if (players.length === 0) {
        playersBody.innerHTML = `<tr><td colspan="4" class="empty-state">No players yet. Add one below.</td></tr>`;
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
      playersBody.innerHTML = `<tr><td colspan="4" class="empty-state">Error loading data.</td></tr>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    newPlayerMsg.innerHTML = "";

    const name = nameInput.value.trim();
    const joined = joinedInput.value;
    if (!name) return;

    if (!EloApp.github.hasToken()) {
      showMsg(newPlayerMsg, "error", 'No token configured. Go to <a href="settings.html">Settings</a>.');
      return;
    }

    const duplicate = cachedPlayers.some((p) => p.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      showMsg(newPlayerMsg, "error", "A player with this name already exists.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    try {
      const { content: freshPlayers, sha } = await EloApp.github.getFileWithSha("data/players.json");
      const id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const newPlayer = { id, name, joined };
      const updated = [...freshPlayers, newPlayer];

      await EloApp.github.saveJsonFile("data/players.json", updated, `Added player: ${name}`, sha);

      showMsg(newPlayerMsg, "success", `${escapeHtml(name)} was added! The published site may take a few seconds to update.`);
      nameInput.value = "";
      joinedInput.value = new Date().toISOString().slice(0, 10);
      await render();
    } catch (err) {
      showMsg(newPlayerMsg, "error", err.message || err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add player";
    }
  });

  render();
})();
