const bcrypt = require('bcryptjs');
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    // Get user from database
    const userResult = await database.getUserByUsername(username);
    
    if (!userResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    const user = userResult.user;

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    // Remove password from response
    const userResponse = { ...user };
    delete userResponse.password_hash;

    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      user: userResponse 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};