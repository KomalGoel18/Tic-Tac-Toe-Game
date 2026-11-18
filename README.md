# Tic Tac Toe

An interactive Tic-Tac-Toe game built with plain **HTML, CSS and JavaScript**. You can play against a friend on the same device or against the computer at three difficulty levels. The interface is colorful, works on phones, and includes a score tracker, a highlighted winning line, confetti and sound effects.

## Aim

Build a game where players take turns marking spaces on a 3×3 grid. The first player to get three marks (✕ or ◯) in a row horizontally, vertically or diagonally wins. If the board fills up with no winner, the round is a draw.

## How to Run

No installation or build step is needed.

1. Download or clone this folder.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox or Safari).

> An internet connection is only used to load the *Fredoka* font from Google Fonts. Without it, the game still works and uses a system font.

## How to Play

1. **Setup screen**
   - Choose a mode: **👥 2 Players** or **🤖 vs Computer**.
   - Enter player names (optional). Blank names default to "Player X" and "Player O".
   - In vs Computer mode, pick a difficulty: **Easy**, **Medium** or **Hard**.
   - Click **Let's Play! 🎮**.
2. **Game screen**
   - Click an empty cell to place your mark. Players take turns.
   - The highlighted score card and the status line show whose turn it is.
   - Get three in a row to win the round.
3. **Buttons**
   - **New Round / Play Again**: clears the board and starts the next round.
   - **Reset Scores**: sets all scores back to 0 after asking you to confirm.
   - **Menu**: returns to the setup screen.
   - **🔊 / 🔇**: turns sound on or off.

## Features

| Feature | Description |
|---|---|
| Two game modes | Local 2-player, or single player against the computer |
| Computer opponent | **Easy**: random moves · **Medium**: plays the best move about 60% of the time · **Hard**: unbeatable, using the minimax algorithm |
| Custom player names | Names appear on the scoreboard and in the turn and win messages |
| Score tracker | Counts wins for each player and draws |
| Saved scores | Scores and settings are stored in `localStorage`, so they survive a page refresh |
| Fair turns | The player who moves first alternates every round |
| Win highlight | The three winning cells are highlighted and animated, and confetti falls |
| Draw detection | The board dims and the draw counter goes up |
| Hover preview | A faint preview of your mark appears on empty cells |
| Sound effects | Different sounds for ✕ and ◯ moves, win, loss, draw and button clicks, generated with the Web Audio API (no audio files) |
| Responsive design | Fits any screen size without scrolling |
| Accessibility | Keyboard-focusable cells and buttons, screen-reader labels, and support for the "reduced motion" setting |

## Project Structure

```
Tic-Tac-Toe Game/
├── index.html          # Page structure: setup screen and game screen
├── style.css           # Visual design, layout and animations
├── script.js           # Game logic, computer opponent, scores and sounds
├── design/
│   └── mockups.html    # Design mockups made before coding (Options A and B)
└── README.md
```

## How It Works

### Board and turns
The board is stored as an array of 9 values (`'X'`, `'O'` or `null`). A click listener on the board finds the clicked cell, places the current player's mark, checks for a result and then switches turns.

### Win and draw check
All 8 possible winning lines (3 rows, 3 columns and 2 diagonals) are listed as index triples:

```js
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];
```

After every move, the game checks whether one line holds the same mark in all three cells. If no line does and every cell is filled, the round is a draw.

### Computer opponent (minimax)
On **Hard**, the computer uses the **minimax** algorithm. It simulates every possible future move and picks the one with the best guaranteed outcome, so it can never lose. Wins that come sooner score higher, so the computer finishes a game quickly when it can. **Easy** picks a random empty cell, and **Medium** mixes the two approaches.

### Saving data
Scores, names, mode, difficulty and the sound setting are saved as JSON in the browser's `localStorage`. Starting a game with a different mode, difficulty or names begins a fresh scoreboard.

### Sound
Each sound is a short note made with an `OscillatorNode` and a `GainNode` fade-in and fade-out in the Web Audio API, so the project needs no sound files.

## Concepts Practised

- DOM manipulation (creating and updating elements dynamically)
- Event handling (clicks, form submission, event delegation)
- Conditional logic and game state management
- Recursion (the minimax algorithm)
- Browser storage (`localStorage`)
- The Web Audio API
- CSS Flexbox, Grid, custom properties, animations and responsive design
- Match history and statistics
