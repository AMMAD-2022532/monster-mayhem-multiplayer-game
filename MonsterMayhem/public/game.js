document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const SIZE = 10;
  const EMOJI = { vampire: '🦇', werewolf: '🐺', ghost: '👻' };
  const playerColors = {
    1: '#cce5ff',
    2: '#ffcdd2',
    3: '#dcedc8',
    4: '#e1bee7'
  };

  let state = null;

  socket.emit('joinGame', 'default');

  socket.on('stateUpdate', s => {
    state = s;
    renderBoard();
  });

  function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${SIZE}, 1fr)`;

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        const monster = state.board[y][x];
        if (monster) {
          cell.textContent = EMOJI[monster.type];
          cell.style.backgroundColor = playerColors[monster.player];
        }
        board.appendChild(cell);
      }
    }

    document.getElementById('currentPlayer').textContent = state.current;
    document.getElementById('totalGames').textContent = state.stats.totalGames;
    document.getElementById('placedCount').textContent = state.placedCount;

    const statsText = Object.entries(state.stats.player)
      .map(([p, s]) => `P${p}: ${s.wins}-${s.losses}`)
      .join(' | ');
    document.getElementById('playerStats').textContent = statsText;
  }
});
