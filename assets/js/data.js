/**
 * Loads the data (players and matches) from the site's JSON files.
 * Note: if you open the .html files directly from Finder (file://
 * protocol) the browser blocks these fetches for security reasons (CORS).
 * To test locally you need a small static server (see README.md). On
 * GitHub Pages everything works automatically.
 */
(function (window) {
  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not load ${path} (status ${res.status})`);
    }
    return res.json();
  }

  async function loadData() {
    const [players, matches] = await Promise.all([
      fetchJson("data/players.json"),
      fetchJson("data/matches.json"),
    ]);
    return { players, matches };
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.loadData = loadData;
})(window);
