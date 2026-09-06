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

    /** In "commit" mode (the multi-tag input): accepts whatever is
     *  currently typed as one or more tags and clears the field. A comma
     *  splits the text into several tags in one go (e.g. typing
     *  "Reanimator, Control" and hitting Enter once adds both), so someone
     *  who naturally types a combo deck as a single line doesn't get stuck
     *  wondering how to add a second tag. */
    function commitCurrent() {
      const raw = input.value.trim();
      if (!raw || !opts.onCommit) return;
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          const exact = findExact(part);
          opts.onCommit(exact ? { mode: "existing", id: exact.id, name: exact.name } : { mode: "new", name: part });
        });
      input.value = "";
      resolved = { mode: "empty" };
      updateHint();
      list.hidden = true;
    }

    input.addEventListener("blur", () => {
      // Delay closing so a click on a list item can register first.
      setTimeout(() => {
        list.hidden = true;
        if (opts.onCommit) {
          // Don't silently drop text left in the field when the user
          // tabs/clicks away without pressing Enter.
          commitCurrent();
        } else {
          resolveFromInput();
        }
      }, 150);
    });

    if (opts.onCommit) {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commitCurrent();
      });
    }

    list.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".combobox-item");
      if (!item || item.classList.contains("combobox-empty")) return;
      e.preventDefault();
      let value;
      if (item.dataset.new) {
        value = { mode: "new", name: input.value.trim() };
      } else {
        const found = items.find((p) => p.id === item.dataset.id);
        value = { mode: "existing", id: found.id, name: found.name };
      }

      if (opts.onCommit) {
        opts.onCommit(value);
        input.value = "";
        resolved = { mode: "empty" };
        updateHint();
        list.hidden = true;
        return;
      }

      resolved = value;
      if (value.mode === "existing") input.value = value.name;
      updateHint();
      list.hidden = true;
      if (opts.onChange) opts.onChange(resolved);
    });

    return {
      getValue: () => resolved,
      setItems: (newItems) => {
        items = newItems;
      },
      commit: commitCurrent,
      focus: () => input.focus(),
      el: container,
    };
  }

  /**
   * Multiple tags picked one at a time via a createTagCombobox (Enter, the
   * "+" button, or a dropdown click commits the current text as a chip and
   * clears the field for the next one; a comma splits the text into
   * several tags at once). Used for deck archetypes: a "Reanimator-Control"
   * deck adds two separate chips, "Reanimator" and "Control", so each is
   * counted on its own in the stats instead of forming a brand new,
   * incomparable category.
   *
   * Usage:
   *   const tags = EloApp.createTagMultiInput(container, allItems, opts);
   *   tags.getValues() -> ["Reanimator", "Control"]
   */
  function createTagMultiInput(container, allItems, opts) {
    opts = opts || {};
    container.classList.add("tag-multi-input");
    container.innerHTML = `
      <div class="tag-chip-row"></div>
      <div class="tag-combo-row">
        <div class="tag-combo-slot"></div>
        <button type="button" class="btn secondary tag-add-btn">+ Add</button>
      </div>
    `;

    const chipRow = container.querySelector(".tag-chip-row");
    const comboSlot = container.querySelector(".tag-combo-slot");
    const addBtn = container.querySelector(".tag-add-btn");
    let selected = [];

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function availableItems() {
      const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
      return allItems.filter((it) => !selectedLower.has(it.name.toLowerCase()));
    }

    function renderChips() {
      chipRow.innerHTML = selected
        .map(
          (name, i) =>
            `<span class="tag-chip">${escapeHtml(name)}<button type="button" data-i="${i}" aria-label="Remove ${escapeHtml(name)}">✕</button></span>`
        )
        .join("");
      chipRow.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          selected.splice(Number(btn.dataset.i), 1);
          renderChips();
          combo.setItems(availableItems());
        });
      });
    }

    const combo = createTagCombobox(comboSlot, availableItems(), {
      itemLabel: opts.itemLabel || "tag",
      placeholder: opts.placeholder,
      emptyLabel: opts.emptyLabel,
      onCommit: (value) => {
        const name = value.name.trim();
        if (!name) return;
        if (selected.some((s) => s.toLowerCase() === name.toLowerCase())) return;
        selected.push(name);
        renderChips();
        combo.setItems(availableItems());
      },
    });

    addBtn.addEventListener("click", () => {
      combo.commit();
      combo.focus();
    });

    renderChips();

    return {
      getValues: () => selected.slice(),
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
  window.EloApp.createTagMultiInput = createTagMultiInput;
})(window);
