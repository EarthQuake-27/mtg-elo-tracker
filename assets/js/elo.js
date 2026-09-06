/**
 * Motore di calcolo Elo. Puro JS, nessuna dipendenza.
 *
 * Regole:
 * - Punteggio partita: vittoria = 1, pareggio (1-1 o 0-0) = 0.5, sconfitta = 0.
 * - K-factor standard (CONFIG.BASE_K), ridotto al 90% (SINGLE_GAME_K_MULTIPLIER)
 *   quando il match è finito 1-0 / 0-1 (una sola partita giocata, meno
 *   rappresentativo di un Bo3 completo).
 * - L'Elo NON viene salvato: viene sempre ricalcolato da zero replicando
 *   tutto lo storico partite in ordine cronologico. Questo garantisce che
 *   classifica e statistiche siano sempre coerenti con data/matches.json.
 */
(function (window) {
  const COLORS = ["W", "U", "B", "R", "G"];

  const COLOR_META = {
    W: { name: "Bianco", hex: "#f8f6d8", text: "#3a3a2a" },
    U: { name: "Blu", hex: "#0e68ab", text: "#ffffff" },
    B: { name: "Nero", hex: "#26221f", text: "#ffffff" },
    R: { name: "Rosso", hex: "#d3202a", text: "#ffffff" },
    G: { name: "Verde", hex: "#00733e", text: "#ffffff" },
  };

  function expectedScore(ra, rb) {
    return 1 / (1 + Math.pow(10, (rb - ra) / 400));
  }

  function matchOutcome(scoreA, scoreB) {
    if (scoreA > scoreB) return { sa: 1, sb: 0 };
    if (scoreA < scoreB) return { sa: 0, sb: 1 };
    return { sa: 0.5, sb: 0.5 };
  }

  function kFactorForMatch(scoreA, scoreB, cfg) {
    const totalGames = scoreA + scoreB;
    if (totalGames === 1) return cfg.BASE_K * cfg.SINGLE_GAME_K_MULTIPLIER;
    return cfg.BASE_K;
  }

  function sortMatches(matches) {
    return [...matches].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return (a.id || "").localeCompare(b.id || "");
    });
  }

  function emptyColorCounts() {
    return { W: 0, U: 0, B: 0, R: 0, G: 0 };
  }

  /**
   * Le statistiche sui colori vanno calcolate per MAZZO, non per partita:
   * in un torneo lo stesso giocatore usa lo stesso mazzo per più turni, e
   * contare i colori una volta per turno lo peserebbe artificialmente di
   * più di un giocatore che ha fatto un solo turno con quel mazzo.
   *
   * Un "mazzo" è identificato da (tournamentId, playerId); le partite senza
   * tournamentId (storiche, inserite una alla volta) contano ciascuna come
   * un mazzo a sé.
   */
  function computeDeckStats(playerId, matches) {
    const deckMap = new Map();

    matches.forEach((m) => {
      let colors = null;
      if (m.playerA === playerId) colors = m.colorsA;
      else if (m.playerB === playerId) colors = m.colorsB;
      else return;

      const key = m.tournamentId ? `t:${m.tournamentId}` : `m:${m.id}`;
      if (!deckMap.has(key)) deckMap.set(key, Array.from(new Set(colors || [])));
    });

    const decks = Array.from(deckMap.values());
    const totalDecks = decks.length;
    const colorPresence = emptyColorCounts();
    const colorCountHist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    decks.forEach((colors) => {
      colors.forEach((c) => {
        if (colorPresence[c] != null) colorPresence[c]++;
      });
      const n = Math.min(colors.length, 5);
      colorCountHist[n]++;
    });

    return { totalDecks, colorPresence, colorCountHist };
  }

  /**
   * Ricalcola classifica, statistiche e storico Elo per ogni giocatore
   * a partire dall'elenco giocatori e dallo storico partite.
   */
  function computeStandings(players, matches, cfg) {
    const statsById = {};

    players.forEach((p) => {
      statsById[p.id] = {
        id: p.id,
        name: p.name,
        joined: p.joined || null,
        elo: cfg.BASE_ELO,
        wins: 0,
        losses: 0,
        draws: 0,
        matches: 0,
        gamesWon: 0,
        gamesLost: 0,
        history: [{ date: p.joined || null, elo: cfg.BASE_ELO, matchId: null, delta: 0 }],
      };
    });

    const sorted = sortMatches(matches);
    const matchLog = [];
    const skipped = [];

    sorted.forEach((m) => {
      const stA = statsById[m.playerA];
      const stB = statsById[m.playerB];
      if (!stA || !stB) {
        skipped.push(m);
        return;
      }

      const ra = stA.elo;
      const rb = stB.elo;
      const ea = expectedScore(ra, rb);
      const eb = 1 - ea;
      const { sa, sb } = matchOutcome(m.scoreA, m.scoreB);
      const k = kFactorForMatch(m.scoreA, m.scoreB, cfg);
      const deltaA = k * (sa - ea);
      const deltaB = k * (sb - eb);
      const newRa = ra + deltaA;
      const newRb = rb + deltaB;

      stA.elo = newRa;
      stB.elo = newRb;
      stA.matches++;
      stB.matches++;
      stA.gamesWon += m.scoreA;
      stA.gamesLost += m.scoreB;
      stB.gamesWon += m.scoreB;
      stB.gamesLost += m.scoreA;

      if (sa === 1) {
        stA.wins++;
        stB.losses++;
      } else if (sa === 0) {
        stA.losses++;
        stB.wins++;
      } else {
        stA.draws++;
        stB.draws++;
      }

      stA.history.push({ date: m.date, elo: newRa, matchId: m.id, delta: deltaA });
      stB.history.push({ date: m.date, elo: newRb, matchId: m.id, delta: deltaB });

      matchLog.push({
        ...m,
        nameA: stA.name,
        nameB: stB.name,
        deltaA,
        deltaB,
        eloABefore: ra,
        eloBBefore: rb,
        eloAAfter: newRa,
        eloBAfter: newRb,
      });
    });

    const standings = Object.values(statsById).sort((a, b) => b.elo - a.elo);

    return { standings, matchLog, skipped };
  }

  window.EloApp.COLORS = COLORS;
  window.EloApp.COLOR_META = COLOR_META;
  window.EloApp.computeStandings = computeStandings;
  window.EloApp.computeDeckStats = computeDeckStats;
  window.EloApp.sortMatches = sortMatches;
})(window);
