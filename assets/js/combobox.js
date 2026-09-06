/**
 * Text field with a dropdown of suggestions for picking an existing item
 * (a player, a deck archetype, ...) from a list of {id, name} objects, or,
 * if the typed text matches none, creating a new one on the fly. Replaces
 * <datalist>, which has inconsistent support on Safari.
 *
 * This is how names get "standardized": instead of free-typing a slightly
 * different spelling every time, the dropdown always shows what has
 * already been used so far, so picking the existing entry is the path of
 * least resistance.
 *
 * Usage:
 *   const box = EloApp.createTagCombobox(container, items, {
 *     placeholder, itemLabel, hintExisting, hintNew, createPrefix, emptyLabel
 *   });
 *   box.getValue() -> { mode: "empty" } | { mode: "existing", id, name } | { mode: "new", name }
 */
(function (window) {
  /** Classic edit-distance, used to surface "Aggro" as a suggestion even
   *  when someone types a near-miss like "agro" that isn't a literal
   *  substring match. */
  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    return dp[n];
  }

  function createTagCombobox(container, items, opts) {
    opts = opts || {};
    const itemLabel = opts.itemLabel || "item";
    const hintExisting = opts.hintExisting || `✓ existing ${itemLabel}`;
    const hintNew = opts.hintNew || `+ new ${itemLabel}`;
    const createPrefix = opts.createPrefix || `+ Create new ${itemLabel}`;
    const emptyLabel = opts.emptyLabel || `No ${itemLabel}s yet. Type a name to create one.`;

    container.classList.add("combobox");
    container.innerHTML = `
      <input type="text" class="combobox-input" autocomplete="off" placeholder="${opts.placeholder || `${itemLabel} name`}">
      <div class="combobox-list" hidden></div>
      <div class="combobox-hint"></div>
    `;

    const input = container.querySelector(".combobox-input");
    const list = container.querySelector(".combobox-list");
    const hint = container.querySelector(".combobox-hint");

    let resolved = { mode: "empty" };

    function findExact(name) {
      return items.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    }

    function updateHint() {
      if (resolved.mode === "existing") {
        hint.innerHTML = `<span class="hint-existing">${hintExisting}</span>`;
      } else if (resolved.mode === "new") {
        hint.innerHTML = `<span class="hint-new">${hintNew}</span>`;
      } else {
        hint.innerHTML = "";
      }
    }

    function resolveFromInput() {
      const value = input.value.trim();
      if (!value) {
        resolved = { mode: "empty" };
      } else {
        const exact = findExact(value);
        resolved = exact ? { mode: "existing", id: exact.id, name: exact.name } : { mode: "new", name: value };
      }
      updateHint();
      if (opts.onChange) opts.onChange(resolved);
    }

    function renderList() {
      const query = input.value.trim().toLowerCase();
      let matches;
      if (!query) {
        matches = items.slice(0, 8);
      } else {
        const substringMatches = items.filter((p) => p.name.toLowerCase().includes(query));
        const substringIds = new Set(substringMatches.map((p) => p.id));
        // Also surface close typos (e.g. "agro" -> "Aggro") that a plain
        // substring search would miss, so a slightly-off spelling still
        // finds the existing entry instead of silently creating a
        // near-duplicate.
        const fuzzyThreshold = query.length <= 5 ? 1 : 2;
        const fuzzyMatches = items
          .filter((p) => !substringIds.has(p.id))
          .map((p) => ({ item: p, dist: levenshtein(p.name.toLowerCase(), query) }))
          .filter((x) => x.dist <= fuzzyThreshold)
          .sort((a, b) => a.dist - b.dist)
          .map((x) => x.item);
        matches = [...substringMatches, ...fuzzyMatches].slice(0, 8);
      }

      const exact = query ? findExact(query) : null;
      let html = matches
        .map((p) => `<div class="combobox-item" data-id="${p.id}">${escapeHtml(p.name)}</div>`)
        .join("");

      if (query && !exact) {
        html += `<div class="combobox-item combobox-item-new" data-new="1">${createPrefix} "${escapeHtml(input.value.trim())}"</div>`;
      }

      if (!html) {
        html = `<div class="combobox-item combobox-empty">${emptyLabel}</div>`;
      }

      list.innerHTML = html;
      list.hidden = false;
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    input.addEventListener("input", () => {
      resolveFromInput();
      renderList();
    });

    input.addEventListener("focus", renderList);

    input.addEventListener("blur", () => {
      // Delay closing so a click on a list item can register first.
      setTimeout(() => {
        list.hidden = true;
        resolveFromInput();
      }, 150);
    });

    list.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".combobox-item");
      if (!item || item.classList.contains("combobox-empty")) return;
      e.preventDefault();
      if (item.dataset.new) {
        resolved = { mode: "new", name: input.value.trim() };
      } else {
        const found = items.find((p) => p.id === item.dataset.id);
        input.value = found.name;
        resolved = { mode: "existing", id: found.id, name: found.name };
      }
      updateHint();
      list.hidden = true;
      if (opts.onChange) opts.onChange(resolved);
    });

    return {
      getValue: () => resolved,
      setItems: (newItems) => {
        items = newItems;
      },
      focus: () => input.focus(),
      el: container,
    };
  }

  function createPlayerCombobox(container, players, opts) {
    return createTagCombobox(container, players, {
      itemLabel: "player",
      placeholder: "Player name",
      ...opts,
    });
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.createTagCombobox = createTagCombobox;
  window.EloApp.createPlayerCombobox = createPlayerCombobox;
})(window);
