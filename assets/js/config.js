/**
 * Configurazione del sito. Modifica i valori qui sotto prima di pubblicare
 * il sito su GitHub Pages (vedi README.md per la guida passo passo).
 */
window.EloApp = window.EloApp || {};

window.EloApp.CONFIG = {
  // --- DA MODIFICARE PRIMA DELLA PUBBLICAZIONE ---
  GITHUB_OWNER: "TUO-USERNAME-GITHUB", // es. "altarfede"
  GITHUB_REPO: "mtg-elo-tracker",      // nome del repository su GitHub
  GITHUB_BRANCH: "main",

  // --- Personalizzazione ---
  SITE_NAME: "Elo del Gruppo",         // nome del vostro gruppo di gioco

  // --- Parametri del sistema Elo (puoi modificarli, ma tienili coerenti
  //     per tutto lo storico: cambiarli a metà stagione altera i calcoli
  //     futuri, non quelli passati, perché l'Elo viene ricalcolato da zero
  //     ad ogni caricamento della pagina) ---
  BASE_ELO: 1200,                 // Elo di partenza per ogni nuovo giocatore
  BASE_K: 32,                     // K-factor standard
  SINGLE_GAME_K_MULTIPLIER: 0.9,  // K ridotto per risultati "corti" 1-0 / 0-1
};
