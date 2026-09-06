/**
 * Site configuration. Edit the values below before publishing the site on
 * GitHub Pages (see README.md for the step-by-step guide).
 */
window.EloApp = window.EloApp || {};

window.EloApp.CONFIG = {
  // --- EDIT BEFORE PUBLISHING ---
  GITHUB_OWNER: "EarthQuake-27",
  GITHUB_REPO: "mtg-elo-tracker",       // name of the GitHub repository
  GITHUB_BRANCH: "main",

  // --- Customization ---
  SITE_NAME: "Playgroup Elo",           // name of your play group

  // --- Elo system parameters (feel free to tweak, but keep them consistent
  //     over time: changing them mid-season only affects future
  //     calculations, not past ones, because Elo is recomputed from
  //     scratch on every page load) ---
  BASE_ELO: 1000,                // starting Elo for every new player
  BASE_K: 32,                    // standard K-factor
  SINGLE_GAME_K_MULTIPLIER: 0.9, // reduced K for "short" 1-0 / 0-1 results

  // --- Deck-building limits ---
  MAX_SPLASH_COLORS: 2,          // max number of splash colors per deck

  // --- Suggested deck archetypes, shown in the dropdown before anyone has
  //     typed anything. Any archetype typed during tournament entry is
  //     added to the suggestions automatically from then on — this list is
  //     just a starting point so the first tournaments already have
  //     consistent options to pick from. Feel free to edit it. ---
  DEFAULT_ARCHETYPES: [
    "Aggro", "Midrange", "Control", "Combo", "Tempo",
    "Ramp", "Burn", "Reanimator", "Discard", "Madness", "Mill", "Stax",
  ],
};
