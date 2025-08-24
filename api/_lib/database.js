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
        password_hash: password,
        total_coins: 100,
        total_xp: 0,
        games_won: 0,
        games_lost: 0,
        games_played: 0,
        win_streak: 0,
        best_win_streak: 0,
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

// Note: getUserByEmail removed since schema doesn't have email column

// Game functions
async function updateUserAfterFlip(username, result) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        total_coins: result.newCoins,
        total_xp: result.newXp,
        games_won: result.newWins,
        games_lost: result.newLosses,
        games_played: result.newGamesPlayed,
        win_streak: result.newWinStreak,
        best_win_streak: result.newBestStreak,
        updated_at: new Date().toISOString()
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
      .select('*')
      .order('total_coins', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }
    
    // Calculate additional fields and ensure no nulls - match original logic
    const leaderboard = data.map((user, index) => {
      const totalCoins = user.total_coins || 0;
      const gamesPlayed = user.games_played || 0;
      const gamesWon = user.games_won || 0;
      const totalXp = user.total_xp || 0;
      const level = calculateLevel(totalXp);
      const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : '0.0';
      
      return {
        ...user,
        total_coins: totalCoins,
        games_played: gamesPlayed,
        games_won: gamesWon,
        total_xp: totalXp,
        level: level,
        win_rate: winRate,
        rank: index + 1,
        rank_name: getRankName(level),
        rank_emoji: getRankEmoji(level)
      };
    });
    
    return { success: true, users: leaderboard };
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
  updateUserAfterFlip,
  saveGameHistory,
  getGameHistory,
  getLeaderboard,
  calculateLevel,
  getRankName,
  getRankEmoji,
  getSupabaseClient
};