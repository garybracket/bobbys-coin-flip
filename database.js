// Database service for Bobby's Coin Flip using Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

class Database {
  // User management functions
  async createUser(username, passwordHash) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username,
          password_hash: passwordHash,
          total_coins: 100,
          total_xp: 0
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Database.createUser error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserByUsername(username) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return { success: false, error: 'User not found' };
        }
        throw error;
      }

      return { success: true, user: data };
    } catch (error) {
      console.error('Database.getUserByUsername error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUser(username, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('username', username)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Database.updateUser error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserStats(username, stats) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          games_played: stats.gamesPlayed,
          games_won: stats.gamesWon,
          games_lost: stats.gamesLost,
          win_streak: stats.winStreak,
          best_win_streak: stats.bestWinStreak,
          total_coins: stats.totalCoins,
          total_xp: stats.totalXP,
          last_login: stats.lastLogin,
          multiplayer_matches_played: stats.multiplayerStats?.matchesPlayed || 0,
          multiplayer_matches_won: stats.multiplayerStats?.matchesWon || 0,
          multiplayer_matches_lost: stats.multiplayerStats?.matchesLost || 0,
          multiplayer_rounds_won: stats.multiplayerStats?.roundsWon || 0,
          multiplayer_rounds_lost: stats.multiplayerStats?.roundsLost || 0,
          updated_at: new Date().toISOString()
        })
        .eq('username', username)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Database.updateUserStats error:', error);
      return { success: false, error: error.message };
    }
  }

  // Game history functions
  async addGameHistory(username, gameData) {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .insert([{
          username,
          game_type: gameData.gameType || 'single',
          bet_amount: gameData.bet,
          prediction: gameData.prediction,
          coin_result: gameData.result,
          won: gameData.won,
          win_amount: gameData.winAmount,
          balance_after: gameData.balanceAfter,
          xp_gained: gameData.xpGained || 0,
          level_at_time: gameData.levelAtTime || 1,
          match_id: gameData.matchId || null,
          opponent_username: gameData.opponentUsername || null,
          rounds_won: gameData.roundsWon || 0,
          rounds_lost: gameData.roundsLost || 0
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, history: data };
    } catch (error) {
      console.error('Database.addGameHistory error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameHistory(username, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('username', username)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, history: data };
    } catch (error) {
      console.error('Database.getGameHistory error:', error);
      return { success: false, error: error.message };
    }
  }

  // Leaderboard functions
  // Admin function to get all users
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, total_coins, games_played');

      if (error) throw error;
      return { success: true, users: data };
    } catch (error) {
      console.error('Database.getAllUsers error:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin function to delete users (be careful!)
  async deleteUser(username) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Database.deleteUser error:', error);
      return { success: false, error: error.message };
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      // Get users with their stats, ordered by total coins
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('total_coins', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Calculate additional fields and ensure no nulls
      const leaderboard = data.map(user => {
        const totalCoins = user.total_coins || 0;
        const gamesPlayed = user.games_played || 0;
        const gamesWon = user.games_won || 0;
        const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
        const bestWinStreak = user.best_win_streak || 0;
        const totalXP = user.total_xp || 0;
        
        // Calculate level from XP
        const level = Math.floor(totalXP / 100) + 1;
        
        // Determine rank based on level and coins
        let rank = '🌱 Novice';
        let rankColor = '#10b981';
        let rankEmoji = '🌱';
        
        if (level >= 50) {
          rank = '👑 Legend';
          rankColor = '#fbbf24';
          rankEmoji = '👑';
        } else if (level >= 25) {
          rank = '⭐ Master';
          rankColor = '#8b5cf6';
          rankEmoji = '⭐';
        } else if (level >= 15) {
          rank = '🔥 Expert';
          rankColor = '#ef4444';
          rankEmoji = '🔥';
        } else if (level >= 10) {
          rank = '💎 Advanced';
          rankColor = '#06b6d4';
          rankEmoji = '💎';
        } else if (level >= 5) {
          rank = '🚀 Rising';
          rankColor = '#f59e0b';
          rankEmoji = '🚀';
        }

        return {
          username: user.username || 'Unknown',
          totalCoins,
          gamesPlayed,
          gamesWon,
          winRate,
          bestWinStreak,
          totalXP,
          level,
          rank,
          rankColor,
          rankEmoji
        };
      });

      return { success: true, leaderboard };
    } catch (error) {
      console.error('Database.getLeaderboard error:', error);
      return { success: false, error: error.message };
    }
  }

  // Multiplayer functions
  async createMultiplayerMatch(matchData) {
    try {
      const { data, error } = await supabase
        .from('multiplayer_matches')
        .insert([{
          match_id: matchData.matchId,
          player1_username: matchData.player1Username,
          player2_username: matchData.player2Username,
          total_rounds: matchData.totalRounds,
          bet_amount: matchData.betAmount,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, match: data };
    } catch (error) {
      console.error('Database.createMultiplayerMatch error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMultiplayerMatch(matchId, updates) {
    try {
      const { data, error } = await supabase
        .from('multiplayer_matches')
        .update(updates)
        .eq('match_id', matchId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, match: data };
    } catch (error) {
      console.error('Database.updateMultiplayerMatch error:', error);
      return { success: false, error: error.message };
    }
  }

  // Online players management (for real-time multiplayer)
  async setPlayerOnline(socketId, username, status = 'online') {
    try {
      const { data, error } = await supabase
        .from('online_players')
        .upsert({
          socket_id: socketId,
          username,
          status,
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, player: data };
    } catch (error) {
      console.error('Database.setPlayerOnline error:', error);
      return { success: false, error: error.message };
    }
  }

  async removePlayerOnline(socketId) {
    try {
      const { error } = await supabase
        .from('online_players')
        .delete()
        .eq('socket_id', socketId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Database.removePlayerOnline error:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePlayerStatus(socketId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        last_activity: new Date().toISOString(),
        ...additionalData
      };

      const { data, error } = await supabase
        .from('online_players')
        .update(updateData)
        .eq('socket_id', socketId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, player: data };
    } catch (error) {
      console.error('Database.updatePlayerStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  async getOnlinePlayersInLobby() {
    try {
      const { data, error } = await supabase
        .from('online_players')
        .select('*')
        .eq('status', 'in_lobby');

      if (error) throw error;
      return { success: true, players: data };
    } catch (error) {
      console.error('Database.getOnlinePlayersInLobby error:', error);
      return { success: false, error: error.message };
    }
  }

  // Private rooms management
  async createPrivateRoom(roomData) {
    try {
      const { data, error } = await supabase
        .from('private_rooms')
        .insert([roomData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, room: data };
    } catch (error) {
      console.error('Database.createPrivateRoom error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPrivateRoom(roomCode) {
    try {
      const { data, error } = await supabase
        .from('private_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Room not found' };
        }
        throw error;
      }

      return { success: true, room: data };
    } catch (error) {
      console.error('Database.getPrivateRoom error:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePrivateRoom(roomCode, updates) {
    try {
      const { data, error } = await supabase
        .from('private_rooms')
        .update(updates)
        .eq('room_code', roomCode)
        .select()
        .single();

      if (error) throw error;
      return { success: true, room: data };
    } catch (error) {
      console.error('Database.updatePrivateRoom error:', error);
      return { success: false, error: error.message };
    }
  }

  async deletePrivateRoom(roomCode) {
    try {
      const { error } = await supabase
        .from('private_rooms')
        .delete()
        .eq('room_code', roomCode);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Database.deletePrivateRoom error:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility function to test database connection
  async testConnection() {
    try {
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      console.log('✅ Database connection successful');
      return { success: true, message: 'Database connected' };
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new Database();