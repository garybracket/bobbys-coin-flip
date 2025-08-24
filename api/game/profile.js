const database = require('../_lib/database');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required' 
      });
    }

    // Get user profile
    const userResult = await database.getUserByUsername(username);
    if (!userResult.success) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const user = userResult.user;
    delete user.password_hash;

    // Add rank information
    user.rank = database.getRankName(user.level);
    user.rank_emoji = database.getRankEmoji(user.level);

    // Get game history
    const historyResult = await database.getGameHistory(username, 50);
    const gameHistory = historyResult.success ? historyResult.games : [];

    res.status(200).json({ 
      success: true, 
      user,
      gameHistory
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};