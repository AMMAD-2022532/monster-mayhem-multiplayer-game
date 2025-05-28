const express    = require('express');
const path       = require('path');
const http       = require('http');
const { Server } = require('socket.io');
const { Mutex }  = require('async-mutex');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
const PORT   = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const games     = {};
const gameLocks = {};

class Game {
  constructor(id) {
    this.id          = id;
    this.SIZE        = 10;
    this.board       = Array.from({ length: this.SIZE }, () =>
                         Array(this.SIZE).fill(null));
    this.removed     = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.players     = [1, 2, 3, 4];
    this.queue       = [1, 2, 3, 4];
    this.current     = this.queue[0];
    this.placedMap   = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.placedCount = 0;
    this.MAX_MONSTERS = 10;
  }

  exportState() {
    return {
      board: this.board.map(row => row.map(cell =>
        cell ? { ...cell, emoji: this.getEmoji(cell.type) } : null
      )),
      removed:     this.removed,
      players:     this.players,
      queue:       this.queue,
      current:     this.current,
      placedCount: this.placedCount
    };
  }

  apply(action, data) {
    if (action === 'place') this._place(data);
  }

  _place({ x, y, type }) {
    if (this.placedMap[this.current] >= this.MAX_MONSTERS)
      throw 'You placed all monsters.';
    if (this.board[y][x])
      throw 'Cell already taken.';
    if (!this._isEdge(x, y, this.current))
      throw 'Must place on your edge.';

    this.board[y][x] = { player: this.current, type };
    this.placedMap[this.current]++;
    this.placedCount++;

    this._endTurn();
  }

  _endTurn() {
    this.queue.push(this.queue.shift());
    this.current = this.queue[0];
    this.placedCount = 0;
  }

  _isEdge(x, y, p) {
    if (p === 1) return y === 0;
    if (p === 2) return x === this.SIZE - 1;
    if (p === 3) return y === this.SIZE - 1;
    if (p === 4) return x === 0;
    return false;
  }

  getEmoji(type) {
    return { vampire: '🦇', werewolf: '🐺', ghost: '👻' }[type] || '';
  }
}

io.on('connection', socket => {
  let gameId = null;

  socket.on('joinGame', id => {
    gameId = id;
    if (!games[id]) {
      games[id]     = new Game(id);
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
  console.log(`Listening on http://localhost:${PORT}`);
});
