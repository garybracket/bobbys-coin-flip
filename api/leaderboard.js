const database = require('./_lib/database');

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
    const limit = parseInt(req.query.limit) || 100;

    // Get leaderboard data
    const leaderboardResult = await database.getLeaderboard(limit);
    
    if (!leaderboardResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch leaderboard' 
      });
    }

    // The database function now handles all calculations and formatting
    res.status(200).json({ 
      success: true, 
      leaderboard: leaderboardResult.users 
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};