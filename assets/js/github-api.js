/**
 * Writes data to GitHub via the REST API (Contents API), called directly
 * from the browser. Requires a Personal Access Token with write access to
 * the repository's contents (see README.md for how to create one).
 *
 * The token is stored ONLY in your browser's localStorage: it is never
 * sent anywhere except GitHub's official API. Anyone visiting the site
 * without a configured token can only read the data (standings, stats),
 * not change it.
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
      throw new Error("No GitHub token configured. Go to the Settings page.");
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };
  }

  /** Reads a JSON file from the repo along with its sha (needed to update it). */
  async function getFileWithSha(path) {
    const cfg = window.EloApp.CONFIG;
    const headers = await authHeaders();
    const res = await fetch(`${apiUrl(path)}?ref=${cfg.GITHUB_BRANCH}`, { headers });
    if (!res.ok) {
      throw new Error(
        `Could not read "${path}" from GitHub (status ${res.status}). Check the token, owner and repo name in config.js.`
      );
    }
    const data = await res.json();
    const content = JSON.parse(fromBase64Utf8(data.content));
    return { content, sha: data.sha };
  }

  /** Overwrites a JSON file in the repo with new content (automatic commit). */
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
          "Conflict: someone else (or another tab) changed the data in the meantime. Reload the page and try again."
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid token or missing permissions. Check the Settings page.");
      }
      throw new Error(`Save failed (status ${res.status}): ${errBody.message || "unknown error"}`);
    }
    return res.json();
  }

  /** Checks that the token, owner and repo are configured correctly. */
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
