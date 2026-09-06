/**
 * Text field with a dropdown of suggestions for picking an existing player
 * or, if the typed name matches none, creating a new one on the fly.
 * Replaces <datalist>, which has inconsistent support on Safari.
 *
 * Usage:
 *   const box = EloApp.createPlayerCombobox(container, players);
 *   box.getValue() -> { mode: "empty" } | { mode: "existing", id, name } | { mode: "new", name }
 */
(function (window) {
  function createPlayerCombobox(container, players, opts) {
    opts = opts || {};
    container.classList.add("combobox");
    container.innerHTML = `
      <input type="text" class="combobox-input" autocomplete="off" placeholder="${opts.placeholder || "Player name"}">
      <div class="combobox-list" hidden></div>
      <div class="combobox-hint"></div>
    `;

    const input = container.querySelector(".combobox-input");
    const list = container.querySelector(".combobox-list");
    const hint = container.querySelector(".combobox-hint");

    let resolved = { mode: "empty" };

    function findExact(name) {
      return players.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    }

    function updateHint() {
      if (resolved.mode === "existing") {
        hint.innerHTML = `<span class="hint-existing">✓ existing player</span>`;
      } else if (resolved.mode === "new") {
        hint.innerHTML = `<span class="hint-new">+ new player</span>`;
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
      let matches = players;
      if (query) {
        matches = players.filter((p) => p.name.toLowerCase().includes(query));
      }
      matches = matches.slice(0, 8);

      const exact = query ? findExact(query) : null;
      let html = matches
        .map((p) => `<div class="combobox-item" data-id="${p.id}">${escapeHtml(p.name)}</div>`)
        .join("");

      if (query && !exact) {
        html += `<div class="combobox-item combobox-item-new" data-new="1">+ Create new player "${escapeHtml(input.value.trim())}"</div>`;
      }

      if (!html) {
        html = `<div class="combobox-item combobox-empty">No players yet. Type a name to create one.</div>`;
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
        const player = players.find((p) => p.id === item.dataset.id);
        input.value = player.name;
        resolved = { mode: "existing", id: player.id, name: player.name };
      }
      updateHint();
      list.hidden = true;
      if (opts.onChange) opts.onChange(resolved);
    });

    return {
      getValue: () => resolved,
      setPlayers: (newPlayers) => {
        players = newPlayers;
      },
      focus: () => input.focus(),
      el: container,
    };
  }

  window.EloApp = window.EloApp || {};
  window.EloApp.createPlayerCombobox = createPlayerCombobox;
})(window);
