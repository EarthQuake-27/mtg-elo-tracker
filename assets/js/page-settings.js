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
    tokenInput.placeholder = "Token already saved in this browser (hidden)";
  }

  saveBtn.addEventListener("click", () => {
    const value = tokenInput.value.trim();
    if (!value) {
      showMsg("error", "Enter a token before saving.");
      return;
    }
    EloApp.github.setToken(value);
    tokenInput.value = "";
    tokenInput.placeholder = "Token already saved in this browser (hidden)";
    showMsg("success", "Token saved in this browser. Now try 'Test connection'.");
  });

  clearBtn.addEventListener("click", () => {
    EloApp.github.clearToken();
    tokenInput.placeholder = "github_pat_xxx...";
    showMsg("info", "Token removed from this browser.");
  });

  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = "Testing…";
    try {
      await EloApp.github.testConnection();
      showMsg("success", `Connection successful to ${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO}! You can now add tournaments and players.`);
    } catch (err) {
      showMsg("error", err.message || String(err));
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "Test connection";
    }
  });
})();
