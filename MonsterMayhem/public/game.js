document.addEventListener('DOMContentLoaded', () => {
  const SIZE = 10;
  const MAX_MONSTERS = 10;
  const EMOJI = { vampire: '🦇', werewolf: '🐺', ghost: '👻' };
  const playerColors = {
    1: '#cce5ff',
    2: '#ffcdd2',
    3: '#dcedc8',
    4: '#e1bee7'
  };

  let myPlayer = null;
  const pm = document.getElementById('playerSelectModal');
  pm.querySelectorAll('button[data-player]').forEach(b => {
    b.addEventListener('click', () => {
      myPlayer = +b.dataset.player;
      pm.style.display = 'none';
      initGame();
    });
  });

  function initGame() {
    let state = null;
    let lastTotal = 0;
    const socket = io();
    socket.emit('joinGame', 'default');

    socket.on('stateUpdate', s => {
      if (s.stats.totalGames > lastTotal) {
        document.getElementById('gameOverModal').classList.add('hidden');
        document.getElementById('log').innerHTML = '';
      }
      lastTotal = s.stats.totalGames;
      state = s;
      render();
    });

    socket.on('errorMsg', m => {
      if (!m.includes('Invalid move')) log('⚠️ ' + m);
    });

    socket.on('gameOver', winner => {
      if (state) render();
      setTimeout(() => {
        document.getElementById('gameOverText').textContent = `🎉 Player ${winner} wins! 🎉`;
        document.getElementById('gameOverModal').classList.remove('hidden');
      }, 300);
    });

    document.getElementById('restartBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to restart the game?')) {
        socket.emit('action', { action: 'restartGame' });
        document.getElementById('gameOverModal').classList.add('hidden');
      }
    });

    const youAreEl = document.getElementById('youAre');
    const totalEl = document.getElementById('totalGames');
    const statsEl = document.getElementById('playerStats');
    const turnEl = document.getElementById('currentPlayer');
    const placedEl = document.getElementById('placedCount');
    const placedList = document.getElementById('placedStatsList');
    const typeCountList = document.getElementById('monsterTypeCount');
    const logEl = document.getElementById('log');
    const endBtn = document.getElementById('endTurnBtn');
    const monsterBtns = Array.from(document.querySelectorAll('.monster-btn'));
    const boardEl = document.getElementById('board');

    let selectedType = monsterBtns[0].dataset.type;
    let selectedPos = null;

    monsterBtns.forEach(b => {
      b.addEventListener('click', () => {
        monsterBtns.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        selectedType = b.dataset.type;
        selectedPos = null;
        clearHighlights();
      });
    });
    monsterBtns[0].classList.add('active');

    endBtn.addEventListener('click', () => {
      if (state.current !== myPlayer) return;
      socket.emit('action', { action: 'endTurn', data: {} });
      selectedPos = null;
      clearHighlights();
    });

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.title = "Click to place or move monster";
        cell.addEventListener('click', () => onClick(x, y));
        boardEl.append(cell);
      }
    }

    function emit(a, d) {
      socket.emit('action', { action: a, data: d });
    }

    function isEdge(x, y, p) {
      if (p === 1) return y === 0;
      if (p === 2) return x === SIZE - 1;
      if (p === 3) return y === SIZE - 1;
      if (p === 4) return x === 0;
      return false;
    }

    function log(msg) {
      if (!msg) return;
      const li = document.createElement('li');
      li.textContent = msg;
      logEl.prepend(li);
    }

    function clearHighlights() {
      document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected', 'highlight', 'edge'));
    }

    function highlightSelection() {
      clearHighlights();
      document.querySelector(`.cell[data-x="${selectedPos.x}"][data-y="${selectedPos.y}"]`)
        .classList.add('selected');
    }

    function highlightReachable() {
      for (let yy = 0; yy < SIZE; yy++) {
        for (let xx = 0; xx < SIZE; xx++) {
          if (canReach(selectedPos.x, selectedPos.y, xx, yy)) {
            document.querySelector(`.cell[data-x="${xx}"][data-y="${yy}"]`)
              .classList.add('highlight');
          }
        }
      }
    }

    function canReach(x1, y1, x2, y2) {
      const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
      const sx = Math.sign(x2 - x1), sy = Math.sign(y2 - y1);
      if (dx === 0 || dy === 0) {
        const steps = Math.max(dx, dy);
        for (let i = 1; i < steps; i++) {
          const c = state.board[y1 + (dy ? i * sy : 0)][x1 + (dx ? i * sx : 0)];
          if (c && c.player !== state.current) return false;
        }
        return steps > 0;
      }
      if (dx === dy && dx > 0 && dx <= 2) {
        if (dx === 2) {
          const mx = x1 + sx, my = y1 + sy;
          if (state.board[my][mx]?.player !== state.current) return false;
        }
        return true;
      }
      return false;
    }

    function onClick(x, y) {
      if (!state || state.current !== myPlayer) return;
      const occ = state.board[y][x];

      const myPlaced = state.board.flat().filter(c => c?.player === myPlayer).length;
      if (!occ && state.placedCount === 0 && isEdge(x, y, state.current) && myPlaced < MAX_MONSTERS) {
        emit('place', { x, y, type: selectedType });
        return;
      }

      if (occ && occ.player === state.current) {
        selectedPos = { x, y };
        highlightSelection();
        highlightReachable();
        return;
      }

      if (selectedPos) {
        emit('move', { from: selectedPos, to: { x, y } });
        selectedPos = null;
        clearHighlights();
      }
    }

    function render() {
      youAreEl.textContent = `You are Player ${myPlayer}`;
      totalEl.textContent = state.stats.totalGames;
      statsEl.textContent = Object.entries(state.stats.player)
        .map(([p, s]) => `P${p}:${s.wins}–${s.losses}`).join(' | ');
      turnEl.textContent = `Player ${state.current}`;
      placedEl.textContent = `You placed ${state.placedCount} out of 1 monster this turn`;

      placedList.innerHTML = '';
      [1, 2, 3, 4].forEach(p => {
        const active = state.board.flat().filter(c => c?.player === p).length;
        const removed = state.removed[p] || 0;
        const placed = active + removed;
        const li = document.createElement('li');
        const box = document.createElement('span');
        box.style.display = 'inline-block';
        box.style.width = '10px';
        box.style.height = '10px';
        box.style.marginRight = '6px';
        box.style.backgroundColor = playerColors[p];
        li.appendChild(box);
        li.appendChild(document.createTextNode(`P${p}: Placed ${placed} (On board: ${active})`));
        placedList.appendChild(li);
      });

      boardEl.querySelectorAll('.cell').forEach(c => {
        c.textContent = '';
        c.classList.remove('p1', 'p2', 'p3', 'p4', 'edge');
      });

      state.board.forEach((row, y) =>
        row.forEach((cell, x) => {
          const c = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
          if (cell) {
            c.textContent = EMOJI[cell.type];
            c.classList.add('p' + cell.player);
          }
        })
      );

      const ownMonsters = state.board.flat().filter(c => c?.player === myPlayer);
      const typeCount = { vampire: 0, werewolf: 0, ghost: 0 };
      ownMonsters.forEach(m => typeCount[m.type]++);
      typeCountList.innerHTML = '';
      for (const [type, count] of Object.entries(typeCount)) {
        const emoji = EMOJI[type];
        const li = document.createElement('li');
        li.textContent = `${emoji}: ${count}`;
        typeCountList.appendChild(li);
      }

      const myTurn = state.current === myPlayer;
      endBtn.disabled = !myTurn;
      monsterBtns.forEach(b => b.disabled = !myTurn);

      if (state.placedCount === 0) {
        document.querySelectorAll('.cell').forEach(c => {
          const x = +c.dataset.x, y = +c.dataset.y;
          if (!state.board[y][x] && isEdge(x, y, state.current)) {
            c.classList.add('edge');
          }
        });
      }

      if (state.players.length === 1) {
        endBtn.disabled = true;
        monsterBtns.forEach(b => b.disabled = true);
      }
    }
  }
});
