(() => {
  "use strict";
  const game = document.querySelector("#memory");
  if (!game) return;
  const games = document.querySelector("#about-games");
  const about = document.querySelector("#about-body");
  const board = game.querySelector("#memory-board");
  const status = game.querySelector("#memory-status");
  const pairsDisplay = game.querySelector("#memory-pairs");
  const movesDisplay = game.querySelector("#memory-moves");
  const proofStatus = game.querySelector("#memory-proof-status");
  const proofData = game.querySelector("#memory-proof-data");
  const symbols = [
    { id: "key", label: "Key", color: "#805000" },
    { id: "lock", label: "Padlock", color: "#000080" },
    { id: "hash", label: "Hash", color: "#006800" },
    { id: "curve", label: "EC curve", color: "#800080" },
    { id: "signature", label: "Signature", color: "#005b8a" },
    { id: "merkle", label: "Merkle tree", color: "#006868" },
    { id: "block", label: "Block", color: "#804000" },
    { id: "zk", label: "ZK proof", color: "#800000" },
  ];
  const svgNS = "http://www.w3.org/2000/svg";
  let cards = [];
  let buttons = [];
  let selected = [];
  let pairs = 0;
  let moves = 0;
  let focused = 0;
  let generation = 0;
  let ready = false;
  let verifying = false;
  let timeout = null;
  let remaining = 0;
  let countdownStarted = null;

  const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const commit = async (symbol, nonce) => hex(new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(`${symbol}:${nonce}`)
  )));
  const visible = () => !game.hidden && !games.hidden && !about.hidden && !document.hidden &&
    !document.body.classList.contains("paint-desktop-only");
  const icon = (id) => {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(svgNS, "use");
    use.setAttribute("href", `${game.dataset.symbolsUrl}#${id}`);
    svg.append(use);
    return svg;
  };
  const renderCard = (index) => {
    const card = cards[index];
    const button = buttons[index];
    const revealed = card.matched || selected.includes(index);
    button.dataset.state = card.matched ? "matched" : revealed ? "revealed" : "sealed";
    button.setAttribute("aria-disabled", String(revealed));
    button.setAttribute("aria-label", `Card ${index + 1}: ${revealed ? `${card.symbol.label}, ${card.matched ? "matched" : "revealed"}` : `sealed commitment ${card.commitment.slice(0, 8)}`}`);
    button.style.color = revealed ? card.symbol.color : "#000080";
    const label = document.createElement("span");
    label.textContent = revealed ? card.symbol.label : card.commitment.slice(0, 8);
    if (!revealed) label.className = "memory-fingerprint";
    button.replaceChildren(icon(revealed ? card.symbol.id : "sealed"), label);
  };
  const clearCountdown = () => {
    clearTimeout(timeout);
    timeout = null;
    countdownStarted = null;
  };
  const concealMismatch = () => {
    clearCountdown();
    remaining = 0;
    const old = selected;
    selected = [];
    old.forEach(renderCard);
    status.textContent = "Different symbols. Their commitments stay the same. Try another pair.";
  };
  const syncCountdown = () => {
    if (!remaining) return;
    if (!visible() && countdownStarted !== null) {
      remaining = Math.max(1, remaining - (performance.now() - countdownStarted));
      clearCountdown();
    } else if (visible() && countdownStarted === null) {
      countdownStarted = performance.now();
      timeout = setTimeout(concealMismatch, remaining);
    }
  };
  const reveal = async (index) => {
    if (!ready || verifying || !visible() || selected.length === 2 || cards[index].matched || selected.includes(index)) return;
    const version = generation;
    const card = cards[index];
    verifying = true;
    board.setAttribute("aria-busy", "true");
    try {
      // Recompute the original commitment before accepting a reveal.
      if (await commit(card.symbol.id, card.nonce) !== card.commitment) throw new Error("Commitment mismatch");
      if (version !== generation) return;
      selected.push(index);
      renderCard(index);
      proofData.hidden = false;
      proofStatus.textContent = `Card ${index + 1}: ${card.symbol.label}. Commitment verified.`;
      game.querySelector("#memory-symbol").textContent = card.symbol.id;
      game.querySelector("#memory-nonce").textContent = card.nonce;
      game.querySelector("#memory-hash").textContent = card.commitment;
      if (selected.length === 1) {
        status.textContent = `${card.symbol.label} revealed and verified. Find its matching symbol.`;
        return;
      }
      moves++;
      movesDisplay.textContent = String(moves).padStart(3, "0");
      const [first, second] = selected;
      if (cards[first].symbol.id === cards[second].symbol.id) {
        cards[first].matched = cards[second].matched = true;
        pairs++;
        pairsDisplay.textContent = `${pairs}/8`;
        selected = [];
        renderCard(first);
        renderCard(second);
        status.textContent = pairs === 8 ? `All commitments revealed! Eight pairs verified in ${moves} moves.` :
          `${card.symbol.label} pair verified. ${8 - pairs} ${pairs === 7 ? "pair" : "pairs"} left.`;
      } else {
        status.textContent = `${cards[first].symbol.label} and ${cards[second].symbol.label}: no match. Remember their positions!`;
        remaining = 1600;
        syncCountdown();
      }
    } catch {
      if (version !== generation) return;
      ready = false;
      status.textContent = "The commitment could not be verified. Choose New commitments to try again.";
    } finally {
      if (version === generation) {
        verifying = false;
        board.setAttribute("aria-busy", "false");
      }
    }
  };
  const moveFocus = (index) => {
    buttons[focused].tabIndex = -1;
    focused = index;
    buttons[index].tabIndex = 0;
    buttons[index].focus({ preventScroll: true });
  };
  const newGame = async () => {
    const version = ++generation;
    clearCountdown();
    ready = verifying = false;
    remaining = pairs = moves = focused = 0;
    selected = [];
    cards = [];
    buttons = [];
    board.replaceChildren();
    board.setAttribute("aria-busy", "true");
    pairsDisplay.textContent = "0/8";
    movesDisplay.textContent = "000";
    proofData.hidden = true;
    ["#memory-symbol", "#memory-nonce", "#memory-hash"].forEach((selector) => { game.querySelector(selector).textContent = ""; });
    proofStatus.textContent = "Reveal a card to inspect its commitment.";
    status.textContent = "Preparing the commitments…";
    try {
      if (!globalThis.crypto?.subtle) throw new Error("Web Crypto unavailable");
      const deck = await Promise.all([...symbols, ...symbols].map(async (symbol) => {
        const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
        return { symbol, nonce, commitment: await commit(symbol.id, nonce), matched: false };
      }));
      if (version !== generation) return;
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      cards = deck;
      cards.forEach((card, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "memory-card";
        button.tabIndex = index === 0 ? 0 : -1;
        button.addEventListener("click", () => reveal(index));
        button.addEventListener("focus", () => {
          buttons[focused].tabIndex = -1;
          focused = index;
          button.tabIndex = 0;
        });
        button.addEventListener("keydown", (event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          const row = Math.floor(index / 4);
          const column = index % 4;
          const destinations = {
            ArrowLeft: row * 4 + Math.max(0, column - 1),
            ArrowRight: row * 4 + Math.min(3, column + 1),
            ArrowUp: Math.max(0, row - 1) * 4 + column,
            ArrowDown: Math.min(3, row + 1) * 4 + column,
            Home: row * 4, End: row * 4 + 3,
          };
          if (event.key in destinations) {
            event.preventDefault();
            moveFocus(destinations[event.key]);
          }
        });
        buttons.push(button);
        board.append(button);
        renderCard(index);
      });
      ready = true;
      status.textContent = "16 cards committed. Reveal two cards to find your first pair.";
    } catch {
      if (version !== generation) return;
      status.textContent = "This game needs a browser with Web Crypto over HTTPS or localhost. Choose New commitments to retry.";
    } finally {
      if (version === generation) board.setAttribute("aria-busy", "false");
    }
  };
  game.querySelector(".memory-reset").addEventListener("click", newGame);
  document.addEventListener("aboutgamechange", syncCountdown);
  document.addEventListener("visibilitychange", syncCountdown);
  new MutationObserver(syncCountdown).observe(about, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(syncCountdown).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  newGame();
})();
