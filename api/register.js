const bcrypt = require('bcryptjs');
const database = require('./_lib/database');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await database.getUserByUsername(username);
    if (existingUser.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with a simple email (since original didn't require it)
    const email = `${username}@local.game`;
    const createResult = await database.createUser(username, email, hashedPassword);
    
    if (!createResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create account' 
      });
    }

    const user = createResult.user;

    // Return user data for immediate login
    const userData = {
      id: user.id,
      username: user.username,
      stats: {
        totalCoins: user.coins || 100,
        gamesPlayed: user.games_played || 0,
        gamesWon: user.wins || 0,
        winStreak: user.win_streak || 0,
        bestWinStreak: user.best_streak || 0
      },
      isAdmin: user.role === 'admin'
    };

    res.status(200).json({ 
      success: true, 
      message: 'Account created successfully',
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};