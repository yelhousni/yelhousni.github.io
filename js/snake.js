(() => {
  "use strict";
  const game = document.querySelector("#snake");
  const canvas = game?.querySelector("#snake-board");
  const context = canvas?.getContext("2d");
  if (!context) return;
  const games = document.querySelector("#about-games");
  const about = document.querySelector("#about-body");
  const play = game.querySelector("#snake-play");
  const scoreDisplay = game.querySelector("#snake-score");
  const bestDisplay = game.querySelector("#snake-best");
  const overlay = game.querySelector(".snake-overlay");
  const overlayTitle = game.querySelector("#snake-overlay-title");
  const overlayHint = game.querySelector("#snake-overlay-hint");
  const status = game.querySelector("#snake-status");
  const SIZE = 16;
  const CELL = 16;
  const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  let snake = [];
  let direction = directions.right;
  let turns = [];
  let food = null;
  let phase = "ready";
  let score = 0;
  let best = 0;
  let timeout = null;
  let gesture = null;

  try {
    const stored = Number(localStorage.getItem("homepage-snake-best"));
    if (Number.isInteger(stored) && stored >= 0 && stored <= SIZE * SIZE - 3) best = stored;
  } catch { /* The game also works when browser storage is unavailable. */ }

  const same = (a, b) => a.x === b.x && a.y === b.y;
  const visible = () => !game.hidden && !games.hidden && !about.hidden && !document.hidden &&
    !document.body.classList.contains("paint-desktop-only");

  const placeFood = () => {
    const occupied = new Set(snake.map((part) => part.y * SIZE + part.x));
    const available = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!occupied.has(y * SIZE + x)) available.push({ x, y });
      }
    }
    return available.length ? available[Math.floor(Math.random() * available.length)] : null;
  };

  const draw = () => {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        context.fillStyle = "#c0c0c0";
        context.fillRect(x * CELL, y * CELL, CELL, CELL);
        context.fillStyle = "#b3b3b3";
        context.fillRect(x * CELL, y * CELL, CELL, 1);
        context.fillRect(x * CELL, y * CELL, 1, CELL);
      }
    }
    if (food) {
      const x = food.x * CELL;
      const y = food.y * CELL;
      // A newly mined block: a gold, beveled tile with a hash mark.
      context.fillStyle = "#805000";
      context.fillRect(x + 1, y + 1, 14, 14);
      context.fillStyle = "#ffd35a";
      context.fillRect(x + 2, y + 2, 11, 11);
      context.fillStyle = "#fff1b0";
      context.fillRect(x + 2, y + 2, 11, 1);
      context.fillRect(x + 2, y + 2, 1, 11);
      context.fillStyle = "#805000";
      context.fillRect(x + 5, y + 4, 1, 7);
      context.fillRect(x + 9, y + 4, 1, 7);
      context.fillRect(x + 4, y + 6, 7, 1);
      context.fillRect(x + 4, y + 9, 7, 1);
    }
    // Visible links join consecutive blocks, including around corners.
    context.strokeStyle = "#404060";
    context.lineWidth = 4;
    context.beginPath();
    snake.forEach((part, index) => {
      if (index === 0) context.moveTo(part.x * CELL + 8, part.y * CELL + 8);
      else context.lineTo(part.x * CELL + 8, part.y * CELL + 8);
    });
    context.stroke();
    snake.forEach((part, index) => {
      const x = part.x * CELL;
      const y = part.y * CELL;
      context.fillStyle = index === 0 && phase === "lost" ? "#800000" : "#000060";
      context.fillRect(x + 2, y + 2, 12, 12);
      context.fillStyle = index === 0 ? (phase === "lost" ? "#c03030" : "#2060bd") : "#000080";
      context.fillRect(x + 3, y + 3, 9, 9);
      context.fillStyle = "#8baee0";
      context.fillRect(x + 3, y + 3, 9, 1);
      context.fillRect(x + 3, y + 3, 1, 9);
      if (index > 0) {
        context.fillStyle = "#a8c4ea";
        context.fillRect(x + 5, y + 6, 5, 1);
        context.fillRect(x + 5, y + 9, 3, 1);
      }
    });
    const head = snake[0];
    // A white chevron makes the leading block's direction easy to read.
    context.fillStyle = "#fff";
    for (let offset = -2; offset <= 2; offset++) {
      const forward = 2 - Math.abs(offset);
      context.fillRect(head.x * CELL + 7 + direction.x * forward - direction.y * offset,
        head.y * CELL + 7 + direction.y * forward + direction.x * offset, 2, 2);
    }
    canvas.setAttribute("aria-label", `Blockchain Snake board. Head at row ${head.y + 1}, column ${head.x + 1}. Length ${snake.length}. ${food ? `Mined block at row ${food.y + 1}, column ${food.x + 1}.` : "Board cleared."}`);
  };

  const render = () => {
    scoreDisplay.textContent = String(score).padStart(3, "0");
    bestDisplay.textContent = String(best).padStart(3, "0");
    play.textContent = phase === "running" ? "Pause" : phase === "paused" ? "Resume" : phase === "ready" ? "Start" : "Play again";
    overlay.hidden = phase === "running";
    overlayTitle.textContent = phase === "lost" ? "GAME OVER" : phase === "won" ? "YOU WIN!" : phase === "paused" ? "PAUSED" : "BLOCKCHAIN";
    overlayHint.textContent = phase === "paused" ? "Press Resume or Space" : phase === "ready" ? "Press Start to grow your chain" : `Blocks added: ${score} · Play again?`;
    draw();
  };

  const stop = () => {
    clearTimeout(timeout);
    timeout = null;
  };
  const pause = () => {
    if (phase !== "running") return;
    stop();
    phase = "paused";
    status.textContent = "Paused. Press Resume or Space when you’re ready.";
    render();
  };
  const pauseWhenHidden = () => { if (!visible()) pause(); };

  const step = () => {
    if (phase !== "running") return;
    if (!visible()) { pause(); return; }
    if (turns.length) direction = turns.shift();
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const eating = food && same(head, food);
    // The tail moves away on non-growing steps, so its old square is safe.
    const occupied = eating ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || occupied.some((part) => same(part, head))) {
      phase = "lost";
      status.textContent = `Game over. You added ${score} ${score === 1 ? "block" : "blocks"} to your chain. Try again!`;
      render();
      return;
    }
    snake.unshift(head);
    if (eating) {
      score++;
      if (score > best) {
        best = score;
        try { localStorage.setItem("homepage-snake-best", String(best)); } catch { /* Keep the score for this visit. */ }
      }
      food = placeFood();
      if (!food) {
        phase = "won";
        status.textContent = "Every square filled. You win!";
      } else status.textContent = `${score} mined ${score === 1 ? "block" : "blocks"} added to your chain. Keep going!`;
    } else snake.pop();
    render();
  };
  const schedule = () => {
    timeout = setTimeout(() => {
      step();
      if (phase === "running") schedule();
    }, Math.max(80, 180 - Math.floor(score / 5) * 10));
  };
  const newGame = () => {
    stop();
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    direction = directions.right;
    turns = [];
    score = 0;
    phase = "ready";
    food = placeFood();
    status.textContent = "Ready when you are. Press Start or an arrow key.";
    render();
  };
  const start = () => {
    if (!visible() || phase === "running") return;
    if (phase === "lost" || phase === "won") newGame();
    phase = "running";
    status.textContent = "Collect the gold mined blocks. Avoid the walls and your own chain.";
    render();
    schedule();
  };
  const turn = (name) => {
    if (phase === "lost" || phase === "won") return;
    const next = directions[name];
    const previous = turns[turns.length - 1] || direction;
    if (turns.length < 2 && !same(previous, next) && !(previous.x + next.x === 0 && previous.y + next.y === 0)) {
      turns.push(next);
    }
    if (phase === "ready") start();
  };

  play.addEventListener("click", () => {
    if (phase === "running") pause(); else start();
    canvas.focus({ preventScroll: true });
  });
  game.querySelector("#snake-reset").addEventListener("click", () => {
    newGame();
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const name = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" }[key];
    if (name) { event.preventDefault(); turn(name); }
    else if (key === " ") {
      event.preventDefault();
      if (event.repeat) return;
      if (phase === "running") pause(); else start();
    }
  });
  game.querySelectorAll("[data-snake-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      turn(button.dataset.snakeDirection);
      canvas.focus({ preventScroll: true });
    });
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener("pointercancel", () => { gesture = null; });
  document.addEventListener("aboutgamechange", pauseWhenHidden);
  document.addEventListener("visibilitychange", pauseWhenHidden);
  window.addEventListener("blur", pause);
  new MutationObserver(pauseWhenHidden).observe(about, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(pauseWhenHidden).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  newGame();
})();
