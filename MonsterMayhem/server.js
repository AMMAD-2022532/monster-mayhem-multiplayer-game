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
    this.queue       = [];
    this.current     = null;
    this.placedCount = 0;
  }

  exportState() {
    return {
      board:       this.board,
      removed:     this.removed,
      players:     this.players,
      queue:       this.queue,
      current:     this.current,
      placedCount: this.placedCount
    };
  }

  apply(action, data) {
    // Placeholder for future place/move logic
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
    await gameLocks[gameId].runExclusive(() => {
      games[gameId].apply(action, data);
      io.in(gameId).emit('stateUpdate', games[gameId].exportState());
    });
  });
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
