(() => {
  "use strict";
  const games = document.querySelector("#about-games");
  if (!games) return;
  const profile = document.querySelector("#about-profile");
  const tabs = [...document.querySelectorAll("[data-about-tab]")];
  const choices = [...games.querySelectorAll("[data-game]")];
  const announceView = () => document.dispatchEvent(new Event("aboutgamechange"));

  const setView = (name, focusTab = false) => {
    games.hidden = name !== "games";
    profile.hidden = name !== "profile";
    tabs.forEach((tab) => {
      const selected = tab.dataset.aboutTab === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus({ preventScroll: true });
    });
    announceView();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setView(tab.dataset.aboutTab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        setView(tabs[next].dataset.aboutTab, true);
      }
    });
  });
  const chooseGame = (name) => {
    choices.forEach((choice) => {
      const selected = choice.dataset.game === name;
      choice.setAttribute("aria-pressed", String(selected));
      const panel = document.getElementById(choice.getAttribute("aria-controls"));
      panel.hidden = !selected;
      panel.setAttribute("aria-labelledby", choice.id);
    });
    announceView();
  };
  choices.forEach((choice) => choice.addEventListener("click", () => chooseGame(choice.dataset.game)));
  games.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setView("profile", true);
    }
  });
  profile.setAttribute("role", "tabpanel");
  profile.setAttribute("aria-labelledby", "about-tab-profile");
  games.setAttribute("role", "tabpanel");
  games.setAttribute("aria-labelledby", "about-tab-games");
  chooseGame("minesweeper");
  document.querySelector(".about-tabs").hidden = false;
})();
