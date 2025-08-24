const database = require('./_lib/database');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;
    
    switch (action) {
      case 'flip':
        return await handleFlip(req, res);
      case 'history':
        return await handleHistory(req, res);
      case 'profile':
        return await handleProfile(req, res);
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Game API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function handleFlip(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, betAmount, prediction } = req.body;

  if (!username || !betAmount || !prediction) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters' 
    });
  }

  // Get user from database
  const userResult = await database.getUserByUsername(username);
  
  if (!userResult.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'User not found' 
    });
  }

  const user = userResult.user;

  // Validate bet
  if (betAmount > (user.total_coins || user.coins)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Insufficient coins' 
    });
  }

  // Flip the coin
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === prediction;
  const winAmount = won ? betAmount : -betAmount;
  const newBalance = (user.total_coins || user.coins) + winAmount;

  // Calculate XP and level
  const xpGained = won ? 10 : 5;
  const newXp = (user.total_xp || user.xp || 0) + xpGained;
  const newLevel = database.calculateLevel(newXp);

  // Update stats
  const newStats = {
    newCoins: newBalance,
    newXp: newXp,
    newLevel: newLevel,
    newWins: (user.games_won || user.wins || 0) + (won ? 1 : 0),
    newLosses: (user.games_lost || user.losses || 0) + (won ? 0 : 1),
    newGamesPlayed: (user.games_played || 0) + 1,
    newWinStreak: won ? (user.win_streak || 0) + 1 : 0,
    newBestStreak: won ? Math.max((user.best_win_streak || user.best_streak || 0), (user.win_streak || 0) + 1) : (user.best_win_streak || user.best_streak || 0)
  };

  // Update user in database
  const updateResult = await database.updateUserAfterFlip(username, newStats);
  
  if (!updateResult.success) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update user stats' 
    });
  }

  // Save game history
  await database.saveGameHistory(username, {
    betAmount,
    prediction,
    result,
    won,
    coinsBefore: user.total_coins || user.coins,
    coinsAfter: newBalance,
    xpGained
  });

  res.status(200).json({ 
    success: true,
    result,
    won,
    winAmount,
    newBalance,
    xpReward: xpGained,
    levelInfo: { currentLevel: newLevel },
    rankInfo: { 
      name: database.getRankName(newLevel),
      emoji: database.getRankEmoji(newLevel)
    }
  });
}

async function handleHistory(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username required' 
    });
  }

  const historyResult = await database.getGameHistory(username);
  
  if (!historyResult.success) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch game history' 
    });
  }

  res.status(200).json({ 
    success: true, 
    history: historyResult.games 
  });
}

async function handleProfile(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username required' 
    });
  }

  const userResult = await database.getUserByUsername(username);
  
  if (!userResult.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'User not found' 
    });
  }

  const user = userResult.user;
  
  const userData = {
    username: user.username,
    stats: {
      totalCoins: user.total_coins || user.coins,
      gamesPlayed: user.games_played || 0,
      gamesWon: user.games_won || user.wins || 0,
      winStreak: user.win_streak || 0,
      bestWinStreak: user.best_win_streak || user.best_streak || 0
    }
  };

  res.status(200).json({ 
    success: true, 
    user: userData 
  });
}