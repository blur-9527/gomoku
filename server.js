const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.post('/create-room', (req, res) => {
  const roomId = createRoom();
  res.json({ success: true, roomId });
});

app.post('/join-room', express.json(), (req, res) => {
  const { roomId } = req.body;
  
  if (!rooms[roomId]) {
    return res.json({ success: false, message: '房间不存在' });
  }
  
  if (rooms[roomId].players.length >= 2) {
    return res.json({ success: false, message: '房间已满' });
  }
  
  res.json({ success: true });
});

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom() {
  const roomId = generateRoomId();
  rooms[roomId] = {
    players: [],
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    currentPlayer: 'black',
    gameStarted: false,
    gameEnded: false,
    history: [],
    lastMove: null,
    pendingUndo: null,
    surrendered: null,
    rematch: [],
    opponentExited: false
  };
  return roomId;
}

io.on('connection', (socket) => {
  socket.on('createRoom', () => {
    const roomId = createRoom();
    socket.emit('roomCreated', { roomId, playerColor: 'black' });
  });

  socket.on('joinRoom', (roomId) => {
    console.log('收到加入房间请求:', { roomId, socketId: socket.id });
    
    if (!rooms[roomId]) {
      console.log('房间不存在:', roomId);
      socket.emit('error', '房间不存在');
      return;
    }
    if (rooms[roomId].players.length >= 2) {
      console.log('房间已满:', roomId);
      socket.emit('error', '房间已满');
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    
    const isBlack = rooms[roomId].players.length === 0;
    socket.playerColor = isBlack ? 'black' : 'white';
    
    rooms[roomId].players.push({ id: socket.id, color: socket.playerColor, ready: false });
    
    console.log(`玩家加入房间: ${socket.playerColor} (${socket.id})`);
    
    socket.emit('roomJoined', { roomId, playerColor: socket.playerColor });
    
    if (!isBlack) {
      io.to(roomId).emit('opponentJoined');
    }
  });

  socket.on('ready', () => {
    console.log('收到准备请求:', { roomId: socket.roomId, playerColor: socket.playerColor });
    
    const room = rooms[socket.roomId];
    if (!room) {
      console.log('房间不存在');
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.ready = true;
      console.log(`玩家准备: ${player.color}`);
      
      if (room.players.length === 2 && room.players.every(p => p.ready)) {
        room.gameStarted = true;
        console.log(`游戏开始: ${socket.roomId}`);
        io.to(socket.roomId).emit('gameStart');
      }
      
      io.to(socket.roomId).emit('playerReady', { color: player.color });
    }
  });

  socket.on('move', ({ row, col }) => {
    console.log('收到落子请求:', { roomId: socket.roomId, row, col, playerColor: socket.playerColor });
    
    const room = rooms[socket.roomId];
    if (!room) {
      console.log('房间不存在');
      return;
    }
    if (!room.gameStarted) {
      console.log('游戏未开始');
      return;
    }
    if (room.gameEnded) {
      console.log('游戏已结束');
      return;
    }
    if (room.currentPlayer !== socket.playerColor) {
      console.log(`不是你的回合: 当前=${room.currentPlayer}, 玩家=${socket.playerColor}`);
      return;
    }
    if (room.board[row][col]) {
      console.log('该位置已有棋子');
      return;
    }

    room.board[row][col] = socket.playerColor;
    room.history.push({ row, col, player: socket.playerColor });
    room.lastMove = { row, col };

    console.log(`落子成功: ${socket.playerColor} 在 (${row}, ${col})`);

    if (checkWin(room.board, row, col, socket.playerColor)) {
      room.gameEnded = true;
      room.winner = socket.playerColor;
      console.log(`游戏结束，胜者: ${socket.playerColor}`);
      io.to(socket.roomId).emit('gameEnd', { winner: socket.playerColor });
    } else {
      room.currentPlayer = room.currentPlayer === 'black' ? 'white' : 'black';
      console.log(`切换回合到: ${room.currentPlayer}`);
      io.to(socket.roomId).emit('move', { row, col, player: socket.playerColor, currentPlayer: room.currentPlayer });
    }
  });

  socket.on('undoRequest', () => {
    const room = rooms[socket.roomId];
    if (!room) return;
    room.pendingUndo = socket.playerColor;
    socket.broadcast.to(socket.roomId).emit('undoRequest', { from: socket.playerColor });
  });

  socket.on('undoResponse', ({ accept }) => {
    const room = rooms[socket.roomId];
    if (!room || !room.pendingUndo) return;

    if (accept && room.history.length >= 2) {
      const lastMove1 = room.history.pop();
      const lastMove2 = room.history.pop();
      
      room.board[lastMove1.row][lastMove1.col] = null;
      if (lastMove2) {
        room.board[lastMove2.row][lastMove2.col] = null;
      }
      
      room.lastMove = room.history.length > 0 ? room.history[room.history.length - 1] : null;
      room.currentPlayer = 'black';
      
      io.to(socket.roomId).emit('undoAccepted', { board: room.board, lastMove: room.lastMove, currentPlayer: 'black' });
    } else {
      socket.broadcast.to(socket.roomId).emit('undoRejected');
    }
    
    room.pendingUndo = null;
  });

  socket.on('surrender', () => {
    const room = rooms[socket.roomId];
    if (!room) return;
    
    room.gameEnded = true;
    room.winner = socket.playerColor === 'black' ? 'white' : 'black';
    io.to(socket.roomId).emit('gameEnd', { winner: room.winner, surrendered: socket.playerColor });
  });

  socket.on('rematch', () => {
    const room = rooms[socket.roomId];
    if (!room) return;

    if (!room.rematch.includes(socket.playerColor)) {
      room.rematch.push(socket.playerColor);
    }

    if (room.rematch.length === 2) {
      room.board = Array(15).fill(null).map(() => Array(15).fill(null));
      room.currentPlayer = 'black';
      room.gameStarted = false;
      room.gameEnded = false;
      room.history = [];
      room.lastMove = null;
      room.pendingUndo = null;
      room.surrendered = null;
      room.rematch = [];
      room.opponentExited = false;
      room.players.forEach(p => p.ready = false);
      
      io.to(socket.roomId).emit('rematchAccepted');
    } else {
      socket.broadcast.to(socket.roomId).emit('rematchRequested');
    }
  });

  socket.on('exit', () => {
    const room = rooms[socket.roomId];
    if (room) {
      room.opponentExited = true;
      socket.broadcast.to(socket.roomId).emit('opponentExited');
    }
    socket.leave(socket.roomId);
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (room) {
      room.opponentExited = true;
      socket.broadcast.to(socket.roomId).emit('opponentExited');
    }
  });
});

function checkWin(board, row, col, player) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dx, dy] of directions) {
    let count = 1;
    
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] === player) {
        count++;
      } else break;
    }
    
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] === player) {
        count++;
      } else break;
    }
    
    if (count >= 5) return true;
  }
  return false;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
