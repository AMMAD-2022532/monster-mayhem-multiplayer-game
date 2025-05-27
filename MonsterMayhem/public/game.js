document.addEventListener('DOMContentLoaded', () => {
  const SIZE = 10;
  const boardEl = document.getElementById('board');
  let currentPlayer = null;

  const socket = io();
  socket.emit('joinGame', 'default');

  socket.on('stateUpdate', state => {
    console.clear();
    console.log('Game State:', state);
    renderBoard(state);
  });

  function renderBoard(state) {
    currentPlayer = state.current;

    boardEl.innerHTML = '';
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${SIZE}, 1fr)`;

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        
        if (isEdge(x, y, currentPlayer)) {
          cell.classList.add('edge');
        }

        cell.addEventListener('click', () => {
          console.log(`Clicked cell (${x}, ${y})`);
        });

        boardEl.appendChild(cell);
      }
    }
  }

  function isEdge(x, y, player) {
    if (player === 1) return y === 0;
    if (player === 2) return x === SIZE - 1;
    if (player === 3) return y === SIZE - 1;
    if (player === 4) return x === 0;
    return false;
  }
});
