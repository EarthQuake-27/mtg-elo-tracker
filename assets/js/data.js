/**
 * Caricamento dei dati (giocatori e partite) dai file JSON del sito.
 * Nota: se apri i file .html direttamente dal Finder (protocollo file://)
 * il browser blocca queste fetch per motivi di sicurezza (CORS). Per
 * testare in locale serve un piccolo server statico (vedi README.md).
 * Su GitHub Pages funziona tutto automaticamente.
 */
(function (window) {
  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Impossibile caricare ${path} (status ${res.status})`);
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
