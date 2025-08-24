const database = require('./_lib/database');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { action } = req.query;
    
    if (action === 'flip-test') {
      // Test the updateUserAfterFlip function specifically
      const testStats = {
        newCoins: 130,
        newXp: 400,
        newWins: 33,
        newLosses: 30,
        newGamesPlayed: 63,
        newWinStreak: 3,
        newBestStreak: 6
      };
      
      const result = await database.updateUserAfterFlip('Garybracket', testStats);
      return res.status(200).json({ 
        success: true, 
        message: 'Flip test completed',
        updateResult: result
      });
    }
    
    // Test database connection
    const result = await database.testConnection();
    res.status(200).json({ 
      success: true, 
      message: 'Database test endpoint working',
      connectionTest: result
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Test endpoint failed',
      details: error.message 
    });
  }
};