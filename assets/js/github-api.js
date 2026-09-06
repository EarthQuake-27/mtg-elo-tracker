/**
 * Scrittura dei dati su GitHub tramite le API REST (Contents API), chiamate
 * direttamente dal browser. Serve un Personal Access Token con permesso di
 * scrittura sui contenuti del repository (vedi README.md per come crearlo).
 *
 * Il token viene salvato SOLO nel localStorage del tuo browser: non viene
 * mai inviato a nessun altro servizio se non alle API ufficiali di GitHub.
 * Chi visita il sito senza aver configurato un token può solo leggere i
 * dati (classifica, statistiche), non modificarli.
 */
(function (window) {
  const TOKEN_KEY = "mtgelo_gh_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function hasToken() {
    return getToken().length > 0;
  }

  function apiUrl(path) {
    const cfg = window.EloApp.CONFIG;
    return `https://api.github.com/repos/${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO}/contents/${path}`;
  }

  function toBase64Utf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function fromBase64Utf8(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  async function authHeaders() {
    const token = getToken();
    if (!token) {
      throw new Error("Nessun token GitHub configurato. Vai nella pagina Impostazioni.");
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };
  }

  /** Legge un file JSON dal repo insieme al suo sha (serve per poterlo aggiornare). */
  async function getFileWithSha(path) {
    const cfg = window.EloApp.CONFIG;
    const headers = await authHeaders();
    const res = await fetch(`${apiUrl(path)}?ref=${cfg.GITHUB_BRANCH}`, { headers });
    if (!res.ok) {
      throw new Error(
        `Impossibile leggere "${path}" da GitHub (status ${res.status}). Controlla token, owner e nome repo in config.js.`
      );
    }
    const data = await res.json();
    const content = JSON.parse(fromBase64Utf8(data.content));
    return { content, sha: data.sha };
  }

  /** Sovrascrive un file JSON nel repo con un nuovo contenuto (commit automatico). */
  async function saveJsonFile(path, newContent, commitMessage, sha) {
    const cfg = window.EloApp.CONFIG;
    const headers = await authHeaders();
    const body = {
      message: commitMessage,
      content: toBase64Utf8(JSON.stringify(newContent, null, 2) + "\n"),
      branch: cfg.GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(apiUrl(path), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 409) {
        throw new Error(
          "Conflitto: qualcun altro (o un'altra scheda) ha modificato i dati nel frattempo. Ricarica la pagina e riprova."
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Token non valido o senza i permessi necessari. Controlla la pagina Impostazioni."
        );
      }
      throw new Error(`Salvataggio fallito (status ${res.status}): ${errBody.message || "errore sconosciuto"}`);
    }
    return res.json();
  }

  /** Verifica che token, owner e repo siano configurati correttamente. */
  async function testConnection() {
    await getFileWithSha("data/players.json");
    return true;
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.github = {
    getToken,
    setToken,
    clearToken,
    hasToken,
    getFileWithSha,
    saveJsonFile,
    testConnection,
  };
})(window);
