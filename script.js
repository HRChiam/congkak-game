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
let currentAnimDuration = 450; // Variable duration
const NORMAL_ANIM_DURATION = 500;
const RACE_ANIM_DURATION = 60; // Super fast for racing

let board = [];
let currentPlayer = "A";
let gamePhase = "setup"; // "setup", "race", "turn"
let activeTurnCount = 0;
let gameOver = false;
let matchId = 0;
let raceResult = null;

// Race specific variables
let keyPlayerA = "ArrowRight";
let keyPlayerB = "ArrowLeft";
let resolveKeyA = null;
let resolveKeyB = null;
let finishTimeA = 0;
let finishTimeB = 0;

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

const raceOverlay = document.getElementById("raceOverlay");
const btnMashA = document.getElementById("btnMashA");
const btnMashB = document.getElementById("btnMashB");

const rulesBtn = document.getElementById("rulesBtn");
const rulesModal = document.getElementById("rulesModal");
const closeRulesBtn = document.getElementById("closeRulesBtn");
const closeRulesX = document.getElementById("closeRulesX");
function openRules() {
  rulesModal.style.display = "flex";
}

function closeRules() {
  rulesModal.style.display = "none";
}

rulesBtn.addEventListener("click", openRules);
closeRulesBtn.addEventListener("click", closeRules);
if (closeRulesX) closeRulesX.addEventListener("click", closeRules);

// Update window click to close Rules if clicking outside
window.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
  if (e.target === rulesModal) {
    closeRules();
  }
});

// --- SETTINGS LOGIC ---
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const closeSettingsX = document.getElementById("closeSettingsX");
const btnSetKeyA = document.getElementById("btnSetKeyA");
const btnSetKeyB = document.getElementById("btnSetKeyB");

// Load saved keys from LocalStorage (if any)
if (localStorage.getItem("congkakKeyA")) {
  keyPlayerA = localStorage.getItem("congkakKeyA");
  btnSetKeyA.textContent = keyPlayerA;
}
if (localStorage.getItem("congkakKeyB")) {
  keyPlayerB = localStorage.getItem("congkakKeyB");
  btnSetKeyB.textContent = keyPlayerB;
}

// Open Settings
settingsBtn.addEventListener("click", () => {
  settingsModal.style.display = "flex";
});

// Close Settings
function closeSettings() {
  settingsModal.style.display = "none";
  if (gamePhase === "race") {
    setStatus(`RACE! A: [${keyPlayerA}] or TAP A | B: [${keyPlayerB}] or TAP B`);
  }
}

closeSettingsBtn.addEventListener("click", closeSettings);
// ADD THIS LISTENER:
if (closeSettingsX) closeSettingsX.addEventListener("click", closeSettings);

// Also close if clicking outside the box
window.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

// --- KEYBOARD LISTENER FOR RACE ---
document.addEventListener("keydown", (e) => {
  // If settings modal is open, do not trigger game logic
  if (settingsModal.style.display === "flex" || rulesModal.style.display === "flex") return;

  if (gamePhase === "race") {
    // Check against dynamic variable keyPlayerA
    if (e.code === keyPlayerA && resolveKeyA) {
      e.preventDefault();
      const resolve = resolveKeyA;
      resolveKeyA = null;
      resolve();
    }
    // Check against dynamic variable keyPlayerB
    if (e.code === keyPlayerB && resolveKeyB) {
      e.preventDefault();
      const resolve = resolveKeyB;
      resolveKeyB = null;
      resolve();
    }
  }
});

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

  // Reset resolution hooks
  resolveKeyA = null;
  resolveKeyB = null;

  // Hide modal if open
  modalEl.style.display = "none";

  holeButtons.forEach(btn => btn.classList.remove("selected-start"));

  updateHandDisplay("A", 0, false);
  updateHandDisplay("B", 0, false);
  updateTurnIndicators();
  renderBoard();
  setStatus("Player A: Click a hole to start.");
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
  const el = player === "A" ? handIndicatorAEl : handIndicatorBEl;
  const txt = player === "A" ? handCountAEl : handCountBEl;

  txt.textContent = count;
  el.style.opacity = visible ? "1" : "0";
  el.style.transform = visible ? "scale(1)" : "scale(0.8)";
}

// --- Rendering & UI ---

function renderBoard() {
  holeButtons.forEach((btn) => {
    const index = Number(btn.dataset.index);
    const seedCount = board[index];

    btn.innerHTML = "";

    const seedContainer = document.createElement("div");
    seedContainer.classList.add("seed-container");

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
    currentTurnEl.textContent = gamePhase === "race" ? "MASH KEYS!" : "Setup";
    if (startChoiceA === null) {
      document.body.classList.add("player-a-turn");
      document.body.classList.remove("player-b-turn");
    } else if (startChoiceB === null) {
      document.body.classList.remove("player-a-turn");
      document.body.classList.add("player-b-turn");
    } else {
      // Both active during race
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

// Helper to wait for specific player key press
function waitForKeyPress(player) {
  return new Promise((resolve) => {
    if (player === "A") resolveKeyA = resolve;
    else resolveKeyB = resolve;
  });
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

    // 1. Define Exact Durations (in ms)
    const isRace = (gamePhase === "race");
    const duration = isRace ? 60 : 350; // 350ms for normal feels snappier

    // 2. Create Element
    const floating = document.createElement("div");
    floating.classList.add("floating-seed");
    floating.style.left = `${startX}px`;
    floating.style.top = `${startY}px`;
    floating.style.transform = "scale(0.8)";
    floating.style.opacity = "1";
    document.body.appendChild(floating);

    // Force Reflow
    floating.offsetWidth;

    // 3. Apply Transition 
    floating.style.transition = `
      left ${duration}ms linear, 
      top ${duration}ms cubic-bezier(0.55, 0.055, 0.675, 0.19), 
      transform ${duration}ms ease-out
    `;

    floating.style.left = `${endX}px`;
    floating.style.top = `${endY}px`;
    floating.style.transform = "scale(1)";

    // 4. PRE-EMPTIVE SOUND TRIGGER (The Fix)
    const soundDelay = Math.max(0, duration - 50);

    setTimeout(() => {
      const targetEl = getSlotElement(toIndex);

      // Handle Audio
      if (isStore(toIndex)) {
        if (isRace) {
          const s = sndStore.cloneNode();
          s.volume = 0.1;
          s.play().catch(() => { });
        } else {
          // Reset time to 0 to allow rapid replays
          sndStore.currentTime = 0;
          sndStore.play().catch(() => { });
        }
        targetEl.classList.add("store-pulse");
        setTimeout(() => targetEl.classList.remove("store-pulse"), 200);
      } else {
        if (!isRace) {
          sndDrop.currentTime = 0; // Instant replay
          sndDrop.play().catch(() => { });
        }
        targetEl.classList.add("slot-glow");
        setTimeout(() => targetEl.classList.remove("slot-glow"), 200);
      }
    }, soundDelay);

    // 5. Cleanup & Resolve
    setTimeout(() => {
      if (document.body.contains(floating)) {
        document.body.removeChild(floating);
      }
      resolve();
    }, duration);
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
        // Trigger Race Instructions
        setStatus(`RACE! A: [${keyPlayerA}] or TAP A | B: [${keyPlayerB}] or TAP B`);
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
  currentAnimDuration = RACE_ANIM_DURATION; // Fast animation

  if (raceOverlay) raceOverlay.style.display = "flex";
  // 1. Snapshot scores
  const startScoreA = board[7];
  const startScoreB = board[15];

  // Reset timers
  finishTimeA = 0;
  finishTimeB = 0;
  updateTurnIndicators();
  holeButtons.forEach(btn => btn.classList.remove("selected-start"));

  // 2. Run both players simultaneously
  const p1 = runTurnLogic(startChoiceA, "A").then(() => {
    finishTimeA = Date.now();
    updateHandDisplay("A", 0, false);
  });
  const p2 = runTurnLogic(startChoiceB, "B").then(() => {
    finishTimeB = Date.now();
    updateHandDisplay("B", 0, false);
  });

  await Promise.all([p1, p2]);

  if (raceOverlay) raceOverlay.style.display = "none";

  if (matchId !== currentMatchId) return;

  activeTurnCount = 0;
  gamePhase = "turn";
  currentAnimDuration = NORMAL_ANIM_DURATION; // Restore normal speed

  // 3. Calculate Scores
  const finalScoreA = board[7];
  const finalScoreB = board[15];

  // Case 1: Player A stopped first (Time A is smaller than Time B)
  if (finishTimeA < finishTimeB) {
    currentPlayer = "A";
    setStatus(`Race Over! Player A stopped first, so A goes next.`);
  }
  // Case 2: Player B stopped first
  else if (finishTimeB < finishTimeA) {
    currentPlayer = "B";
    setStatus(`Race Over! Player B stopped first, so B goes next.`);
  }
  // Case 3: Exact Tie (Impossible, but handled)
  else {
    // Tie-breaker: Who has MORE seeds in store?
    if (finalScoreA > finalScoreB) {
      currentPlayer = "A";
      setStatus(`Perfect Time Tie! Player A has higher score, so A goes next.`);
    } else {
      currentPlayer = "B";
      setStatus(`Perfect Time Tie! Player B has higher score, so B goes next.`);
    }
  }

  // --- NEW LOGIC END ---

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

      if (gamePhase === "race") {
        if (statusEl.textContent.includes("CAPTURE") || statusEl.textContent.includes("Store")) {
        } else {
        }
        await waitForKeyPress(player);
      }

      let nextIndex = (currentIndex + 1) % TOTAL_SLOTS;

      // Skip opponent's store
      if (player === "A" && nextIndex === 15) {
        nextIndex = 0;
      } else if (player === "B" && nextIndex === 7) {
        nextIndex = 8;
      }

      // 2. Animate (Visual)
      await animateSeedMove(currentIndex, nextIndex);

      if (matchId !== currentMatchId) return;

      hand--;
      updateHandDisplay(player, hand, true);

      // 3. Land (Data)
      board[nextIndex]++;
      currentIndex = nextIndex;
      renderBoard();

      // Only sleep in normal mode (in race mode, the keypress IS the wait)
      if (gamePhase !== "race") {
        await sleep(100);
      }
    }

    // 2. Check Landing Condition
    if (isStore(currentIndex)) {
      if (gamePhase === "race") {
        setStatus(`RACE: Player ${player} landed in Store! Finished!`);
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
        if (gamePhase === "race") {
          setStatus(`RACE: Player ${player} stopped (Mati). Finished!`);
        } else {
          setStatus(`Player ${player} stopped (Mati).`);
        }
      }
      keepGoing = false;
    }
    else {
      // Pick up seeds
      if (gamePhase !== "race") {
        setStatus(`Player ${player} continues...`);
        await sleep(200);
      } else {
        // setStatus(`RACE! Player ${player} pick up seeds! MASH KEYS!`);
      }

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

    // --- 核心修复：竞速模式下的提示与延时 ---
    if (gamePhase === "race") {
      // 播放声音但音量小一点
      const s = sndCapture.cloneNode();
      s.volume = 0.5;
      s.play().catch(() => { });

      // 提示语加上 "KEEP GOING"
      const otherPlayer = player === "A" ? "B" : "A";
      setStatus(`RACE: Player ${player} CAPTURED! Player ${otherPlayer} KEEP MASHING!`);

      // 竞速模式几乎不等待，保持快节奏
      await sleep(100);
    } else {
      // 正常模式
      setStatus(`CAPTURE! Player ${player} takes ${capturedSeeds} seeds!`);
      sndCapture.play().catch(() => { });
      await sleep(600);
    }
    // -------------------------------------

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
    if (gamePhase === "race") {
      setStatus(`RACE: Player ${player} landed in empty hole. Finished.`);
    } else {
      setStatus(`Player ${player} landed in empty hole. No seeds to capture.`);
    }
  }
}

function checkGameState() {
  renderBoard();

  if (sideEmpty("A") && sideEmpty("B")) {
    endGame();
    return;
  }

  if (gamePhase === "turn" && activeTurnCount === 0) {
    if (statusEl.textContent.startsWith("Race")) {
      updateTurnIndicators();
      return;
    }

    const statusText = statusEl.textContent;
    const isFreeTurn = statusText.includes("another turn") || statusText.includes("Entering Turn Mode");

    if (isFreeTurn) {
      if (sideEmpty(currentPlayer)) {
        setStatus(`Landed in Store! But Player ${currentPlayer} has no seeds. Game Over.`);
        gamePhase = "ended";
        setTimeout(() => {
          collectRemainingSeeds();
          renderBoard();
          endGame();
        }, 2000);
        return;
      }
      updateTurnIndicators();
      return;
    }

    const nextPlayer = currentPlayer === "A" ? "B" : "A";
    if (sideEmpty(nextPlayer)) {
      setStatus(`Player ${nextPlayer} has no seeds to move! Player ${currentPlayer} collects the rest.`);
      gamePhase = "ended";
      setTimeout(() => {
        collectRemainingSeeds();
        renderBoard();
        endGame();
      }, 2000);
      return;
    }

    currentPlayer = nextPlayer;
    setStatus(`Now Player ${currentPlayer}'s turn.`);
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

// Generic function to record a new key
function setupKeyRecorder(btnElement, player) {
  btnElement.addEventListener("click", () => {
    // Visual Feedback
    const originalText = btnElement.textContent;
    btnElement.textContent = "Press Key...";
    btnElement.classList.add("listening");

    // One-time listener for the next key press
    const keyHandler = (e) => {
      e.preventDefault(); // Stop page scrolling if they pick Spacebar

      const newCode = e.code; // e.g., "KeyD", "Space", "ArrowUp"

      // Save to variable
      if (player === "A") {
        keyPlayerA = newCode;
        localStorage.setItem("congkakKeyA", newCode); // Save for next time
      } else {
        keyPlayerB = newCode;
        localStorage.setItem("congkakKeyB", newCode);
      }

      // Update Button UI
      btnElement.textContent = newCode;
      btnElement.classList.remove("listening");

      // Remove this temporary listener
      document.removeEventListener("keydown", keyHandler);
    };

    document.addEventListener("keydown", keyHandler);
  });
}

function triggerMash(player) {
  if (gamePhase !== "race") return;

  // Logic mimics the keyboard listener
  if (player === "A" && resolveKeyA) {
    const resolve = resolveKeyA;
    resolveKeyA = null;
    resolve();
    // Visual feedback
    btnMashA.style.transform = "scale(0.9)";
    setTimeout(() => btnMashA.style.transform = "scale(1)", 50);
  }
  
  if (player === "B" && resolveKeyB) {
    const resolve = resolveKeyB;
    resolveKeyB = null;
    resolve();
    // Visual feedback
    btnMashB.style.transform = "scale(0.9)";
    setTimeout(() => btnMashB.style.transform = "scale(1)", 50);
  }
}

// Add Listeners (pointerdown is faster than click for games)
if (btnMashA) btnMashA.addEventListener("pointerdown", (e) => {
    e.preventDefault(); // Stop mouse selection
    triggerMash("A");
});

if (btnMashB) btnMashB.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    triggerMash("B");
});

// Attach logic to buttons
setupKeyRecorder(btnSetKeyA, "A");
setupKeyRecorder(btnSetKeyB, "B");
newGameBtn.addEventListener("click", initBoard);
modalRestartBtn.addEventListener("click", initBoard); // Wire up modal button

initBoard();