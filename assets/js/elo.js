/**
 * Elo calculation engine. Pure JS, no dependencies.
 *
 * Rules:
 * - Match score: win = 1, draw (1-1 or 0-0) = 0.5, loss = 0.
 * - Standard K-factor (CONFIG.BASE_K), reduced to 90%
 *   (SINGLE_GAME_K_MULTIPLIER) when a match ends 1-0 / 0-1 (a single game
 *   played, less representative than a full Bo3).
 * - Elo is NEVER stored: it is always recomputed from scratch by replaying
 *   the whole match history in chronological order. This guarantees that
 *   the standings and stats are always consistent with data/matches.json.
 */
(function (window) {
  const COLORS = ["W", "U", "B", "R", "G"];

  const COLOR_META = {
    W: { name: "White", hex: "#f8f6d8", text: "#3a3a2a" },
    U: { name: "Blue", hex: "#0e68ab", text: "#ffffff" },
    B: { name: "Black", hex: "#26221f", text: "#ffffff" },
    R: { name: "Red", hex: "#d3202a", text: "#ffffff" },
    G: { name: "Green", hex: "#00733e", text: "#ffffff" },
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
   * Recomputes standings, stats and Elo history for every player from the
   * player list and the match history.
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

  /**
   * Deck stats must be computed per DECK, not per game: in a tournament the
   * same player uses the same deck across several rounds, and counting
   * colors once per round would weight that deck more heavily than a
   * player who only played one round with theirs.
   *
   * A "deck" is identified by (tournamentId, playerId); matches without a
   * tournamentId (legacy, entered one at a time) each count as their own
   * deck.
   *
   * Splash colors are tracked separately from main colors: the "colors per
   * deck" distribution (mono/2-color/3-color/...) is based on main colors
   * only, so a 2-color deck with a splash is still counted as a 2-color
   * deck, distinct from an actual 3-color deck.
   */
  function computeDeckStats(playerId, matches) {
    const deckMap = new Map();

    matches.forEach((m) => {
      let main = null;
      let splash = null;
      let archetype = null;
      if (m.playerA === playerId) {
        main = m.colorsA;
        splash = m.splashA;
        archetype = m.archetypeA;
      } else if (m.playerB === playerId) {
        main = m.colorsB;
        splash = m.splashB;
        archetype = m.archetypeB;
      } else {
        return;
      }

      const key = m.tournamentId ? `t:${m.tournamentId}` : `m:${m.id}`;
      if (!deckMap.has(key)) {
        deckMap.set(key, {
          main: Array.from(new Set(main || [])),
          splash: Array.from(new Set(splash || [])),
          archetype: (archetype || "").trim(),
        });
      }
    });

    const decks = Array.from(deckMap.values());
    const totalDecks = decks.length;
    const colorPresenceMain = emptyColorCounts();
    const colorPresenceSplash = emptyColorCounts();
    const colorCountHist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const archetypeCounts = {};
    let splashDeckCount = 0;

    decks.forEach(({ main, splash, archetype }) => {
      main.forEach((c) => {
        if (colorPresenceMain[c] != null) colorPresenceMain[c]++;
      });
      splash.forEach((c) => {
        if (colorPresenceSplash[c] != null) colorPresenceSplash[c]++;
      });
      if (splash.length > 0) splashDeckCount++;
      const n = Math.min(main.length, 5);
      colorCountHist[n]++;

      const label = archetype || "Unspecified";
      archetypeCounts[label] = (archetypeCounts[label] || 0) + 1;
    });

    return { totalDecks, colorPresenceMain, colorPresenceSplash, colorCountHist, splashDeckCount, archetypeCounts };
  }

  window.EloApp.COLORS = COLORS;
  window.EloApp.COLOR_META = COLOR_META;
  window.EloApp.computeStandings = computeStandings;
  window.EloApp.computeDeckStats = computeDeckStats;
  window.EloApp.sortMatches = sortMatches;
})(window);
