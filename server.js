const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const database = require('./database');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Real-time multiplayer storage (keep in memory for performance)
const onlinePlayers = new Map(); // socketId -> playerData
const activeMatches = new Map(); // matchId -> matchData

// Test database connection on startup
database.testConnection().then(result => {
  if (result.success) {
    console.log('✅ Database connected successfully');
  } else {
    console.error('❌ Database connection failed:', result.error);
  }
});

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

// JWT middleware
const JWT_SECRET = process.env.JWT_SECRET || 'bobbys-coin-flip-jwt-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // Check if session exists (backwards compatibility)
    if (req.session && req.session.userId) {
      req.user = { username: req.session.userId };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://bobbys.no-illusion.com', 'https://bobbys-coin-flip.vercel.app'],
  credentials: true
}));
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

// API Routes (database-backed)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password required' });
  }
  
  // Check if user already exists
  const existingUser = await database.getUserByUsername(username);
  if (existingUser.success) {
    return res.json({ success: false, message: 'Username already exists' });
  }
  
  // Create new user
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await database.createUser(username, hashedPassword);
  
  if (!result.success) {
    return res.json({ success: false, message: 'Failed to create account: ' + result.error });
  }
  
  // Create JWT token for new user
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  
  req.session.userId = username;
  res.json({ 
    success: true, 
    message: 'Account created successfully',
    token,
    user: {
      username,
      totalCoins: 100,
      totalXP: 0
    }
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  const result = await database.getUserByUsername(username);
  if (!result.success || !await bcrypt.compare(password, result.user.password_hash)) {
    return res.json({ success: false, message: 'Invalid username or password' });
  }
  
  // Create JWT token
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  
  // Keep session for backwards compatibility
  req.session.userId = username;
  
  res.json({ 
    success: true, 
    message: 'Login successful',
    token,
    user: {
      username: result.user.username,
      totalCoins: result.user.total_coins,
      totalXP: result.user.total_xp
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/user', authenticateToken, async (req, res) => {
  const result = await database.getUserByUsername(req.user.username);
  if (!result.success) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const user = result.user;
  
  // Check for daily login bonus
  const now = new Date();
  const lastLogin = new Date(user.last_login || user.created_at);
  const daysSinceLogin = Math.floor((now - lastLogin) / (24 * 60 * 60 * 1000));
  
  let dailyBonus = null;
  if (daysSinceLogin >= 1) {
    // Update last login and give XP bonus
    const newXP = user.total_xp + 20;
    await database.updateUser(req.user.username, {
      last_login: now.toISOString(),
      total_xp: newXP
    });
    
    const oldLevel = calculateLevel(user.total_xp);
    const newLevel = calculateLevel(newXP);
    dailyBonus = {
      xpGained: 20,
      totalXP: newXP,
      oldLevel,
      newLevel,
      levelUp: newLevel > oldLevel,
      reason: 'Daily Login Bonus'
    };
    user.total_xp = newXP;
  }
  
  // Calculate level info
  const levelInfo = calculateXPToNext(user.total_xp || 0);
  const rankInfo = getRankInfo(levelInfo.currentLevel);
  
  res.json({ 
    success: true, 
    user: {
      username: user.username || 'Unknown',
      stats: {
        gamesPlayed: user.games_played || 0,
        gamesWon: user.games_won || 0,
        gamesLost: user.games_lost || 0,
        winStreak: user.win_streak || 0,
        bestWinStreak: user.best_win_streak || 0,
        totalCoins: user.total_coins || 0,
        totalXP: user.total_xp || 0,
        lastLogin: user.last_login,
        multiplayerStats: {
          matchesPlayed: user.multiplayer_matches_played || 0,
          matchesWon: user.multiplayer_matches_won || 0,
          matchesLost: user.multiplayer_matches_lost || 0,
          roundsWon: user.multiplayer_rounds_won || 0,
          roundsLost: user.multiplayer_rounds_lost || 0
        }
      },
      levelInfo: levelInfo,
      rankInfo: rankInfo
    },
    dailyBonus
  });
});

// Single-player coin flip (database-backed)
app.post('/api/flip', authenticateToken, async (req, res) => {
  const { bet, prediction } = req.body;
  
  // Get user from database
  const userResult = await database.getUserByUsername(req.user.username);
  if (!userResult.success) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const user = userResult.user;
  
  if (bet <= 0 || bet > user.total_coins) {
    return res.json({ success: false, message: 'Invalid bet amount' });
  }
  
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === prediction;
  const winAmount = won ? bet : -bet;
  
  // Calculate new stats
  const newStats = {
    gamesPlayed: user.games_played + 1,
    gamesWon: user.games_won + (won ? 1 : 0),
    gamesLost: user.games_lost + (won ? 0 : 1),
    totalCoins: user.total_coins + winAmount,
    winStreak: won ? user.win_streak + 1 : 0,
    bestWinStreak: user.best_win_streak,
    totalXP: user.total_xp
  };
  
  // Update best win streak if needed
  if (newStats.winStreak > newStats.bestWinStreak) {
    newStats.bestWinStreak = newStats.winStreak;
  }
  
  // Calculate XP reward
  let xpAmount = won ? 10 : 2;
  if (won) {
    if (newStats.winStreak >= 5) xpAmount += 5;
    if (newStats.winStreak >= 10) xpAmount += 10;
    if (newStats.winStreak >= 20) xpAmount += 15;
  }
  
  const oldLevel = calculateLevel(user.total_xp);
  newStats.totalXP = user.total_xp + xpAmount;
  const newLevel = calculateLevel(newStats.totalXP);
  
  const xpReward = {
    xpGained: xpAmount,
    totalXP: newStats.totalXP,
    oldLevel,
    newLevel,
    levelUp: newLevel > oldLevel,
    reason: won ? `Win (${newStats.winStreak} streak)` : 'Participation'
  };
  
  // Update user stats in database
  await database.updateUserStats(req.user.username, {
    gamesPlayed: newStats.gamesPlayed,
    gamesWon: newStats.gamesWon,
    gamesLost: newStats.gamesLost,
    winStreak: newStats.winStreak,
    bestWinStreak: newStats.bestWinStreak,
    totalCoins: newStats.totalCoins,
    totalXP: newStats.totalXP,
    lastLogin: user.last_login
  });
  
  // Add to game history
  await database.addGameHistory(req.user.username, {
    bet,
    prediction,
    result,
    won,
    winAmount,
    balanceAfter: newStats.totalCoins,
    xpGained: xpAmount,
    levelAtTime: newLevel
  });
  
  // Calculate level info
  const levelInfo = calculateXPToNext(newStats.totalXP);
  const rankInfo = getRankInfo(levelInfo.currentLevel);
  
  res.json({
    success: true,
    result,
    won,
    winAmount,
    newBalance: newStats.totalCoins,
    stats: {
      gamesPlayed: newStats.gamesPlayed,
      gamesWon: newStats.gamesWon,
      gamesLost: newStats.gamesLost,
      winStreak: newStats.winStreak,
      bestWinStreak: newStats.bestWinStreak,
      totalCoins: newStats.totalCoins,
      totalXP: newStats.totalXP,
      lastLogin: user.last_login,
      multiplayerStats: {
        matchesPlayed: user.multiplayer_matches_played,
        matchesWon: user.multiplayer_matches_won,
        matchesLost: user.multiplayer_matches_lost,
        roundsWon: user.multiplayer_rounds_won,
        roundsLost: user.multiplayer_rounds_lost
      }
    },
    xpReward,
    levelInfo,
    rankInfo
  });
});

// Admin helper function
async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token && (!req.session || !req.session.userId)) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let username;
  if (token) {
    try {
      const user = jwt.verify(token, JWT_SECRET);
      username = user.username;
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
  } else {
    username = req.session.userId;
  }

  try {
    const adminCheck = await database.isUserAdmin(username);
    if (!adminCheck.success) {
      return res.status(500).json({ success: false, message: 'Database error checking admin status' });
    }

    if (!adminCheck.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    req.user = { username };
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Admin endpoint to clean up database
app.post('/api/admin/cleanup', requireAdmin, async (req, res) => {
  
  try {
    // Get all users except admin users
    const usersResult = await database.getAllUsers();
    if (!usersResult.success) {
      return res.json({ success: false, message: 'Failed to get users' });
    }
    
    // Filter out admin users from deletion list
    const toDelete = usersResult.users.filter(user => !user.is_admin);
    
    for (const user of toDelete) {
      await database.deleteUser(user.username);
    }
    
    res.json({ success: true, message: `Deleted ${toDelete.length} users`, deletedUsers: toDelete.map(u => u.username) });
  } catch (error) {
    res.json({ success: false, message: 'Cleanup failed', error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  const result = await database.getLeaderboard(10);
  
  if (!result.success) {
    return res.json({ success: false, message: 'Failed to fetch leaderboard' });
  }
  
  res.json({ success: true, leaderboard: result.leaderboard });
});

app.get('/api/history', authenticateToken, async (req, res) => {
  const result = await database.getGameHistory(req.user.username, 50);
  
  if (!result.success) {
    return res.json({ success: false, message: 'Failed to fetch history' });
  }
  
  // Convert database format to match frontend expectations
  const history = result.history.map(game => ({
    timestamp: game.timestamp,
    bet: game.bet_amount,
    prediction: game.prediction,
    result: game.coin_result,
    won: game.won,
    winAmount: game.win_amount,
    balanceAfter: game.balance_after
  }));
  
  res.json({ success: true, history });
});

// Socket.IO multiplayer functionality
io.on('connection', async (socket) => {
  try {
    const session = socket.request.session;
    
    if (!session || !session.userId) {
      console.error(`[${socket.id}] Connection failed: No session or userId`);
      socket.emit('error', 'Not authenticated');
      return;
    }

    const username = session.userId;
    const userResult = await database.getUserByUsername(username);
    
    if (!userResult.success) {
      console.error(`[${socket.id}] Connection failed: User ${username} not found`);
      socket.emit('error', 'User not found');
      return;
    }
    
    const user = userResult.user;
    
    // Debug: Log the actual user object to see what fields we have
    console.log(`[MP-DEBUG] User object for ${username}:`, JSON.stringify(user, null, 2));
    
    // Format user stats from database fields
    const userStats = {
      totalCoins: user.total_coins || 0,
      gamesPlayed: user.games_played || 0,
      gamesWon: user.games_won || 0,
      totalXP: user.total_xp || 0
    };
    
    console.log(`[MP-DEBUG] Formatted userStats:`, userStats);

    // Add player to online players
    const playerData = {
      socketId: socket.id,
      username: username,
      status: 'online', // online, in_lobby, in_match
      matchId: null,
      roomCode: null,
      stats: userStats // Include formatted user stats for coin validation
    };
    
    onlinePlayers.set(socket.id, playerData);

    console.log(`[MP-CONNECT] ${username} connected (${socket.id}), total online: ${onlinePlayers.size}`);
    console.log(`[MP-STATE] Player data:`, playerData);
    
    socket.emit('connected', { username, stats: userStats });
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
    if (betAmount > player.stats.totalCoins) {
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
    
    // Validate bet amount
    if (betAmount > player.stats.totalCoins) {
      socket.emit('error', 'Insufficient coins to create room');
      return;
    }
    
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
    
    if (room.betAmount > player.stats.totalCoins) {
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

  socket.on('make_prediction', async (data) => {
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
      
      await executeRound(match);
      
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

async function executeRound(match) {
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
    await endMatch(match);
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

async function endMatch(match) {
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
  const user1Result = await database.getUserByUsername(match.player1.username);
  const user2Result = await database.getUserByUsername(match.player2.username);
  const user1 = user1Result.success ? user1Result.user : null;
  const user2 = user2Result.success ? user2Result.user : null;
  
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