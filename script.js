// Board indexes:
// 0-6   : Player A holes (bottom row)
// 7     : Player A store (Right)
// 8-14  : Player B holes (top row)
// 15    : Player B store (Left)

// SOUND EFFECTS
const sndDrop = new Audio("sounds/drop.mp3");
const sndCapture = new Audio("sounds/capture.mp3");
const sndStore = new Audio("sounds/store.mp3");
const sndEnd = new Audio("sounds/win.mp3");

// Adjust volumes
sndDrop.volume = 0.5;
sndCapture.volume = 1.0;
sndStore.volume = 0.2;
sndEnd.volume = 0.6;

const INITIAL_SEEDS = 7;
const HOLES_PER_SIDE = 7;
const TOTAL_SLOTS = 16;

// Animation Timing
const ANIMATION_DURATION = 320;
const BETWEEN_SEEDS_DELAY = 100; // Slower pace

let board = [];
let currentPlayer = "A";
let gamePhase = "setup"; // "setup", "race", "turn"
let activeTurnCount = 0;
let gameOver = false;
let matchId = 0;
let raceResult = null;

// Setup selections
let startChoiceA = null;
let startChoiceB = null;

// DOM Elements
const statusEl = document.getElementById("status");
const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const currentTurnEl = document.getElementById("currentTurn");
const newGameBtn = document.getElementById("newGameBtn");
const holeButtons = Array.from(document.querySelectorAll(".hole"));
const storeAEl = document.querySelector(".store-a");
const storeBEl = document.querySelector(".store-b");

const handIndicatorAEl = document.getElementById("handIndicatorA");
const handCountAEl = document.getElementById("handCountA");
const handIndicatorBEl = document.getElementById("handIndicatorB");
const handCountBEl = document.getElementById("handCountB");

// Modal Elements
const modalEl = document.getElementById("gameOverModal");
const winnerTextEl = document.getElementById("winnerText");
const finalScoreAEl = document.getElementById("finalScoreA");
const finalScoreBEl = document.getElementById("finalScoreB");
const modalRestartBtn = document.getElementById("modalRestartBtn");


// Map index -> element
function getSlotElement(index) {
  if (index === 7) return storeAEl;
  if (index === 15) return storeBEl;
  return holeButtons.find((btn) => Number(btn.dataset.index) === index);
}

function initBoard() {
  matchId++;
  document.querySelectorAll('.floating-seed').forEach(el => el.remove());
  board = Array(TOTAL_SLOTS).fill(0);
  for (let i = 0; i < HOLES_PER_SIDE; i++) {
    board[i] = INITIAL_SEEDS;
    board[8 + i] = INITIAL_SEEDS;
  }
  board[7] = 0;
  board[15] = 0;

  gamePhase = "setup";
  startChoiceA = null;
  startChoiceB = null;
  activeTurnCount = 0;
  gameOver = false;
  currentPlayer = "A";

  // Hide modal if open
  modalEl.style.display = "none";

  holeButtons.forEach(btn => btn.classList.remove("selected-start"));

  updateHandDisplay("A", 0, false);
  updateHandDisplay("B", 0, false);
  updateTurnIndicators();
  renderBoard();
  setStatus("Player A: Choose your starting hole.");
}

// --- Helpers ---

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

function setStatus(msg) {
  statusEl.textContent = msg;
}

function updateHandDisplay(player, count, visible) {
  if (player === "A") {
    handCountAEl.textContent = count;
    handIndicatorAEl.style.opacity = visible ? "1" : "0";
    handIndicatorAEl.style.transform = visible ? "scale(1)" : "scale(0.8)";
  } else {
    handCountBEl.textContent = count;
    handIndicatorBEl.style.opacity = visible ? "1" : "0";
    handIndicatorBEl.style.transform = visible ? "scale(1)" : "scale(0.8)";
  }
}

// --- Rendering & UI ---

function renderBoard() {
  holeButtons.forEach((btn) => {
    const index = Number(btn.dataset.index);
    const seedCount = board[index];

    btn.innerHTML = "";

    const seedContainer = document.createElement("div");
    seedContainer.classList.add("seed-container");

    // --- FIX: INCREASED VISUAL LIMIT TO 30 ---
    const maxVisualSeeds = 30;
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

  // Store Limit 100
  const maxVisualStore = 100;
  const visualCount = Math.min(seedCount, maxVisualStore);

  for (let i = 0; i < visualCount; i++) {
    const seed = document.createElement("div");
    seed.classList.add("seed");
    if (i % 3 === 1) seed.classList.add("alt");
    if (i % 3 === 2) seed.classList.add("third");
    seedContainer.appendChild(seed);
  }

  countLabel.textContent = seedCount;
}

function updateTurnIndicators() {
  if (gameOver) {
    document.body.classList.remove("player-a-turn", "player-b-turn");
    currentTurnEl.textContent = "Game Over";
    return;
  }

  if (gamePhase === "setup" || gamePhase === "race") {
    currentTurnEl.textContent = "Setup / Race";
    if (startChoiceA === null) {
      document.body.classList.add("player-a-turn");
      document.body.classList.remove("player-b-turn");
    } else if (startChoiceB === null) {
      document.body.classList.remove("player-a-turn");
      document.body.classList.add("player-b-turn");
    } else {
      document.body.classList.add("player-a-turn");
      document.body.classList.add("player-b-turn");
    }
  } else {
    currentTurnEl.textContent = currentPlayer === "A" ? "Player A" : "Player B";
    document.body.classList.toggle("player-a-turn", currentPlayer === "A");
    document.body.classList.toggle("player-b-turn", currentPlayer === "B");
  }

  holeButtons.forEach((btn) => {
    const index = Number(btn.dataset.index);
    let isClickable = false;

    if (gamePhase === "setup") {
      if (startChoiceA === null) {
        if (isOnSide(index, "A") && board[index] > 0) isClickable = true;
      } else {
        if (isOnSide(index, "B") && board[index] > 0) isClickable = true;
      }
    } else if (gamePhase === "turn") {
      if (isOnSide(index, currentPlayer) && board[index] > 0 && activeTurnCount === 0) {
        isClickable = true;
      }
    }

    if (isClickable) {
      btn.classList.remove("disabled");
    } else {
      btn.classList.add("disabled");
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Animation ---

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
    floating.style.transform = "scale(0.8)";
    floating.style.opacity = "1";

    document.body.appendChild(floating);
    floating.offsetWidth;

    floating.style.left = `${endX}px`;
    floating.style.top = `${endY}px`;
    floating.style.transform = "scale(1)";

    floating.addEventListener("transitionend", () => {
      document.body.removeChild(floating);

      const targetEl = getSlotElement(toIndex);
      if (isStore(toIndex)) {
        sndStore.currentTime = 0;
        sndStore.play().catch(() => { });
        targetEl.classList.add("store-pulse");
        setTimeout(() => targetEl.classList.remove("store-pulse"), 400);
      } else {
        sndDrop.currentTime = 0;
        sndDrop.play().catch(() => { });
        targetEl.classList.add("slot-glow");
        setTimeout(() => targetEl.classList.remove("slot-glow"), 400);
      }

      resolve();
    }, { once: true }
    );
  });
}

// --- Interaction Handler ---

async function handleHoleClick(index) {
  if (gameOver) return;
  const owner = index <= 6 ? "A" : "B";
  const btn = getSlotElement(index);

  if (gamePhase === "setup") {
    if (startChoiceA === null) {
      if (owner === "A" && board[index] > 0) {
        startChoiceA = index;
        btn.classList.add("selected-start");
        setStatus("Player A ready. Player B, choose your starting hole.");
        updateTurnIndicators();
      }
    } else if (startChoiceB === null) {
      if (owner === "B" && board[index] > 0) {
        startChoiceB = index;
        btn.classList.add("selected-start");
        setStatus("GO! Race started!");
        triggerSimultaneousRace();
      }
    }
    return;
  }

  if (gamePhase === "turn") {
    if (activeTurnCount > 0) return;
    if (owner !== currentPlayer) return;
    if (board[index] === 0) return;

    activeTurnCount++;
    updateTurnIndicators();
    await runTurnLogic(index, owner);
    activeTurnCount--;

    updateHandDisplay(owner, 0, false);
    checkGameState();
  }
}

async function triggerSimultaneousRace() {
  const currentMatchId = matchId;

  gamePhase = "race";
  raceResult = {
    storeGainA: 0,
    storeGainB: 0,
    lastStopA: null,
    lastStopB: null
  };
  updateTurnIndicators();

  holeButtons.forEach(btn => btn.classList.remove("selected-start"));

  const p1 = runTurnLogic(startChoiceA, "A").then(() => updateHandDisplay("A", 0, false));
  const p2 = runTurnLogic(startChoiceB, "B").then(() => updateHandDisplay("B", 0, false));

  await Promise.all([p1, p2]);

  if (matchId !== currentMatchId) return;

  activeTurnCount = 0;
  gamePhase = "turn";

  if (raceResult.storeGainA > raceResult.storeGainB) {
    currentPlayer = "A";
    setStatus("Race result: Player A gained more seeds and goes first.");
  }
  else if (raceResult.storeGainB > raceResult.storeGainA) {
    currentPlayer = "B";
    setStatus("Race result: Player B gained more seeds and goes first.");
  }
  else {
    // 2️⃣ Compare last stop side
    const aOnOwnSide = raceResult.lastStopA >= 0 && raceResult.lastStopA <= 6;
    const bOnOwnSide = raceResult.lastStopB >= 8 && raceResult.lastStopB <= 14;

    if (aOnOwnSide && !bOnOwnSide) {
      currentPlayer = "A";
      setStatus("Race tie-breaker: Player A stopped on own side.");
    }
    else if (bOnOwnSide && !aOnOwnSide) {
      currentPlayer = "B";
      setStatus("Race tie-breaker: Player B stopped on own side.");
    }
    else {
      // 3️⃣ Traditional rule
      currentPlayer = "A";
      setStatus("Race tie: Traditional rule — Player A goes first.");
    }
  }
  updateTurnIndicators();
}

// --- Logic ---

async function runTurnLogic(startIndex, player) {
  const currentMatchId = matchId;
  let currentIndex = startIndex;
  let hand = board[currentIndex];

  // Pick up initial seeds
  board[currentIndex] = 0;
  updateHandDisplay(player, hand, true);
  renderBoard();

  let keepGoing = true;

  while (keepGoing) {
    if (matchId !== currentMatchId) return;

    // 1. Distribute seeds
    while (hand > 0) {
      if (matchId !== currentMatchId) return;
      let nextIndex = (currentIndex + 1) % TOTAL_SLOTS;

      // Skip opponent's store
      if (player === "A" && nextIndex === 15) {
        nextIndex = 0;
      } else if (player === "B" && nextIndex === 7) {
        nextIndex = 8;
      }

      // 2. Animate (Visual)
      await animateSeedMove(currentIndex, nextIndex);

      // Check cancellation (Stop if user clicked New Game during flight)
      if (matchId !== currentMatchId) return;

      // --- CHANGE END: We moved the decrement here (After Landing) ---
      hand--;
      updateHandDisplay(player, hand, true);

      // 3. Land (Data)
      board[nextIndex]++;
      currentIndex = nextIndex;
      renderBoard();

      await sleep(BETWEEN_SEEDS_DELAY);
    }

    // 2. Check Landing Condition
    if (isStore(currentIndex)) {
      if (gamePhase === "race") {
        if (player === "A" && currentIndex === 7) {
          raceResult.storeGainA++;
        }
        if (player === "B" && currentIndex === 15) {
          raceResult.storeGainB++;
        }
        setStatus(`Player ${player} landed in Store (Race).`);
        keepGoing = false;
        return;
      }

      setStatus(`Landed in Store! Player ${player} gets another turn.`);
      keepGoing = false;
      return;
    }

    if (board[currentIndex] === 1) {
      if (isOnSide(currentIndex, player)) {
        await applyCapture(currentIndex, player);
      } else {
        setStatus(`Player ${player} stopped (Mati).`);
      }
      if (gamePhase === "race") {
        if (player === "A") raceResult.lastStopA = currentIndex;
        if (player === "B") raceResult.lastStopB = currentIndex;
      }
      keepGoing = false;
    }
    else {
      // Pick up seeds
      setStatus(`Player ${player} continues...`);
      await sleep(200);

      if (matchId !== currentMatchId) return;

      hand = board[currentIndex];
      board[currentIndex] = 0;

      updateHandDisplay(player, hand, true);
      renderBoard();
    }
  }
}

async function applyCapture(landingIndex, player) {
  const oppositeIndex = 14 - landingIndex;
  const capturedSeeds = board[oppositeIndex];

  if (capturedSeeds > 0) {
    const storeIndex = player === "A" ? 7 : 15;

    const landingEl = getSlotElement(landingIndex);
    const oppositeEl = getSlotElement(oppositeIndex);
    landingEl.style.background = "#ff6b6b";
    oppositeEl.style.background = "#ff6b6b";

    setStatus(`CAPTURE! Player ${player} takes ${capturedSeeds} seeds!`);
    sndCapture.play().catch(() => { });

    await sleep(600);

    board[oppositeIndex] = 0;
    board[landingIndex] = 0;
    board[storeIndex] += (capturedSeeds + 1);

    landingEl.style.background = "";
    oppositeEl.style.background = "";

    renderBoard();
    const storeEl = getSlotElement(storeIndex);
    storeEl.classList.add("store-pulse");
    setTimeout(() => storeEl.classList.remove("store-pulse"), 500);
  } else {
    setStatus(`Player ${player} landed in empty hole. No seeds to capture.`);
  }
}

function checkGameState() {
  renderBoard();

  if (sideEmpty("A") && sideEmpty("B")) {
    endGame();
    return;
  }

  // Only check turn switching in normal turn mode
  if (gamePhase === "turn" && activeTurnCount === 0) {
    if (statusEl.textContent.startsWith("Race")) {
      updateTurnIndicators();
      return;
    }
    const statusText = statusEl.textContent;
    if (!statusText.includes("Another turn") && !statusText.includes("Entering Turn Mode")) {
      currentPlayer = currentPlayer === "A" ? "B" : "A";
      setStatus(`Now Player ${currentPlayer}'s turn.`);
    }

    if (sideEmpty(currentPlayer)) {
      setStatus(`Player ${currentPlayer} has no seeds! Skipping turn.`);
      currentPlayer = currentPlayer === "A" ? "B" : "A";
      if (sideEmpty(currentPlayer)) {
        collectRemainingSeeds();
        endGame();
      }
    }
  }
  updateTurnIndicators();
}

function collectRemainingSeeds() {
  let aRemaining = 0;
  for (let i = 0; i <= 6; i++) { aRemaining += board[i]; board[i] = 0; }
  board[7] += aRemaining;

  let bRemaining = 0;
  for (let i = 8; i <= 14; i++) { bRemaining += board[i]; board[i] = 0; }
  board[15] += bRemaining;
}

function endGame() {
  gameOver = true;
  sndEnd.play().catch(() => { });
  const aScore = board[7];
  const bScore = board[15];

  // Set Modal Info
  finalScoreAEl.textContent = aScore;
  finalScoreBEl.textContent = bScore;

  // Clean up previous classes (reset)
  winnerTextEl.className = "";
  finalScoreAEl.parentElement.classList.remove("winner-highlight");
  finalScoreBEl.parentElement.classList.remove("winner-highlight");

  // Determine Winner
  if (aScore > bScore) {
    winnerTextEl.textContent = "Player A Wins!";
    winnerTextEl.className = "win-text-a"; // Make sure this is className = ...
    finalScoreAEl.parentElement.classList.add("winner-highlight");
    createConfetti();
  } else if (bScore > aScore) {
    winnerTextEl.textContent = "Player B Wins!";
    winnerTextEl.className = "win-text-b";
    finalScoreBEl.parentElement.classList.add("winner-highlight");
    createConfetti();
  } else {
    winnerTextEl.textContent = "It's a Tie!";
    winnerTextEl.className = "win-text-tie";
  }

  // Show Modal
  modalEl.style.display = "flex";

  setStatus("Game Over");
  updateTurnIndicators();
}

function createConfetti() {
  const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
  const confettiCount = 100;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');

    // Random Properties
    const bg = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100 + 'vw';
    const animDuration = Math.random() * 3 + 2 + 's'; // 2s to 5s
    const animDelay = Math.random() * 0.5 + 's';

    confetti.style.backgroundColor = bg;
    confetti.style.left = left;
    confetti.style.top = '-10px';
    confetti.style.animationDuration = animDuration;
    confetti.style.animationDelay = animDelay;

    document.body.appendChild(confetti);

    // Remove after animation
    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }
}

holeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const index = Number(btn.dataset.index);
    if (!btn.classList.contains("disabled")) {
      handleHoleClick(index);
    }
  });
});

newGameBtn.addEventListener("click", initBoard);
modalRestartBtn.addEventListener("click", initBoard); // Wire up modal button

initBoard();