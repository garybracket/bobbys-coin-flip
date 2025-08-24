// Shared database utilities for Vercel serverless functions
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client lazily to avoid build-time errors
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Test database connection
async function testConnection() {
  try {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error('Database connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, userCount: count };
  } catch (err) {
    console.error('Database connection error:', err);
    return { success: false, error: err.message };
  }
}

// User authentication functions
async function createUser(username, email, password) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password_hash: password,
        coins: 100,
        level: 1,
        xp: 0,
        wins: 0,
        losses: 0,
        games_played: 0,
        win_streak: 0,
        best_streak: 0,
        role: 'user',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, user: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getUserByUsername(username) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, user: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getUserByEmail(email) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, user: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Game functions
async function updateUserAfterFlip(username, result) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        coins: result.newCoins,
        xp: result.newXp,
        level: result.newLevel,
        wins: result.newWins,
        losses: result.newLosses,
        games_played: result.newGamesPlayed,
        win_streak: result.newWinStreak,
        best_streak: result.newBestStreak
      })
      .eq('username', username)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, user: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function saveGameHistory(username, gameData) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('game_history')
      .insert([{
        username,
        bet_amount: gameData.betAmount,
        prediction: gameData.prediction,
        actual_result: gameData.result,
        won: gameData.won,
        coins_before: gameData.coinsBefore,
        coins_after: gameData.coinsAfter,
        xp_gained: gameData.xpGained,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getGameHistory(username, limit = 50) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, games: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getLeaderboard(limit = 100) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('username, coins, level, xp, wins, losses, games_played, win_streak, best_streak')
      .order('level', { ascending: false })
      .order('xp', { ascending: false })
      .order('coins', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, users: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Utility functions
function calculateLevel(xp) {
  if (xp < 100) return 1;
  if (xp < 300) return Math.floor(xp / 100) + 1;
  if (xp < 700) return Math.floor((xp - 300) / 50) + 3;
  if (xp < 1500) return Math.floor((xp - 700) / 100) + 7;
  return Math.floor((xp - 1500) / 200) + 15;
}

function getRankName(level) {
  if (level <= 10) return 'Novice';
  if (level <= 20) return 'Apprentice';
  if (level <= 35) return 'Expert';
  if (level <= 50) return 'Master';
  return 'Legend';
}

function getRankEmoji(level) {
  if (level <= 10) return '🌱';
  if (level <= 20) return '🎯';
  if (level <= 35) return '⭐';
  if (level <= 50) return '🏆';
  return '👑';
}

module.exports = {
  testConnection,
  createUser,
  getUserByUsername,
  getUserByEmail,
  updateUserAfterFlip,
  saveGameHistory,
  getGameHistory,
  getLeaderboard,
  calculateLevel,
  getRankName,
  getRankEmoji,
  getSupabaseClient
};