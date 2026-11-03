(() => {
  "use strict";

  const game = document.querySelector("#minesweeper");
  if (!game) return;
  const games = document.querySelector("#about-games");
  const board = game.querySelector("#ms-board");
  const reset = game.querySelector(".ms-reset");
  const flagModeButton = game.querySelector(".ms-flag-mode");
  const status = game.querySelector("#ms-status");
  const flagsDisplay = game.querySelector("#ms-flags");
  const timeDisplay = game.querySelector("#ms-time");
  const about = document.querySelector("#about-body");
  const SIDE = 8;
  const MINES = 10;
  const cells = [];
  const buttons = [];
  let phase = "ready";
  let flags = 0;
  let revealed = 0;
  let flagMode = false;
  let focused = 0;
  let exploded = -1;
  let elapsed = 0;
  let startedAt = null;
  let timer = null;

  const neighbors = (index) => {
    const row = Math.floor(index / SIDE);
    const column = index % SIDE;
    const result = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const y = row + dy;
        const x = column + dx;
        if ((dx || dy) && y >= 0 && y < SIDE && x >= 0 && x < SIDE) {
          result.push(y * SIDE + x);
        }
      }
    }
    return result;
  };

  const updateClock = () => {
    const milliseconds = elapsed + (startedAt === null ? 0 : performance.now() - startedAt);
    timeDisplay.textContent = String(Math.min(999, Math.floor(milliseconds / 1000))).padStart(3, "0");
  };

  const syncClock = () => {
    const running = phase === "playing" && !game.hidden && !games.hidden && !about.hidden &&
      !document.hidden && !document.body.classList.contains("paint-desktop-only");
    if (running && startedAt === null) {
      startedAt = performance.now();
      timer = setInterval(updateClock, 250);
    } else if (!running && startedAt !== null) {
      elapsed += performance.now() - startedAt;
      startedAt = null;
      clearInterval(timer);
      timer = null;
    }
    updateClock();
  };

  const render = () => {
    const finished = phase === "won" || phase === "lost";
    flagModeButton.disabled = finished;
    flagsDisplay.textContent = String(MINES - flags).padStart(3, "0");
    reset.dataset.face = phase;
    const lockState = phase === "won" ? "Secret reconstructed; padlock unlocked" :
      phase === "lost" ? "Reconstruction failed" : "Secret locked";
    reset.setAttribute("aria-label", `${lockState}. New Secret Sweeper game`);
    reset.title = `${lockState}. Start a new game`;
    cells.forEach((cell, index) => {
      const button = buttons[index];
      const mineVisible = phase === "lost" && cell.mine;
      const wrongFlag = phase === "lost" && cell.flagged && !cell.mine;
      button.className = "ms-cell";
      button.classList.toggle("is-open", cell.open || mineVisible);
      button.classList.toggle("is-flagged", cell.flagged && !mineVisible && !wrongFlag);
      button.classList.toggle("is-mine", mineVisible);
      button.classList.toggle("is-exploded", index === exploded);
      button.classList.toggle("is-wrong", wrongFlag);
      button.textContent = cell.open && !cell.mine && cell.count ? String(cell.count) : "";
      button.dataset.count = cell.open && !cell.mine ? String(cell.count) : "";
      button.setAttribute("aria-disabled", String(finished));
      let description = "sealed share";
      if (mineVisible) description = index === exploded ? "corrupted share selected" : "corrupted share";
      else if (wrongFlag) description = "intact share incorrectly marked as untrusted";
      else if (cell.flagged) description = "marked as untrusted";
      else if (cell.open) description = cell.count ? `intact share, ${cell.count} nearby corrupted ${cell.count === 1 ? "share" : "shares"}` : "intact share, no nearby corrupted shares";
      button.setAttribute("aria-label", `Row ${Math.floor(index / SIDE) + 1}, column ${index % SIDE + 1}: ${description}`);
    });
  };

  const placeMines = (first) => {
    // Generate only after the first reveal, keeping its entire neighborhood safe.
    const safe = new Set([first, ...neighbors(first)]);
    const candidates = cells.map((_, index) => index).filter((index) => !safe.has(index));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, MINES).forEach((index) => { cells[index].mine = true; });
    cells.forEach((cell, index) => {
      cell.count = neighbors(index).filter((neighbor) => cells[neighbor].mine).length;
    });
    phase = "playing";
    syncClock();
  };

  const openCells = (indices) => {
    const pending = [...indices];
    while (pending.length) {
      const index = pending.pop();
      const cell = cells[index];
      if (cell.open || cell.flagged) continue;
      cell.open = true;
      if (cell.mine) {
        exploded = index;
        phase = "lost";
        status.textContent = "Reconstruction failed. You opened a corrupted share. Click the padlock to try again.";
        break;
      }
      revealed++;
      if (cell.count === 0) pending.push(...neighbors(index));
    }
    if (phase !== "lost" && revealed === SIDE * SIDE - MINES) {
      phase = "won";
      cells.forEach((cell) => { if (cell.mine) cell.flagged = true; });
      flags = MINES;
      status.textContent = "Secret reconstructed! All intact shares recovered and corrupted shares isolated.";
    } else if (phase === "playing") {
      status.textContent = `${SIDE * SIDE - MINES - revealed} intact shares left to recover. Keep going!`;
    }
    syncClock();
    render();
  };

  const reveal = (index) => {
    if (phase === "lost" || phase === "won" || cells[index].flagged) return;
    if (phase === "ready") placeMines(index);
    if (cells[index].open) {
      // Clicking a numbered square again opens its neighbors when flags match.
      const adjacent = neighbors(index);
      if (cells[index].count > 0 && adjacent.filter((i) => cells[i].flagged).length === cells[index].count) {
        openCells(adjacent);
      }
    } else openCells([index]);
  };

  const flag = (index) => {
    const cell = cells[index];
    if (phase === "lost" || phase === "won" || cell.open) return;
    if (!cell.flagged && flags === MINES) {
      status.textContent = "All 10 warning seals are in use. Remove one to place another.";
      return;
    }
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    status.textContent = `${MINES - flags} warning ${MINES - flags === 1 ? "seal" : "seals"} available.`;
    render();
  };

  const moveFocus = (index, focus = true) => {
    buttons[focused].tabIndex = -1;
    focused = index;
    buttons[index].tabIndex = 0;
    if (focus) buttons[index].focus({ preventScroll: true });
  };

  for (let row = 0; row < SIDE; row++) {
    const rowElement = document.createElement("div");
    rowElement.className = "ms-row";
    rowElement.setAttribute("role", "row");
    for (let column = 0; column < SIDE; column++) {
      const index = row * SIDE + column;
      const wrapper = document.createElement("div");
      wrapper.setAttribute("role", "gridcell");
      const button = document.createElement("button");
      button.type = "button";
      button.tabIndex = index === 0 ? 0 : -1;
      button.addEventListener("focus", () => moveFocus(index, false));
      button.addEventListener("click", () => flagMode ? flag(index) : reveal(index));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        flag(index);
      });
      button.addEventListener("keydown", (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let next = index;
        if (event.key === "ArrowLeft") next = row * SIDE + Math.max(0, column - 1);
        else if (event.key === "ArrowRight") next = row * SIDE + Math.min(SIDE - 1, column + 1);
        else if (event.key === "ArrowUp") next = Math.max(0, row - 1) * SIDE + column;
        else if (event.key === "ArrowDown") next = Math.min(SIDE - 1, row + 1) * SIDE + column;
        else if (event.key === "Home") next = row * SIDE;
        else if (event.key === "End") next = row * SIDE + SIDE - 1;
        else if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          flag(index);
          return;
        } else return;
        event.preventDefault();
        moveFocus(next);
      });
      buttons.push(button);
      wrapper.append(button);
      rowElement.append(wrapper);
    }
    board.append(rowElement);
  }

  const newGame = () => {
    phase = "ready";
    syncClock();
    elapsed = 0;
    revealed = flags = 0;
    exploded = -1;
    flagMode = false;
    flagModeButton.setAttribute("aria-pressed", "false");
    cells.length = 0;
    for (let i = 0; i < SIDE * SIDE; i++) {
      cells.push({ mine: false, open: false, flagged: false, count: 0 });
    }
    moveFocus(0, false);
    status.textContent = "Choose a sealed share to start.";
    updateClock();
    render();
  };

  reset.addEventListener("click", newGame);
  flagModeButton.addEventListener("click", () => {
    flagMode = !flagMode;
    flagModeButton.setAttribute("aria-pressed", String(flagMode));
    status.textContent = flagMode ? "Seal mode: tap a sealed share to mark or unmark it as untrusted." : "Reveal mode: tap a sealed share to open it.";
  });
  document.addEventListener("aboutgamechange", syncClock);
  document.addEventListener("visibilitychange", syncClock);
  new MutationObserver(syncClock).observe(about, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(syncClock).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  newGame();
})();
