const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage (replace with database in production)
const users = new Map();
const gameHistory = new Map();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'bobbys-coin-flip-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(express.static('public'));

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

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// API Routes
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
      totalCoins: 100, // Starting coins
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
  res.json({ 
    success: true, 
    user: {
      username: user.username,
      stats: user.stats
    }
  });
});

app.post('/api/flip', (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  const { bet, prediction } = req.body; // bet amount, prediction: 'heads' or 'tails'
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
  
  if (won) {
    user.stats.gamesWon++;
    user.stats.winStreak++;
    if (user.stats.winStreak > user.stats.bestWinStreak) {
      user.stats.bestWinStreak = user.stats.winStreak;
    }
  } else {
    user.stats.gamesLost++;
    user.stats.winStreak = 0;
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
  
  // Keep only last 50 games
  if (history.length > 50) {
    history.splice(50);
  }
  
  res.json({
    success: true,
    result,
    won,
    winAmount,
    newBalance: user.stats.totalCoins,
    stats: user.stats
  });
});

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Array.from(users.values())
    .map(user => ({
      username: user.username,
      totalCoins: user.stats.totalCoins,
      gamesPlayed: user.stats.gamesPlayed,
      winRate: user.stats.gamesPlayed > 0 ? (user.stats.gamesWon / user.stats.gamesPlayed * 100).toFixed(1) : 0,
      bestWinStreak: user.stats.bestWinStreak
    }))
    .sort((a, b) => b.totalCoins - a.totalCoins)
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

app.listen(PORT, () => {
  console.log(`Bobby's Coin Flip server running on port ${PORT}`);
});