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

  // Simple original glyphs (not Wizards' official mana symbol artwork) that
  // evoke each color the way the real mana symbols do: a sun, a droplet, a
  // skull, a flame, a tree. `fg` is the icon color (COLOR_META.text, chosen
  // for contrast against the color's own background), `bg` is that same
  // background, used to punch "holes" (skull eyes/teeth) through the icon.
  const COLOR_ICON_BUILDERS = {
    W: (fg) => `
      <circle cx="50" cy="50" r="13" fill="${fg}"/>
      <g stroke="${fg}" stroke-width="7" stroke-linecap="round">
        <line x1="50" y1="9" x2="50" y2="25"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(45 50 50)"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(90 50 50)"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(135 50 50)"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(180 50 50)"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(225 50 50)"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(270 50 50)"/>
        <line x1="50" y1="9" x2="50" y2="25" transform="rotate(315 50 50)"/>
      </g>`,
    U: (fg) => `<path d="M50 13 C64 34 74 48 74 62 C74 79 63 90 50 90 C37 90 26 79 26 62 C26 48 36 34 50 13 Z" fill="${fg}"/>`,
    B: (fg, bg) => `
      <ellipse cx="50" cy="42" rx="27" ry="24" fill="${fg}"/>
      <rect x="33" y="56" width="34" height="26" rx="9" fill="${fg}"/>
      <circle cx="39" cy="40" r="7" fill="${bg}"/>
      <circle cx="61" cy="40" r="7" fill="${bg}"/>
      <rect x="44" y="64" width="4" height="10" fill="${bg}"/>
      <rect x="52" y="64" width="4" height="10" fill="${bg}"/>`,
    R: (fg) => `<path d="M50 8 C66 26 74 42 74 58 C74 78 64 92 50 92 C36 92 26 78 26 58 C26 46 32 36 40 28 C40 40 46 42 46 34 C46 24 44 16 50 8 Z" fill="${fg}"/>`,
    G: (fg) => `<circle cx="50" cy="39" r="26" fill="${fg}"/><rect x="44" y="59" width="12" height="27" rx="3" fill="${fg}"/>`,
  };

  /** Returns a self-contained <svg> (circular color background + glyph) for
   *  a WUBRG color code, ready to drop into any fixed-size wrapper. */
  function colorIconSvg(code) {
    const meta = COLOR_META[code];
    if (!meta) return "";
    const builder = COLOR_ICON_BUILDERS[code];
    const icon = builder ? builder(meta.text, meta.hex) : "";
    // White's fill is so close to the page background that a faint border
    // leaves its circle with no visible edge, making it look different
    // from the vividly-colored circles (which look crisply bounded from
    // their fill color alone). Darken white's border color for visibility
    // -- but keep stroke-width IDENTICAL for every color, since SVG draws
    // a stroke straddling the path: a thicker stroke on the same radius
    // would bleed further outward and make that circle a hair bigger than
    // the rest, which is exactly the kind of mismatch we're trying to fix.
    // A pure-black stroke would itself vanish against a dark background
    // for the Black icon, so every color uses a theme-neutral mid-gray
    // ring instead (white gets a stronger, darker one -- see above).
    const strokeColor = code === "W" ? "rgba(0,0,0,0.45)" : "rgba(128,128,128,0.55)";
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block;" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="${meta.hex}" stroke="${strokeColor}" stroke-width="3"></circle>
      ${icon}
    </svg>`;
  }

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
   *
   * Archetypes are tags, not a single label: a deck can carry several
   * (e.g. "Reanimator" + "Control"), and each tag is counted on its own so
   * archetypes stay comparable across decks instead of every combination
   * forming its own one-off category.
   */
  function computeDeckStats(playerId, matches) {
    const deckMap = new Map();

    matches.forEach((m) => {
      let main = null;
      let splash = null;
      let archetypes = null;
      if (m.playerA === playerId) {
        main = m.colorsA;
        splash = m.splashA;
        archetypes = m.archetypesA;
      } else if (m.playerB === playerId) {
        main = m.colorsB;
        splash = m.splashB;
        archetypes = m.archetypesB;
      } else {
        return;
      }

      const key = m.tournamentId ? `t:${m.tournamentId}` : `m:${m.id}`;
      if (!deckMap.has(key)) {
        deckMap.set(key, {
          main: Array.from(new Set(main || [])),
          splash: Array.from(new Set(splash || [])),
          // Each archetype tag is tracked independently: a "Reanimator +
          // Control" deck counts once toward Reanimator AND once toward
          // Control, rather than forming its own "Reanimator-Control"
          // bucket that couldn't be compared to either.
          archetypes: Array.from(new Set((archetypes || []).map((a) => a.trim()).filter(Boolean))),
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

    decks.forEach(({ main, splash, archetypes }) => {
      main.forEach((c) => {
        if (colorPresenceMain[c] != null) colorPresenceMain[c]++;
      });
      splash.forEach((c) => {
        if (colorPresenceSplash[c] != null) colorPresenceSplash[c]++;
      });
      if (splash.length > 0) splashDeckCount++;
      const n = Math.min(main.length, 5);
      colorCountHist[n]++;

      if (archetypes.length === 0) {
        archetypeCounts.Unspecified = (archetypeCounts.Unspecified || 0) + 1;
      } else {
        archetypes.forEach((a) => {
          archetypeCounts[a] = (archetypeCounts[a] || 0) + 1;
        });
      }
    });

    return { totalDecks, colorPresenceMain, colorPresenceSplash, colorCountHist, splashDeckCount, archetypeCounts };
  }

  window.EloApp.COLORS = COLORS;
  window.EloApp.COLOR_META = COLOR_META;
  window.EloApp.colorIconSvg = colorIconSvg;
  window.EloApp.computeStandings = computeStandings;
  window.EloApp.computeDeckStats = computeDeckStats;
  window.EloApp.sortMatches = sortMatches;
})(window);
