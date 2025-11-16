// Congkak Game Logic + Smooth Path Animation

// Board indexes:
// 0-6   : Player A holes (bottom row, left to right)
// 7     : Player A store
// 8-14  : Player B holes (top row, right to left visually but index 8..14)
// 15    : Player B store
// SOUND EFFECTS
const sndDrop = new Audio("sounds/drop.mp3");
const sndCapture = new Audio("sounds/capture.mp3");
const sndStore = new Audio("sounds/store.mp3");
const sndEnd = new Audio("sounds/win.mp3");

sndDrop.volume = 0.5;
sndCapture.volume = 1.0;
sndStore.volume = 0.1;
sndEnd.volume = 0.6;

const INITIAL_SEEDS = 7;
const HOLES_PER_SIDE = 7;
const TOTAL_SLOTS = 16;

// Slow & beautiful animation timing
const ANIMATION_DURATION = 320; // ms per movement
const BETWEEN_SEEDS_DELAY = 80; // small pause between seeds

let board = [];
let currentPlayer = "A"; // "A" or "B"
let isAnimating = false;
let gameOver = false;

const statusEl = document.getElementById("status");
const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const currentTurnEl = document.getElementById("currentTurn");
const newGameBtn = document.getElementById("newGameBtn");
const holeButtons = Array.from(document.querySelectorAll(".hole"));
const storeAEl = document.querySelector(".store-a");
const storeBEl = document.querySelector(".store-b");

// Map index -> element (hole or store)
function getSlotElement(index) {
  if (index === 7) return storeAEl;
  if (index === 15) return storeBEl;
  return holeButtons.find((btn) => Number(btn.dataset.index) === index);
}

function initBoard() {
  board = Array(TOTAL_SLOTS).fill(0);
  for (let i = 0; i < HOLES_PER_SIDE; i++) {
    board[i] = INITIAL_SEEDS; // Player A
    board[8 + i] = INITIAL_SEEDS; // Player B
  }
  board[7] = 0; // A store
  board[15] = 0; // B store

  currentPlayer = "A";
  isAnimating = false;
  gameOver = false;

  updateTurnIndicators();
  renderBoard();
  setStatus("Game started! Player A begins.");
}

// Helpers
function isStore(index) {
  return index === 7 || index === 15;
}

function isOnSide(index, player) {
  if (player === "A") {
    return index >= 0 && index <= 6;
  } else {
    return index >= 8 && index <= 14;
  }
}

function sideEmpty(player) {
  if (player === "A") {
    for (let i = 0; i <= 6; i++) if (board[i] > 0) return false;
    return true;
  } else {
    for (let i = 8; i <= 14; i++) if (board[i] > 0) return false;
    return true;
  }
}

function renderBoard() {
  holeButtons.forEach((btn) => {
    const index = Number(btn.dataset.index);
    const seedCount = board[index];

    btn.innerHTML = "";

    const seedContainer = document.createElement("div");
    seedContainer.classList.add("seed-container");

    const maxVisualSeeds = 18;
    const visualCount = Math.min(seedCount, maxVisualSeeds);

    for (let i = 0; i < visualCount; i++) {
      const seed = document.createElement("div");
      seed.classList.add("seed");
      if (i % 3 === 1) seed.classList.add("alt");
      if (i % 3 === 2) seed.classList.add("third");
      seedContainer.appendChild(seed);
    }

    const countLabel = document.createElement("div");
    countLabel.classList.add("count");
    countLabel.textContent = seedCount;

    btn.appendChild(seedContainer);
    btn.appendChild(countLabel);
  });

  renderStore(storeAEl, 7);
  renderStore(storeBEl, 15);

  scoreAEl.textContent = board[7];
  scoreBEl.textContent = board[15];
}

function renderStore(storeElement, index) {
  const seedContainer = storeElement.querySelector(".seed-container");
  const countLabel = storeElement.querySelector(".count");
  const seedCount = board[index];

  seedContainer.innerHTML = "";

  // Store shows ALL seeds (NO LIMIT)
  for (let i = 0; i < seedCount; i++) {
    const seed = document.createElement("div");
    seed.classList.add("seed");
    if (i % 3 === 1) seed.classList.add("alt");
    if (i % 3 === 2) seed.classList.add("third");
    seedContainer.appendChild(seed);
  }

  countLabel.textContent = seedCount;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function updateTurnIndicators() {
  currentTurnEl.textContent = currentPlayer === "A" ? "Player A" : "Player B";
  document.body.classList.toggle("player-a-turn", currentPlayer === "A");
  document.body.classList.toggle("player-b-turn", currentPlayer === "B");

  holeButtons.forEach((btn) => {
    const index = Number(btn.dataset.index);
    const isCurrentSide = isOnSide(index, currentPlayer);
    const hasSeeds = board[index] > 0;

    if (gameOver || isAnimating || !isCurrentSide || !hasSeeds) {
      btn.classList.add("disabled");
    } else {
      btn.classList.remove("disabled");
    }
  });
}

// Small async sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Smooth movement of a single seed from one slot to another
function animateSeedMove(fromIndex, toIndex) {
  return new Promise((resolve) => {
    const fromEl = getSlotElement(fromIndex);
    const toEl = getSlotElement(toIndex);

    if (!fromEl || !toEl) {
      resolve();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;

    const floating = document.createElement("div");
    floating.classList.add("floating-seed");
    floating.style.left = `${startX}px`;
    floating.style.top = `${startY}px`;
    floating.style.transform = "scale(0.7)";
    floating.style.opacity = "0.9";

    document.body.appendChild(floating);

    // Force layout so transition applies
    floating.offsetWidth;

    floating.style.left = `${endX}px`;
    floating.style.top = `${endY}px`;
    floating.style.transform = "scale(1)";
    const targetIsStore = isStore(toIndex);

    floating.addEventListener(
      "transitionend",
      () => {
        document.body.removeChild(floating);

        sndDrop.currentTime = 0;
        sndDrop.play();

        const targetEl = getSlotElement(toIndex);
        if (targetEl) {
          if (targetIsStore) {
            // 🔊 store sound
            sndStore.currentTime = 0;
            sndStore.play();

            targetEl.classList.add("store-pulse");
            setTimeout(() => targetEl.classList.remove("store-pulse"), 460);
          } else {
            targetEl.classList.add("slot-glow");
            setTimeout(() => targetEl.classList.remove("slot-glow"), 500);
          }
        }

        resolve();
      },
      { once: true }
    );
  });
}


async function handleHoleClick(index) {
  if (gameOver || isAnimating) return;
  if (!isOnSide(index, currentPlayer) || board[index] === 0) return;

  isAnimating = true;
  updateTurnIndicators();

  let seeds = board[index];
  board[index] = 0;
  renderBoard();

  let pos = index;
  let lastPos = index;

  while (seeds > 0) {
    let nextPos = (pos + 1) % TOTAL_SLOTS;

    // Skip opponent store
    if (currentPlayer === "A" && nextPos === 15) {
      nextPos = (nextPos + 1) % TOTAL_SLOTS;
    } else if (currentPlayer === "B" && nextPos === 7) {
      nextPos = (nextPos + 1) % TOTAL_SLOTS;
    }

    // Animate a single seed from current position to next
    await animateSeedMove(pos, nextPos);

    // After animation, update board state
    board[nextPos]++;
    renderBoard();

    seeds--;
    pos = nextPos;
    lastPos = nextPos;

    await sleep(BETWEEN_SEEDS_DELAY);
  }

  // Capture logic
  await applyCaptureRule(lastPos);
  renderBoard();

  // Check game end
  if (sideEmpty("A") || sideEmpty("B")) {
    collectRemainingSeeds();
    renderBoard();
    endGame();
    isAnimating = false;
    updateTurnIndicators();
    return;
  }

  // Extra turn?
  const extraTurn =
    (currentPlayer === "A" && lastPos === 7) ||
    (currentPlayer === "B" && lastPos === 15);

  if (extraTurn) {
    setStatus(
      `Last seed landed in your store. ${currentPlayer === "A" ? "Player A" : "Player B"
      } gets an extra turn!`
    );
  } else {
    currentPlayer = currentPlayer === "A" ? "B" : "A";
    setStatus(
      `Now it's ${currentPlayer === "A" ? "Player A" : "Player B"}'s turn.`
    );
  }

  isAnimating = false;
  updateTurnIndicators();
}

async function applyCaptureRule(lastPos) {
  if (!isOnSide(lastPos, currentPlayer) || isStore(lastPos)) return;

  if (board[lastPos] === 1) {
    const oppositeIndex = 14 - lastPos;
    const oppositeSeeds = board[oppositeIndex];

    if (oppositeSeeds > 0) {
      const storeIndex = currentPlayer === "A" ? 7 : 15;
      const captured = oppositeSeeds + 1;

      console.log("CAPTURE TRIGGERED: " + captured);

      board[oppositeIndex] = 0;
      board[lastPos] = 0;
      board[storeIndex] += captured;

      setStatus(
        `${currentPlayer === "A" ? "Player A" : "Player B"} captured ${captured} seeds!`
      );

      sndCapture.currentTime = 0;
      sndCapture.play();

      await sleep(250);
    }
  }
}

function collectRemainingSeeds() {
  if (sideEmpty("A")) {
    let total = 0;
    for (let i = 8; i <= 14; i++) {
      total += board[i];
      board[i] = 0;
    }
    board[15] += total;
  } else if (sideEmpty("B")) {
    let total = 0;
    for (let i = 0; i <= 6; i++) {
      total += board[i];
      board[i] = 0;
    }
    board[7] += total;
  }
}

function endGame() {
  sndEnd.currentTime = 0;
  sndEnd.play();
  gameOver = true;
  updateTurnIndicators();

  const aScore = board[7];
  const bScore = board[15];

  if (aScore > bScore) {
    setStatus(`Game over! Player A wins, ${aScore} vs ${bScore}.`);
  } else if (bScore > aScore) {
    setStatus(`Game over! Player B wins, ${bScore} vs ${aScore}.`);
  } else {
    setStatus(`Game over! It's a tie, ${aScore} vs ${bScore}.`);
  }
}

// Events
holeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const index = Number(btn.dataset.index);
    handleHoleClick(index);
  });
});

newGameBtn.addEventListener("click", () => {
  initBoard();
});

// Start
initBoard();
