const database = require('../_lib/database');

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
    const { username, betAmount, prediction } = req.body;

    if (!username || !betAmount || !prediction) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, bet amount, and prediction are required' 
      });
    }

    if (!['heads', 'tails'].includes(prediction.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prediction must be "heads" or "tails"' 
      });
    }

    if (betAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bet amount must be positive' 
      });
    }

    // Get current user data
    const userResult = await database.getUserByUsername(username);
    if (!userResult.success) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const user = userResult.user;

    if (user.coins < betAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient coins' 
      });
    }

    // Flip the coin (50/50 chance)
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === prediction.toLowerCase();

    // Calculate new values
    const coinsBefore = user.coins;
    let coinsAfter;
    let xpGained = 0;
    
    if (won) {
      coinsAfter = user.coins + betAmount; // Double the bet (gain the bet amount)
      xpGained = 10 + Math.min(user.win_streak * 2, 20); // Base 10 XP + streak bonus
    } else {
      coinsAfter = user.coins - betAmount; // Lose the bet
    }

    // Update stats
    const newGamesPlayed = user.games_played + 1;
    const newWins = won ? user.wins + 1 : user.wins;
    const newLosses = won ? user.losses : user.losses + 1;
    const newWinStreak = won ? user.win_streak + 1 : 0;
    const newBestStreak = Math.max(user.best_streak, newWinStreak);
    const newXp = user.xp + xpGained;
    const newLevel = database.calculateLevel(newXp);

    // Update user in database
    const updateResult = await database.updateUserAfterFlip(username, {
      newCoins: coinsAfter,
      newXp,
      newLevel,
      newWins,
      newLosses,
      newGamesPlayed,
      newWinStreak,
      newBestStreak
    });

    if (!updateResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update user data' 
      });
    }

    // Save game to history
    await database.saveGameHistory(username, {
      betAmount,
      prediction: prediction.toLowerCase(),
      result,
      won,
      coinsBefore,
      coinsAfter,
      xpGained
    });

    // Prepare response
    const response = {
      success: true,
      result,
      won,
      betAmount,
      coinsBefore,
      coinsAfter,
      xpGained,
      newLevel,
      newWinStreak,
      leveledUp: newLevel > user.level,
      user: {
        ...user,
        coins: coinsAfter,
        xp: newXp,
        level: newLevel,
        wins: newWins,
        losses: newLosses,
        games_played: newGamesPlayed,
        win_streak: newWinStreak,
        best_streak: newBestStreak
      }
    };

    delete response.user.password_hash;

    res.status(200).json(response);

  } catch (error) {
    console.error('Flip error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};