// ================= Tic Tac Toe =================
// Modes: 'pvp' (2 players) or 'cpu' (human = X, computer = O)

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];
const SYMBOL = { X: '✕', O: '◯' };
const STORAGE_KEY = 'tictactoe-v1';
const CPU_DELAY = 600; // ms, so the computer "thinks" visibly

// ---------- Sound effects (generated with the Web Audio API, no audio files needed) ----------
const Sound = {
  ctx: null,

  // Browsers only allow audio after a user click, so the audio context is created on first use
  context() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  // Play one short note. `to` makes the pitch slide up or down.
  tone(freq, { start = 0, dur = 0.15, type = 'sine', vol = 0.2, to = null } = {}) {
    if (settings.muted) return;
    try {
      const c = this.context();
      const t = c.currentTime + start;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01); // quick fade in
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur); // fade out
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* audio not supported: play silently */ }
  },

  place(player) {
    if (player === 'X') this.tone(620, { to: 900, dur: 0.12, type: 'triangle', vol: 0.25 });
    else this.tone(480, { to: 320, dur: 0.14, type: 'triangle', vol: 0.25 });
  },

  win() { // happy rising arpeggio: C E G C
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, { start: 0.15 + i * 0.11, dur: i === 3 ? 0.4 : 0.14, type: 'triangle', vol: 0.22 }));
  },

  lose() { // sad falling notes (when the computer wins)
    [392, 330, 262].forEach((f, i) =>
      this.tone(f, { start: 0.15 + i * 0.2, dur: 0.25, to: f * 0.94, type: 'sawtooth', vol: 0.08 }));
  },

  draw() { // neutral "meh" two notes
    this.tone(494, { start: 0.15, dur: 0.18, type: 'sine', vol: 0.2 });
    this.tone(440, { start: 0.38, dur: 0.3, type: 'sine', vol: 0.2 });
  },

  click() {
    this.tone(1100, { dur: 0.04, type: 'square', vol: 0.04 });
  },
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const setupScreen = $('setup');
const gameScreen = $('game');
const setupForm = $('setup-form');
const nameXInput = $('name-x');
const nameOInput = $('name-o');
const difficultyField = $('difficulty-field');
const modeButtons = document.querySelectorAll('[data-mode]');
const levelButtons = document.querySelectorAll('[data-level]');
const boardEl = $('board');
const statusEl = $('status');
const badgeEl = $('mode-badge');
const confettiEl = $('confetti');
const newRoundBtn = $('new-round');

// ---------- State ----------
const settings = { mode: 'pvp', difficulty: 'medium', names: { X: '', O: '' }, muted: false };
let scores = { X: 0, O: 0, D: 0 };
let matchKey = '';       // identifies the current matchup; scores reset when it changes
let board = Array(9).fill(null);
let current = 'X';
let starter = 'X';       // who starts this round (alternates)
let gameOver = false;
let cpuTimer = null;

// ---------- Storage ----------
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, scores, matchKey, starter }));
  } catch { /* storage unavailable: game still works */ }
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;
    Object.assign(settings, data.settings);
    scores = data.scores || scores;
    matchKey = data.matchKey || '';
    starter = data.starter || 'X';
  } catch { /* ignore corrupt or blocked storage */ }
}

// ---------- Setup screen ----------
function renderSetup() {
  modeButtons.forEach((b) => {
    const on = b.dataset.mode === settings.mode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on);
  });
  levelButtons.forEach((b) => {
    const on = b.dataset.level === settings.difficulty;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on);
  });

  const isCpu = settings.mode === 'cpu';
  difficultyField.hidden = !isCpu;
  nameXInput.value = settings.names.X;
  nameOInput.disabled = isCpu;
  nameOInput.value = isCpu ? 'Computer' : settings.names.O;
}

modeButtons.forEach((b) => b.addEventListener('click', () => {
  if (settings.mode === 'pvp') settings.names.O = nameOInput.value.trim();
  settings.names.X = nameXInput.value.trim();
  settings.mode = b.dataset.mode;
  renderSetup();
}));

levelButtons.forEach((b) => b.addEventListener('click', () => {
  settings.difficulty = b.dataset.level;
  renderSetup();
}));

setupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  settings.names.X = nameXInput.value.trim();
  if (settings.mode === 'pvp') settings.names.O = nameOInput.value.trim();

  // New matchup → fresh scoreboard. Same matchup → keep scores.
  const key = [settings.mode, settings.difficulty, displayName('X'), displayName('O')].join('|');
  if (key !== matchKey) {
    matchKey = key;
    scores = { X: 0, O: 0, D: 0 };
    starter = 'X';
  }

  setupScreen.hidden = true;
  gameScreen.hidden = false;
  startRound();
});

function displayName(p) {
  if (p === 'O' && settings.mode === 'cpu') return 'Computer';
  return settings.names[p] || `Player ${p}`;
}

// ---------- Game flow ----------
function startRound() {
  clearTimeout(cpuTimer);
  board = Array(9).fill(null);
  current = starter;
  gameOver = false;
  confettiEl.innerHTML = '';
  save();
  renderGame();
  maybeCpuMove();
}

function isCpuTurn() {
  return settings.mode === 'cpu' && current === 'O' && !gameOver;
}

function play(index) {
  if (gameOver || board[index]) return;
  board[index] = current;
  Sound.place(current);

  const result = checkResult(board);
  if (result) {
    endRound(result);
  } else {
    current = current === 'X' ? 'O' : 'X';
    renderGame();
    maybeCpuMove();
  }
}

function endRound(result) {
  gameOver = true;
  scores[result.winner || 'D']++;
  starter = starter === 'X' ? 'O' : 'X'; // alternate who starts next round
  save();
  renderGame(result);

  if (!result.winner) {
    Sound.draw();
  } else if (settings.mode === 'cpu' && result.winner === 'O') {
    Sound.lose(); // the human lost to the computer
  } else {
    Sound.win();
    launchConfetti();
  }
}

function maybeCpuMove() {
  if (!isCpuTurn()) return;
  cpuTimer = setTimeout(() => play(cpuChooseMove()), CPU_DELAY);
}

// Returns { winner: 'X'|'O', line: [a,b,c] }, { winner: null } for a draw, or null if the game continues.
function checkResult(b) {
  for (const line of WIN_LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line };
  }
  return b.every(Boolean) ? { winner: null, line: [] } : null;
}

// ---------- Computer opponent ----------
function emptyCells(b) {
  return b.reduce((acc, v, i) => (v ? acc : [...acc, i]), []);
}

function randomMove(b) {
  const free = emptyCells(b);
  return free[Math.floor(Math.random() * free.length)];
}

// Minimax: computer is 'O' (maximizer), human is 'X'. Prefers faster wins / slower losses.
function minimax(b, player, depth) {
  const result = checkResult(b);
  if (result) {
    if (result.winner === 'O') return { score: 10 - depth };
    if (result.winner === 'X') return { score: depth - 10 };
    return { score: 0 };
  }
  let best = { score: player === 'O' ? -Infinity : Infinity, index: -1 };
  for (const i of emptyCells(b)) {
    b[i] = player;
    const { score } = minimax(b, player === 'O' ? 'X' : 'O', depth + 1);
    b[i] = null;
    if (player === 'O' ? score > best.score : score < best.score) best = { score, index: i };
  }
  return best;
}

function cpuChooseMove() {
  const b = [...board];
  switch (settings.difficulty) {
    case 'easy':
      return randomMove(b);
    case 'medium':
      // Plays perfectly about 60% of the time, otherwise randomly
      return Math.random() < 0.6 ? minimax(b, 'O', 0).index : randomMove(b);
    default:
      return minimax(b, 'O', 0).index;
  }
}

// ---------- Rendering ----------
function renderGame(result = null) {
  // Scoreboard
  $('label-x').textContent = `${displayName('X')} ${SYMBOL.X}`;
  $('label-o').textContent = `${displayName('O')} ${SYMBOL.O}`;
  $('pts-x').textContent = scores.X;
  $('pts-o').textContent = scores.O;
  $('pts-d').textContent = scores.D;

  const activeCard = result ? (result.winner ? `card-${result.winner.toLowerCase()}` : 'card-d')
                            : `card-${current.toLowerCase()}`;
  ['card-x', 'card-o', 'card-d'].forEach((id) => $(id).classList.toggle('active', id === activeCard));

  // Mode badge
  badgeEl.hidden = settings.mode !== 'cpu';
  const level = settings.difficulty;
  badgeEl.textContent = `🤖 ${level[0].toUpperCase()}${level.slice(1)}`;

  // Status line
  statusEl.className = 'status';
  if (result && result.winner) {
    statusEl.classList.add('banner', `win-${result.winner.toLowerCase()}`);
    statusEl.textContent = settings.mode === 'cpu' && result.winner === 'O'
      ? 'Computer wins! 🤖' : `${displayName(result.winner)} wins! 🎉`;
  } else if (result) {
    statusEl.classList.add('banner', 'draw');
    statusEl.textContent = "It's a draw! 🤝";
  } else if (isCpuTurn()) {
    statusEl.classList.add('thinking');
    statusEl.innerHTML = 'Computer is thinking<span class="dots"><i></i><i></i><i></i></span>';
  } else {
    const cls = current.toLowerCase();
    statusEl.innerHTML = '';
    const name = document.createElement('span');
    name.className = cls;
    name.textContent = displayName(current);
    statusEl.append(name, `'s turn ${SYMBOL[current]}`);
  }

  // Board
  boardEl.innerHTML = '';
  boardEl.dataset.turn = current;
  boardEl.classList.toggle('can-play', !gameOver && !isCpuTurn());
  boardEl.classList.toggle('dim', !!(result && !result.winner));

  board.forEach((value, i) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = i;
    const row = Math.floor(i / 3) + 1, col = (i % 3) + 1;
    cell.setAttribute('aria-label', `Row ${row}, column ${col}${value ? `, ${value}` : ', empty'}`);
    if (value) {
      cell.classList.add(value);
      cell.textContent = SYMBOL[value];
    }
    if (result && result.line.includes(i)) cell.classList.add('win');
    boardEl.appendChild(cell);
  });

  // New Round button becomes "Play Again" after a round ends
  newRoundBtn.textContent = gameOver ? 'Play Again' : 'New Round';
  newRoundBtn.classList.toggle('primary', gameOver);
}

function launchConfetti() {
  const colors = ['#ff6b6b', '#2ec4b6', '#ffd166', '#a78bfa', '#ffb703'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    confettiEl.appendChild(piece);
  }
}

// ---------- Event listeners ----------
boardEl.addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell || isCpuTurn()) return;
  play(Number(cell.dataset.index));
});

newRoundBtn.addEventListener('click', () => {
  // Abandoning a round mid-game doesn't count toward scores, but the starting player still alternates
  if (!gameOver) starter = starter === 'X' ? 'O' : 'X';
  startRound();
});

$('reset-scores').addEventListener('click', () => {
  if (!confirm('Reset all scores to 0?')) return;
  scores = { X: 0, O: 0, D: 0 };
  save();
  renderGame(gameOver ? checkResult(board) : null);
});

$('menu').addEventListener('click', () => {
  clearTimeout(cpuTimer);
  gameScreen.hidden = true;
  setupScreen.hidden = false;
  renderSetup();
});

// Soft click for every regular button
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn, .seg-btn')) Sound.click();
});

// Mute / unmute (remembered in localStorage)
const soundBtn = $('sound-toggle');
function renderSoundBtn() {
  soundBtn.textContent = settings.muted ? '🔇' : '🔊';
  soundBtn.classList.toggle('muted', settings.muted);
  soundBtn.setAttribute('aria-label', settings.muted ? 'Unmute sound' : 'Mute sound');
}
soundBtn.addEventListener('click', () => {
  settings.muted = !settings.muted;
  save();
  renderSoundBtn();
  Sound.click(); // confirms sound is back on (silent when muting)
});

// ---------- Init ----------
load();
renderSetup();
renderSoundBtn();
