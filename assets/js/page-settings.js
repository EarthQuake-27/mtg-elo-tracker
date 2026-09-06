(function () {
  const { EloApp } = window;
  const cfg = EloApp.CONFIG;
  document.getElementById("brand-name").textContent = cfg.SITE_NAME;

  const tokenInput = document.getElementById("gh-token");
  const msg = document.getElementById("settings-msg");
  const saveBtn = document.getElementById("save-token-btn");
  const testBtn = document.getElementById("test-token-btn");
  const clearBtn = document.getElementById("clear-token-btn");

  function showMsg(type, text) {
    msg.innerHTML = `<div class="msg ${type}">${text}</div>`;
  }

  if (EloApp.github.hasToken()) {
    tokenInput.placeholder = "Token già salvato in questo browser (nascosto)";
  }

  saveBtn.addEventListener("click", () => {
    const value = tokenInput.value.trim();
    if (!value) {
      showMsg("error", "Inserisci un token prima di salvare.");
      return;
    }
    EloApp.github.setToken(value);
    tokenInput.value = "";
    tokenInput.placeholder = "Token già salvato in questo browser (nascosto)";
    showMsg("success", "Token salvato in questo browser. Ora prova 'Verifica connessione'.");
  });

  clearBtn.addEventListener("click", () => {
    EloApp.github.clearToken();
    tokenInput.placeholder = "github_pat_xxx...";
    showMsg("info", "Token rimosso da questo browser.");
  });

  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = "Verifica in corso…";
    try {
      await EloApp.github.testConnection();
      showMsg("success", `Connessione riuscita a ${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO}! Puoi inserire partite e giocatori.`);
    } catch (err) {
      showMsg("error", err.message || String(err));
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "Verifica connessione";
    }
  });
})();
