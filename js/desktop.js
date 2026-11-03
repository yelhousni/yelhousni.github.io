(() => {
  "use strict";

  // Navigation and content remain available when JavaScript is disabled.
  const startButton = document.querySelector(".start-button");
  const startMenu = document.querySelector("#start-menu");
  if (startButton && startMenu) {
    startButton.hidden = false;
    const closeMenu = (restoreFocus = false) => {
      startMenu.hidden = true;
      startButton.setAttribute("aria-expanded", "false");
      if (restoreFocus) startButton.focus();
    };
    startButton.addEventListener("click", () => {
      const opening = startMenu.hidden;
      startMenu.hidden = !opening;
      startButton.setAttribute("aria-expanded", String(opening));
      if (opening) startMenu.querySelector("a").focus();
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".start")) closeMenu();
      else if (event.target.closest(".start-menu a")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !startMenu.hidden) closeMenu(true);
    });
    document.addEventListener("focusin", (event) => {
      if (!event.target.closest(".start")) closeMenu();
    });
  }

  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  if (tabs.length) {
    tabs[0].parentElement.setAttribute("role", "tablist");
    tabs.forEach((tab) => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", `panel-${tab.dataset.tab}`);
    });
    panels.forEach((panel) => {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `tab-${panel.dataset.panel}`);
      panel.tabIndex = 0;
    });
    const activate = (id) => {
      tabs.forEach((tab) => {
        const selected = tab.dataset.tab === id;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== id;
      });
    };
    const fromHash = () => {
      const legacy = { publications: "publication", talks: "talk", posts: "post", media: "media" };
      const hash = location.hash.slice(1);
      const id = legacy[hash] || hash.replace("panel-", "");
      if (tabs.some((tab) => tab.dataset.tab === id)) activate(id);
    };
    activate("publication");
    fromHash();
    window.addEventListener("hashchange", fromHash);
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        activate(tab.dataset.tab);
        history.replaceState(null, "", tab.getAttribute("href"));
      });
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft")
          next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          tabs[next].click();
          tabs[next].focus();
        }
      });
    });
  }

  document.querySelectorAll("[data-collapse]").forEach((button) => {
    button.hidden = false;
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const title = button
      .closest(".window-title")
      .querySelector("h2").textContent;
    button.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
      button.setAttribute(
        "aria-label",
        `${panel.hidden ? "Restore" : "Minimize"} ${title}`,
      );
      button.textContent = panel.hidden ? "+" : "−";
    });
  });

  // Expand windows when following anchors into their contents.
  const revealAnchor = () => {
    let target;
    try {
      target = document.getElementById(
        decodeURIComponent(location.hash.slice(1)),
      );
    } catch {
      return;
    }
    if (!target) return;
    for (let parent = target; parent; parent = parent.parentElement) {
      if (!parent.hidden) continue;
      const toggle = [...document.querySelectorAll("[data-collapse]")].find(
        (button) => button.getAttribute("aria-controls") === parent.id,
      );
      if (toggle) toggle.click();
    }
  };
  window.addEventListener("hashchange", revealAnchor);

  const query = document.querySelector("#archive-query");
  if (query) {
    query.closest(".archive-search").hidden = false;
    const entries = [...document.querySelectorAll("[data-entry]")];
    const normalize = (value) =>
      value
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const texts = entries.map((entry) => normalize(entry.textContent));
    query.addEventListener("input", () => {
      const words = normalize(query.value).trim().split(/\s+/).filter(Boolean);
      let count = 0;
      entries.forEach((entry, index) => {
        entry.hidden = !words.every((word) => texts[index].includes(word));
        if (!entry.hidden) count++;
      });
      document.querySelector("#filter-count").textContent =
        `${count} of ${entries.length} items`;
      document.querySelector(".empty-results").hidden = count !== 0;
    });
  }

  const clock = document.querySelector(".clock");
  if (clock) {
    const updateClock = () => {
      const now = new Date();
      clock.dateTime = now.toISOString();
      clock.textContent = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      clock.title = now.toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };
    updateClock();
    setInterval(updateClock, 30000);
  }
})();
