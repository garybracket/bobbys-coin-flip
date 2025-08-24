const bcrypt = require('bcryptjs');
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
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'logout':
        return await handleLogout(req, res);
      case 'user':
        return await handleUser(req, res);
      case 'change-password':
        return await handleChangePassword(req, res);
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }

  // Get user from database
  const userResult = await database.getUserByUsername(username);
  
  if (!userResult.success) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  }

  const user = userResult.user;

  // Check password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!validPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  }

  // Create simple user session data
  const userData = {
    id: user.id,
    username: user.username,
    stats: {
      totalCoins: user.total_coins || user.coins,
      gamesPlayed: user.games_played || 0,
      gamesWon: user.games_won || user.wins || 0,
      winStreak: user.win_streak || 0,
      bestWinStreak: user.best_win_streak || user.best_streak || 0
    },
    isAdmin: user.is_admin || false
  };

  res.status(200).json({ 
    success: true, 
    message: 'Login successful',
    user: userData
  });
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

  // Create user
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
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.status(200).json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
}

async function handleUser(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // For serverless deployment, we can't maintain server-side sessions
  res.status(200).json({ 
    success: false, 
    message: 'Please log in again' 
  });
}

async function handleChangePassword(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username, current password, and new password are required' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false, 
      error: 'New password must be at least 6 characters long' 
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

  // Verify current password
  const validCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
  
  if (!validCurrentPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'Current password is incorrect' 
    });
  }

  // Hash the new password
  const saltRounds = 10;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
  
  // Update password in database
  const supabase = database.getSupabaseClient();
  
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hashedNewPassword })
    .eq('username', username);

  if (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update password' 
    });
  }

  res.status(200).json({ 
    success: true, 
    message: 'Password changed successfully' 
  });
}