const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// In-memory storage (replace with database in production)
const users = new Map();
const gameHistory = new Map();

// Multiplayer game storage
const onlinePlayers = new Map(); // socketId -> playerData
const gameLobbies = new Map();   // lobbyId -> lobbyData
const activeMatches = new Map(); // matchId -> matchData
const privateRooms = new Map();  // roomCode -> roomData

// Helper functions for game logic
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateMatchId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Leveling system functions
function calculateLevel(totalXP) {
    let level = 1;
    let xpRequired = 0;
    
    while (totalXP >= xpRequired) {
        if (level <= 10) {
            xpRequired += 100;
        } else if (level <= 25) {
            xpRequired += 200;
        } else if (level <= 50) {
            xpRequired += 400;
        } else {
            xpRequired += 800;
        }
        
        if (totalXP >= xpRequired) {
            level++;
        }
    }
    
    return level;
}

function calculateXPToNext(currentXP) {
    const currentLevel = calculateLevel(currentXP);
    let xpForThisLevel = 0;
    
    // Calculate XP needed to reach current level
    for (let i = 1; i < currentLevel; i++) {
        if (i <= 10) {
            xpForThisLevel += 100;
        } else if (i <= 25) {
            xpForThisLevel += 200;
        } else if (i <= 50) {
            xpForThisLevel += 400;
        } else {
            xpForThisLevel += 800;
        }
    }
    
    // Calculate XP needed for next level
    let xpForNextLevel;
    if (currentLevel <= 10) {
        xpForNextLevel = 100;
    } else if (currentLevel <= 25) {
        xpForNextLevel = 200;
    } else if (currentLevel <= 50) {
        xpForNextLevel = 400;
    } else {
        xpForNextLevel = 800;
    }
    
    const xpIntoCurrentLevel = currentXP - xpForThisLevel;
    const xpNeeded = xpForNextLevel - xpIntoCurrentLevel;
    
    return {
        currentLevel,
        xpIntoLevel: xpIntoCurrentLevel,
        xpNeeded,
        xpForLevel: xpForNextLevel
    };
}

function getRankInfo(level) {
    if (level >= 51) return { rank: 'Legend', color: '#FFD700', emoji: '👑' };
    if (level >= 36) return { rank: 'Master', color: '#9333EA', emoji: '🏆' };
    if (level >= 21) return { rank: 'Expert', color: '#DC2626', emoji: '⭐' };
    if (level >= 11) return { rank: 'Apprentice', color: '#2563EB', emoji: '🎯' };
    return { rank: 'Novice', color: '#059669', emoji: '🌱' };
}

function awardXP(user, xpAmount, reason = '') {
    const oldLevel = calculateLevel(user.stats.totalXP || 0);
    user.stats.totalXP = (user.stats.totalXP || 0) + xpAmount;
    const newLevel = calculateLevel(user.stats.totalXP);
    
    const levelUp = newLevel > oldLevel;
    
    return {
        xpGained: xpAmount,
        totalXP: user.stats.totalXP,
        oldLevel,
        newLevel,
        levelUp,
        reason
    };
}

// Session middleware for Socket.IO
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'bobbys-coin-flip-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static('public'));

// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/multiplayer', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'multiplayer.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// API Routes (existing single-player routes)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password required' });
  }
  
  if (users.has(username)) {
    return res.json({ success: false, message: 'Username already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  users.set(username, {
    username,
    password: hashedPassword,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      winStreak: 0,
      bestWinStreak: 0,
      totalCoins: 100,
      totalXP: 0,
      lastLogin: new Date().toISOString(),
      multiplayerStats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        roundsWon: 0,
        roundsLost: 0
      },
      created: new Date().toISOString()
    }
  });
  
  gameHistory.set(username, []);
  
  req.session.userId = username;
  res.json({ success: true, message: 'Account created successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = users.get(username);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.json({ success: false, message: 'Invalid username or password' });
  }
  
  req.session.userId = username;
  res.json({ success: true, message: 'Login successful' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  const user = users.get(req.session.userId);
  
  // Check for daily login bonus
  const now = new Date();
  const lastLogin = new Date(user.stats.lastLogin || user.stats.created);
  const daysSinceLogin = Math.floor((now - lastLogin) / (24 * 60 * 60 * 1000));
  
  let dailyBonus = null;
  if (daysSinceLogin >= 1) {
    const xpReward = awardXP(user, 20, 'Daily Login Bonus');
    user.stats.lastLogin = now.toISOString();
    dailyBonus = xpReward;
  }
  
  // Calculate level info
  const levelInfo = calculateXPToNext(user.stats.totalXP || 0);
  const rankInfo = getRankInfo(levelInfo.currentLevel);
  
  res.json({ 
    success: true, 
    user: {
      username: user.username,
      stats: user.stats,
      levelInfo: levelInfo,
      rankInfo: rankInfo
    },
    dailyBonus
  });
});

// Single-player coin flip (existing)
app.post('/api/flip', (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  const { bet, prediction } = req.body;
  const user = users.get(req.session.userId);
  
  if (bet <= 0 || bet > user.stats.totalCoins) {
    return res.json({ success: false, message: 'Invalid bet amount' });
  }
  
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === prediction;
  const winAmount = won ? bet : -bet;
  
  // Update user stats
  user.stats.gamesPlayed++;
  user.stats.totalCoins += winAmount;
  
  // Award XP
  let xpReward;
  if (won) {
    user.stats.gamesWon++;
    user.stats.winStreak++;
    if (user.stats.winStreak > user.stats.bestWinStreak) {
      user.stats.bestWinStreak = user.stats.winStreak;
    }
    
    // Base win XP + streak bonus
    let xpAmount = 10;
    if (user.stats.winStreak >= 5) xpAmount += 5;
    if (user.stats.winStreak >= 10) xpAmount += 10;
    if (user.stats.winStreak >= 20) xpAmount += 15;
    
    xpReward = awardXP(user, xpAmount, `Win (${user.stats.winStreak} streak)`);
  } else {
    user.stats.gamesLost++;
    user.stats.winStreak = 0;
    xpReward = awardXP(user, 2, 'Participation');
  }
  
  // Add to game history
  const history = gameHistory.get(req.session.userId);
  history.unshift({
    timestamp: new Date().toISOString(),
    bet,
    prediction,
    result,
    won,
    winAmount,
    balanceAfter: user.stats.totalCoins
  });
  
  if (history.length > 50) {
    history.splice(50);
  }
  
  // Calculate level info
  const levelInfo = calculateXPToNext(user.stats.totalXP);
  const rankInfo = getRankInfo(levelInfo.currentLevel);
  
  res.json({
    success: true,
    result,
    won,
    winAmount,
    newBalance: user.stats.totalCoins,
    stats: user.stats,
    xpReward,
    levelInfo,
    rankInfo
  });
});

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(users.values())
    .map(user => {
      const levelInfo = calculateXPToNext(user.stats.totalXP || 0);
      const rankInfo = getRankInfo(levelInfo.currentLevel);
      
      return {
        username: user.username,
        totalCoins: user.stats.totalCoins,
        gamesPlayed: user.stats.gamesPlayed,
        winRate: user.stats.gamesPlayed > 0 ? (user.stats.gamesWon / user.stats.gamesPlayed * 100).toFixed(1) : 0,
        bestWinStreak: user.stats.bestWinStreak,
        level: levelInfo.currentLevel,
        totalXP: user.stats.totalXP || 0,
        rank: rankInfo.rank,
        rankColor: rankInfo.color,
        rankEmoji: rankInfo.emoji
      };
    })
    .sort((a, b) => {
      // Sort by level first, then by coins
      if (a.level !== b.level) return b.level - a.level;
      return b.totalCoins - a.totalCoins;
    })
    .slice(0, 10);
  
  res.json({ success: true, leaderboard });
});

app.get('/api/history', (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  const history = gameHistory.get(req.session.userId) || [];
  res.json({ success: true, history });
});

// Socket.IO multiplayer functionality
io.on('connection', (socket) => {
  try {
    const session = socket.request.session;
    
    if (!session || !session.userId) {
      console.error(`[${socket.id}] Connection failed: No session or userId`);
      socket.emit('error', 'Not authenticated');
      return;
    }

    const username = session.userId;
    const user = users.get(username);
    
    if (!user) {
      console.error(`[${socket.id}] Connection failed: User ${username} not found`);
      socket.emit('error', 'User not found');
      return;
    }

    // Add player to online players
    const playerData = {
      socketId: socket.id,
      username: username,
      status: 'online', // online, in_lobby, in_match
      matchId: null,
      roomCode: null
    };
    
    onlinePlayers.set(socket.id, playerData);

    console.log(`[MP-CONNECT] ${username} connected (${socket.id}), total online: ${onlinePlayers.size}`);
    console.log(`[MP-STATE] Player data:`, playerData);
    
    socket.emit('connected', { username, stats: user.stats });
  } catch (error) {
    console.error(`[MP-CONNECTION] Error in connection handler:`, error);
    socket.emit('error', 'Connection initialization failed');
    return;
  }

  // Join multiplayer lobby
  socket.on('join_lobby', () => {
    try {
      console.log(`[MP-LOBBY] ${socket.id} attempting to join lobby`);
      
      const player = onlinePlayers.get(socket.id);
      if (!player) {
        console.error(`[MP-LOBBY] Player not found for socket ${socket.id}`);
        socket.emit('error', 'Player data not found');
        return;
      }
      
      player.status = 'in_lobby';
      socket.join('lobby');
      
      console.log(`[MP-LOBBY] ${player.username} joined lobby, status: ${player.status}`);
      
      // Send lobby info
      const lobbyPlayers = Array.from(onlinePlayers.values())
        .filter(p => p.status === 'in_lobby')
        .map(p => ({
          username: p.username,
          status: p.status
        }));
      
      console.log(`[MP-LOBBY] Current lobby players:`, lobbyPlayers.map(p => p.username));
      
      socket.emit('lobby_joined', { players: lobbyPlayers });
      socket.to('lobby').emit('player_joined_lobby', { username: player.username });
      
    } catch (error) {
      console.error(`[MP-LOBBY] Error in join_lobby:`, error);
      socket.emit('error', 'Failed to join lobby');
    }
  });

  // Quick match (random opponent)
  socket.on('quick_match', (data) => {
    const { rounds, betAmount } = data;
    const player = onlinePlayers.get(socket.id);
    
    if (!player) return;
    
    // Validate bet amount
    if (betAmount > user.stats.totalCoins) {
      socket.emit('error', 'Insufficient coins');
      return;
    }

    // Find another player looking for quick match
    const waitingPlayers = Array.from(onlinePlayers.values())
      .filter(p => p.status === 'looking_for_match' && p.socketId !== socket.id);
    
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers[0];
      startMatch(player, opponent, rounds, betAmount);
    } else {
      player.status = 'looking_for_match';
      player.matchPrefs = { rounds, betAmount };
      socket.emit('looking_for_match');
    }
  });

  // Create private room
  socket.on('create_private_room', (data) => {
    const { rounds, betAmount } = data;
    const player = onlinePlayers.get(socket.id);
    
    if (!player) return;
    
    const roomCode = generateRoomCode();
    privateRooms.set(roomCode, {
      roomCode,
      host: player.username,
      hostSocketId: socket.id,
      guest: null,
      guestSocketId: null,
      rounds,
      betAmount,
      status: 'waiting'
    });
    
    player.roomCode = roomCode;
    player.status = 'hosting_room';
    
    socket.emit('room_created', { roomCode });
  });

  // Join private room
  socket.on('join_private_room', (data) => {
    const { roomCode } = data;
    const player = onlinePlayers.get(socket.id);
    const room = privateRooms.get(roomCode);
    
    if (!player || !room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    if (room.status !== 'waiting') {
      socket.emit('error', 'Room is not available');
      return;
    }
    
    if (room.betAmount > user.stats.totalCoins) {
      socket.emit('error', 'Insufficient coins for this room');
      return;
    }
    
    // Join room
    room.guest = player.username;
    room.guestSocketId = socket.id;
    room.status = 'ready';
    
    player.roomCode = roomCode;
    player.status = 'in_room';
    
    // Notify both players
    const hostSocket = io.sockets.sockets.get(room.hostSocketId);
    if (hostSocket) {
      hostSocket.emit('player_joined_room', { 
        guest: player.username,
        ready: true 
      });
    }
    
    socket.emit('room_joined', { 
      host: room.host,
      rounds: room.rounds,
      betAmount: room.betAmount 
    });
    
    // Start match after short delay
    setTimeout(() => {
      const hostPlayer = onlinePlayers.get(room.hostSocketId);
      const guestPlayer = onlinePlayers.get(room.guestSocketId);
      if (hostPlayer && guestPlayer) {
        startMatch(hostPlayer, guestPlayer, room.rounds, room.betAmount);
      }
    }, 2000);
  });

  // Handle match actions
  socket.on('make_call', (data) => {
    try {
      console.log(`[MP-CALL] ${socket.id} making call:`, data);
      
      const { matchId, prediction } = data;
      
      if (!matchId || !prediction) {
        console.error(`[MP-CALL] Missing data - matchId: ${matchId}, prediction: ${prediction}`);
        socket.emit('error', 'Invalid call data');
        return;
      }
      
      const match = activeMatches.get(matchId);
      const player = onlinePlayers.get(socket.id);
      
      if (!match) {
        console.error(`[MP-CALL] Match ${matchId} not found in activeMatches`);
        console.log(`[MP-DEBUG] Active matches:`, Array.from(activeMatches.keys()));
        socket.emit('error', 'Match not found');
        return;
      }
      
      if (!player) {
        console.error(`[MP-CALL] Player not found for socket ${socket.id}`);
        socket.emit('error', 'Player not found');
        return;
      }
      
      console.log(`[MP-CALL] Match state - Round ${match.currentRound}/${match.totalRounds}`);
      console.log(`[MP-CALL] Player ${player.username} attempting call in match ${matchId}`);
      
      const isPlayer1 = match.player1.username === player.username;
      const currentRound = match.rounds[match.currentRound - 1];
      
      if (!currentRound) {
        console.error(`[MP-CALL] Current round not found - Round ${match.currentRound}, Rounds length: ${match.rounds.length}`);
        socket.emit('error', 'Round data error');
        return;
      }
      
      console.log(`[MP-CALL] Round state:`, {
        caller: currentRound.caller,
        callerPrediction: currentRound.callerPrediction,
        opponentPrediction: currentRound.opponentPrediction,
        status: currentRound.status
      });
      
      // Validate: Must be the caller and haven't called yet
      if (currentRound.caller !== player.username) {
        console.error(`[MP-CALL] ${player.username} is not the caller (caller is ${currentRound.caller})`);
        socket.emit('error', 'Not your turn to call');
        return;
      }
      
      if (currentRound.callerPrediction) {
        console.error(`[MP-CALL] ${player.username} already made a call: ${currentRound.callerPrediction}`);
        socket.emit('error', 'You already made your call');
        return;
      }
      
      // Make the call
      currentRound.callerPrediction = prediction;
      currentRound.status = 'waiting_opponent';
      
      console.log(`[MP-CALL] ✅ ${player.username} successfully called ${prediction} in round ${match.currentRound}`);
      
      // Notify opponent to make their prediction
      const opponentSocket = isPlayer1 ? 
        io.sockets.sockets.get(match.player2.socketId) :
        io.sockets.sockets.get(match.player1.socketId);
      
      const opponentName = isPlayer1 ? match.player2.username : match.player1.username;
      
      if (opponentSocket) {
        console.log(`[MP-CALL] Notifying opponent ${opponentName}`);
        opponentSocket.emit('opponent_called', { prediction });
      } else {
        console.error(`[MP-CALL] Opponent socket not found for ${opponentName}`);
      }
      
    } catch (error) {
      console.error(`[MP-CALL] Error in make_call:`, error);
      socket.emit('error', 'Failed to make call');
    }
  });

  socket.on('make_prediction', (data) => {
    try {
      console.log(`[MP-PREDICT] ${socket.id} making prediction:`, data);
      
      const { matchId, prediction } = data;
      
      if (!matchId || !prediction) {
        console.error(`[MP-PREDICT] Missing data - matchId: ${matchId}, prediction: ${prediction}`);
        socket.emit('error', 'Invalid prediction data');
        return;
      }
      
      const match = activeMatches.get(matchId);
      const player = onlinePlayers.get(socket.id);
      
      if (!match) {
        console.error(`[MP-PREDICT] Match ${matchId} not found`);
        socket.emit('error', 'Match not found');
        return;
      }
      
      if (!player) {
        console.error(`[MP-PREDICT] Player not found for socket ${socket.id}`);
        socket.emit('error', 'Player not found');
        return;
      }
      
      console.log(`[MP-PREDICT] Player ${player.username} attempting prediction in match ${matchId}, round ${match.currentRound}`);
      
      const currentRound = match.rounds[match.currentRound - 1];
      
      if (!currentRound) {
        console.error(`[MP-PREDICT] Current round not found - Round ${match.currentRound}`);
        socket.emit('error', 'Round data error');
        return;
      }
      
      console.log(`[MP-PREDICT] Round validation:`, {
        caller: currentRound.caller,
        playerName: player.username,
        isPlayerCaller: currentRound.caller === player.username,
        callerPrediction: currentRound.callerPrediction,
        opponentPrediction: currentRound.opponentPrediction
      });
      
      // Validate: Must NOT be the caller, caller must have called, and opponent hasn't predicted yet
      if (currentRound.caller === player.username) {
        console.error(`[MP-PREDICT] ${player.username} is the caller, cannot make prediction`);
        socket.emit('error', 'Callers cannot make predictions');
        return;
      }
      
      if (!currentRound.callerPrediction) {
        console.error(`[MP-PREDICT] Caller hasn't made their call yet`);
        socket.emit('error', 'Waiting for caller to make their call');
        return;
      }
      
      if (currentRound.opponentPrediction) {
        console.error(`[MP-PREDICT] ${player.username} already made prediction: ${currentRound.opponentPrediction}`);
        socket.emit('error', 'You already made your prediction');
        return;
      }
      
      // Make the prediction
      currentRound.opponentPrediction = prediction;
      console.log(`[MP-PREDICT] ✅ ${player.username} successfully predicted ${prediction} in round ${match.currentRound}`);
      console.log(`[MP-PREDICT] Executing round - Caller: ${currentRound.caller} called ${currentRound.callerPrediction}, Opponent: ${player.username} predicted ${prediction}`);
      
      executeRound(match);
      
    } catch (error) {
      console.error(`[MP-PREDICT] Error in make_prediction:`, error);
      socket.emit('error', 'Failed to make prediction');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const player = onlinePlayers.get(socket.id);
    if (player) {
      console.log(`${player.username} disconnected`);
      
      // Handle ongoing match
      if (player.matchId) {
        const match = activeMatches.get(player.matchId);
        if (match) {
          // Forfeit match
          const opponentSocketId = match.player1.socketId === socket.id ? 
            match.player2.socketId : match.player1.socketId;
          
          const opponentSocket = io.sockets.sockets.get(opponentSocketId);
          if (opponentSocket) {
            opponentSocket.emit('opponent_disconnected');
          }
          
          activeMatches.delete(player.matchId);
        }
      }
      
      // Handle private room
      if (player.roomCode) {
        const room = privateRooms.get(player.roomCode);
        if (room) {
          privateRooms.delete(player.roomCode);
        }
      }
      
      onlinePlayers.delete(socket.id);
      socket.to('lobby').emit('player_left_lobby', { username: player.username });
    }
  });
});

function startMatch(player1, player2, totalRounds, betAmount) {
  const matchId = generateMatchId();
  
  // Ensure player objects have usernames
  if (!player1 || !player1.username) {
    console.error('startMatch: player1 is missing username', player1);
    return;
  }
  if (!player2 || !player2.username) {
    console.error('startMatch: player2 is missing username', player2);
    return;
  }
  
  const match = {
    matchId,
    player1,
    player2,
    totalRounds,
    betAmount,
    currentRound: 1,
    player1Score: 0,
    player2Score: 0,
    status: 'active',
    rounds: [],
    startTime: new Date().toISOString()
  };
  
  // Initialize rounds
  for (let i = 1; i <= totalRounds; i++) {
    const caller = i % 2 === 1 ? player1.username : player2.username;
    console.log(`Round ${i} caller: ${caller}`);
    match.rounds.push({
      round: i,
      caller: caller, // Alternate caller
      callerPrediction: null,
      opponentPrediction: null,
      result: null,
      winner: null,
      status: 'waiting_call'
    });
  }
  
  activeMatches.set(matchId, match);
  
  // Update player statuses
  player1.status = 'in_match';
  player1.matchId = matchId;
  player2.status = 'in_match';
  player2.matchId = matchId;
  
  // Notify both players
  const player1Socket = io.sockets.sockets.get(player1.socketId);
  const player2Socket = io.sockets.sockets.get(player2.socketId);
  
  if (player1Socket && player2Socket) {
    const matchData = {
      matchId,
      opponent: player2.username,
      totalRounds,
      betAmount,
      currentRound: 1,
      rounds: match.rounds,
      yourTurn: match.rounds[0].caller === player1.username
    };
    
    const matchData2 = {
      matchId,
      opponent: player1.username,
      totalRounds,
      betAmount,
      currentRound: 1,
      rounds: match.rounds,
      yourTurn: match.rounds[0].caller === player2.username
    };
    
    player1Socket.emit('match_started', matchData);
    player2Socket.emit('match_started', matchData2);
  }
}

function executeRound(match) {
  try {
    console.log(`[MP-EXECUTE] 🎯 Executing round ${match.currentRound} for match ${match.matchId}`);
    
    const currentRound = match.rounds[match.currentRound - 1];
    
    if (!currentRound) {
      console.error(`[MP-EXECUTE] No current round found for round ${match.currentRound}`);
      return;
    }
    
    console.log(`[MP-EXECUTE] Round setup:`, {
      caller: currentRound.caller,
      callerPrediction: currentRound.callerPrediction,
      opponentPrediction: currentRound.opponentPrediction,
      currentStatus: currentRound.status
    });
    
    // Flip the coin
    const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
    currentRound.result = coinResult;
    currentRound.status = 'completed';
    
    console.log(`[MP-EXECUTE] 🪙 Coin result: ${coinResult.toUpperCase()}`);
    
    // Determine winner
    let roundWinner = null;
    if (currentRound.callerPrediction === coinResult) {
      roundWinner = currentRound.caller;
      console.log(`[MP-EXECUTE] 🎉 Caller ${currentRound.caller} wins! (called ${currentRound.callerPrediction})`);
    } else if (currentRound.opponentPrediction === coinResult) {
      roundWinner = currentRound.caller === match.player1.username ? 
        match.player2.username : match.player1.username;
      console.log(`[MP-EXECUTE] 🎉 Opponent ${roundWinner} wins! (predicted ${currentRound.opponentPrediction})`);
    } else {
      console.log(`[MP-EXECUTE] 🤝 No winner this round`);
    }
    
    currentRound.winner = roundWinner;
    
    // Update scores
    const oldP1Score = match.player1Score;
    const oldP2Score = match.player2Score;
    
    if (roundWinner === match.player1.username) {
      match.player1Score++;
    } else if (roundWinner === match.player2.username) {
      match.player2Score++;
    }
    
    console.log(`[MP-EXECUTE] Score update: ${match.player1.username}: ${oldP1Score}→${match.player1Score}, ${match.player2.username}: ${oldP2Score}→${match.player2Score}`);
    
    // Notify both players of round result
    const player1Socket = io.sockets.sockets.get(match.player1.socketId);
    const player2Socket = io.sockets.sockets.get(match.player2.socketId);
    
    const roundResult = {
      round: match.currentRound,
      coinResult,
      callerPrediction: currentRound.callerPrediction,
      opponentPrediction: currentRound.opponentPrediction,
      winner: roundWinner,
      player1Score: match.player1Score,
      player2Score: match.player2Score
    };
    
    console.log(`[MP-EXECUTE] Sending round result:`, roundResult);
    
    if (player1Socket) {
      player1Socket.emit('round_result', roundResult);
      console.log(`[MP-EXECUTE] ✅ Sent result to ${match.player1.username}`);
    } else {
      console.error(`[MP-EXECUTE] ❌ Player1 socket not found for ${match.player1.username}`);
    }
    
    if (player2Socket) {
      player2Socket.emit('round_result', roundResult);
      console.log(`[MP-EXECUTE] ✅ Sent result to ${match.player2.username}`);
    } else {
      console.error(`[MP-EXECUTE] ❌ Player2 socket not found for ${match.player2.username}`);
    }
  } catch (error) {
    console.error(`[MP-EXECUTE] Error in executeRound:`, error);
    return;
  }
  
  // Check if match is over
  const majorityWins = Math.ceil(match.totalRounds / 2);
  if (match.player1Score >= majorityWins || match.player2Score >= majorityWins || 
      match.currentRound >= match.totalRounds) {
    endMatch(match);
  } else {
    // Start next round
    match.currentRound++;
    const nextRound = match.rounds[match.currentRound - 1];
    
    setTimeout(() => {
      if (player1Socket && player2Socket) {
        player1Socket.emit('next_round', {
          round: match.currentRound,
          yourTurn: nextRound.caller === match.player1.username
        });
        player2Socket.emit('next_round', {
          round: match.currentRound,
          yourTurn: nextRound.caller === match.player2.username
        });
      }
    }, 3000);
  }
}

function endMatch(match) {
  let winner = null;
  if (match.player1Score > match.player2Score) {
    winner = match.player1.username;
  } else if (match.player2Score > match.player1Score) {
    winner = match.player2.username;
  }
  
  match.status = 'completed';
  match.winner = winner;
  match.endTime = new Date().toISOString();
  
  // Update user stats and coins
  const user1 = users.get(match.player1.username);
  const user2 = users.get(match.player2.username);
  
  let player1XP = null;
  let player2XP = null;
  
  if (user1 && user2) {
    user1.stats.multiplayerStats.matchesPlayed++;
    user2.stats.multiplayerStats.matchesPlayed++;
    
    user1.stats.multiplayerStats.roundsWon += match.player1Score;
    user1.stats.multiplayerStats.roundsLost += match.player2Score;
    user2.stats.multiplayerStats.roundsWon += match.player2Score;
    user2.stats.multiplayerStats.roundsLost += match.player1Score;
    
    // Award XP for rounds won
    player1XP = awardXP(user1, match.player1Score * 15, `${match.player1Score} rounds won`);
    player2XP = awardXP(user2, match.player2Score * 15, `${match.player2Score} rounds won`);
    
    if (winner) {
      if (winner === match.player1.username) {
        user1.stats.multiplayerStats.matchesWon++;
        user2.stats.multiplayerStats.matchesLost++;
        
        // Transfer coins
        user1.stats.totalCoins += match.betAmount;
        user2.stats.totalCoins -= match.betAmount;
        
        // Winner bonus XP
        const winnerXP = awardXP(user1, 50, 'Multiplayer victory');
        player1XP.xpGained += winnerXP.xpGained;
        player1XP.totalXP = winnerXP.totalXP;
        player1XP.newLevel = winnerXP.newLevel;
        player1XP.levelUp = player1XP.levelUp || winnerXP.levelUp;
      } else {
        user2.stats.multiplayerStats.matchesWon++;
        user1.stats.multiplayerStats.matchesLost++;
        
        // Transfer coins
        user2.stats.totalCoins += match.betAmount;
        user1.stats.totalCoins -= match.betAmount;
        
        // Winner bonus XP
        const winnerXP = awardXP(user2, 50, 'Multiplayer victory');
        player2XP.xpGained += winnerXP.xpGained;
        player2XP.totalXP = winnerXP.totalXP;
        player2XP.newLevel = winnerXP.newLevel;
        player2XP.levelUp = player2XP.levelUp || winnerXP.levelUp;
      }
    }
  }
  
  // Notify players
  const player1Socket = io.sockets.sockets.get(match.player1.socketId);
  const player2Socket = io.sockets.sockets.get(match.player2.socketId);
  
  const matchResult = {
    winner,
    finalScore: {
      [match.player1.username]: match.player1Score,
      [match.player2.username]: match.player2Score
    },
    coinsWon: winner ? match.betAmount : 0,
    newBalance: winner === match.player1.username ? user1?.stats.totalCoins : 
                winner === match.player2.username ? user2?.stats.totalCoins : null
  };
  
  if (player1Socket) {
    const player1Result = {
      ...matchResult,
      newBalance: user1?.stats.totalCoins,
      xpReward: player1XP,
      levelInfo: calculateXPToNext(user1?.stats.totalXP || 0),
      rankInfo: getRankInfo(calculateLevel(user1?.stats.totalXP || 0))
    };
    player1Socket.emit('match_ended', player1Result);
  }
  if (player2Socket) {
    const player2Result = {
      ...matchResult,
      newBalance: user2?.stats.totalCoins,
      xpReward: player2XP,
      levelInfo: calculateXPToNext(user2?.stats.totalXP || 0),
      rankInfo: getRankInfo(calculateLevel(user2?.stats.totalXP || 0))
    };
    player2Socket.emit('match_ended', player2Result);
  }
  
  // Reset player statuses
  const player1Data = onlinePlayers.get(match.player1.socketId);
  const player2Data = onlinePlayers.get(match.player2.socketId);
  
  if (player1Data) {
    player1Data.status = 'online';
    player1Data.matchId = null;
  }
  if (player2Data) {
    player2Data.status = 'online';
    player2Data.matchId = null;
  }
  
  // Clean up
  activeMatches.delete(match.matchId);
}

server.listen(PORT, () => {
  console.log(`Bobby's Coin Flip server with multiplayer running on port ${PORT}`);
});