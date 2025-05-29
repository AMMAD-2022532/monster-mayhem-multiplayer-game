const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Mutex } = require('async-mutex');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const games = {};
const gameLocks = {};

class Game {
  constructor(id) {
    this.id = id;
    this.SIZE = 10;
    this.MAX_MONSTERS = 10;
    this.stats = {
      totalGames: 0,
      player: {
        1: { wins: 0, losses: 0 },
        2: { wins: 0, losses: 0 },
        3: { wins: 0, losses: 0 },
        4: { wins: 0, losses: 0 }
      }
    };
    this.startNewGame();
  }
//
  startNewGame() {
    this.board = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(null));
    this.removed = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.players = [1, 2, 3, 4];
    this.placedMap = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.placedCount = 0;
    this._newRound();
  }

  _newRound() {
    const counts = this.players.map(p => ({ p, c: this._count(p) }));
    const byCount = {};
    counts.forEach(o => (byCount[o.c] ||= []).push(o.p));
    this.queue = [];
    Object.keys(byCount).sort((a, b) => a - b).forEach(c =>
      byCount[c].sort(() => Math.random() - 0.5).forEach(p => this.queue.push(p))
    );
    this.current = this.queue.shift();
    this.placedCount = 0;
  }

  _count(p) {
    return this.board.flat().filter(c => c?.player === p).length;
  }

  apply(action, data) {
    if (action === 'place') this._place(data);
    else if (action === 'move') this._move(data);
    else if (action === 'endTurn') this._endTurn();
    else if (action === 'restartGame') this._restartGame();
  }

  _restartGame() {
    this.startNewGame();
  }

  _place({ x, y, type }) {
    if (this.placedCount > 0) throw 'Already placed this turn.';
    if (!this._isEdge(x, y, this.current)) throw 'Must place on your edge.';
    if (this.board[y][x]) throw 'Cell is already occupied.';
    if (this.placedMap[this.current] >= this.MAX_MONSTERS) throw 'You placed all 10 monsters. Move instead.';

    this.board[y][x] = { type, player: this.current };
    this.placedMap[this.current]++;
    this.placedCount++;
  }

  _move({ from, to }) {
    const m = this.board[from.y][from.x];
    if (!m || m.player !== this.current) throw 'Not your monster.';
    if (!this._canReach(from, to, this.current)) throw 'Invalid move.';

    const target = this.board[to.y][to.x];
    this.board[from.y][from.x] = null;

    if (target) {
      const winnerType = this._resolve(m.type, target.type);
      if (winnerType === 'both') {
        this.removed[m.player]++;
        this.removed[target.player]++;
        this.board[to.y][to.x] = null;
      } else if (winnerType === m.type) {
        this.removed[target.player]++;
        this.board[to.y][to.x] = { type: m.type, player: this.current };
      } else {
        this.removed[m.player]++;
      }
    } else {
      this.board[to.y][to.x] = { ...m };
    }

    this._checkElimination();
  }

  _endTurn() {
    if (this.queue.length === 0) {
      this._newRound();
    } else {
      this.current = this.queue.shift();
      this.placedCount = 0;

      const hasPlacedAll = this.placedMap[this.current] >= this.MAX_MONSTERS;
      const canMove = this._hasAnyMove(this.current);

      if (hasPlacedAll && !canMove) {
        this._endTurn(); // skip if stuck
      }
    }
  }

  _checkElimination() {
    this.players = this.players.filter(p => {
      const alive = this._count(p);
      const placedAll = this.placedMap[p] >= this.MAX_MONSTERS;
      if (alive === 0 && placedAll) {
        this.stats.player[p].losses++;
        return false;
      }
      return true;
    });

    if (this.players.length === 1) {
      const winner = this.players[0];
      this.stats.player[winner].wins++;
      this.stats.totalGames++;
      io.in(this.id).emit('gameOver', winner);
    }
  }

  _isEdge(x, y, p) {
    if (p === 1) return y === 0;
    if (p === 2) return x === this.SIZE - 1;
    if (p === 3) return y === this.SIZE - 1;
    if (p === 4) return x === 0;
    return false;
  }

  _canReach(from, to, p) {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = Math.sign(to.x - from.x);
    const sy = Math.sign(to.y - from.y);

    if (dx === 0 || dy === 0) {
      const steps = Math.max(dx, dy);
      for (let i = 1; i < steps; i++) {
        const c = this.board[from.y + (dy ? i * sy : 0)][from.x + (dx ? i * sx : 0)];
        if (c && c.player !== p) return false;
      }
      return steps > 0;
    }

    if (dx === dy && dx > 0 && dx <= 2) {
      if (dx === 2) {
        const mx = from.x + sx;
        const my = from.y + sy;
        if (this.board[my][mx]?.player !== p) return false;
      }
      return true;
    }

    return false;
  }

  _resolve(a, b) {
    const beats = { vampire: 'werewolf', werewolf: 'ghost', ghost: 'vampire' };
    if (a === b) return 'both';
    return beats[a] === b ? a : b;
  }

  _hasAnyMove(p) {
    if (this.placedCount === 0 && this.placedMap[p] < this.MAX_MONSTERS) return true;

    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        const m = this.board[y][x];
        if (!m || m.player !== p) continue;

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            if (tx >= 0 && tx < this.SIZE && ty >= 0 && ty < this.SIZE) {
              if (this._canReach({ x, y }, { x: tx, y: ty }, p)) {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  }

  exportState() {
    return {
      board: this.board,
      removed: this.removed,
      players: this.players,
      queue: this.queue,
      current: this.current,
      placedCount: this.placedCount,
      stats: this.stats,
      SIZE: this.SIZE
    };
  }
}

io.on('connection', socket => {
  let gameId = null;

  socket.on('joinGame', id => {
    gameId = id;
    if (!games[id]) {
      games[id] = new Game(id);
      gameLocks[id] = new Mutex();
    }
    socket.join(id);
    socket.emit('stateUpdate', games[id].exportState());
  });

  socket.on('action', async ({ action, data }) => {
    if (!gameId) return;
    try {
      await gameLocks[gameId].runExclusive(() => {
        games[gameId].apply(action, data);
        io.in(gameId).emit('stateUpdate', games[gameId].exportState());
      });
    } catch (err) {
      socket.emit('errorMsg', err.toString());
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
