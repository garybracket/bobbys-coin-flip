-- Bobby's Coin Flip Supabase Database Schema

-- Enable RLS (Row Level Security)
-- CREATE POLICY policies will be added after table creation

-- Users table to store player accounts and statistics
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Game Statistics
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  total_coins INTEGER DEFAULT 100,
  total_xp INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Multiplayer Statistics
  multiplayer_matches_played INTEGER DEFAULT 0,
  multiplayer_matches_won INTEGER DEFAULT 0,
  multiplayer_matches_lost INTEGER DEFAULT 0,
  multiplayer_rounds_won INTEGER DEFAULT 0,
  multiplayer_rounds_lost INTEGER DEFAULT 0
);

-- Game History table to store individual game records
CREATE TABLE IF NOT EXISTS game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  game_type TEXT DEFAULT 'single' CHECK (game_type IN ('single', 'multiplayer')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Single Player Game Data
  bet_amount INTEGER,
  prediction TEXT CHECK (prediction IN ('heads', 'tails')),
  coin_result TEXT CHECK (coin_result IN ('heads', 'tails')),
  won BOOLEAN,
  win_amount INTEGER,
  balance_after INTEGER,
  
  -- XP and Level Data
  xp_gained INTEGER DEFAULT 0,
  level_at_time INTEGER DEFAULT 1,
  
  -- Multiplayer Game Data (for future use)
  match_id TEXT,
  opponent_username TEXT,
  rounds_won INTEGER DEFAULT 0,
  rounds_lost INTEGER DEFAULT 0
);

-- Multiplayer Matches table (for detailed match tracking)
CREATE TABLE IF NOT EXISTS multiplayer_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT UNIQUE NOT NULL,
  player1_username TEXT NOT NULL REFERENCES users(username),
  player2_username TEXT NOT NULL REFERENCES users(username),
  total_rounds INTEGER NOT NULL,
  bet_amount INTEGER NOT NULL,
  
  -- Match Results
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  winner_username TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Round Details (stored as JSONB for flexibility)
  rounds_data JSONB DEFAULT '[]'
);

-- Online Players table (for real-time multiplayer state)
CREATE TABLE IF NOT EXISTS online_players (
  socket_id TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'in_lobby', 'in_match', 'looking_for_match', 'hosting_room', 'in_room')),
  match_id TEXT,
  room_code TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Private Rooms table (for private multiplayer games)
CREATE TABLE IF NOT EXISTS private_rooms (
  room_code TEXT PRIMARY KEY,
  host_username TEXT NOT NULL REFERENCES users(username),
  host_socket_id TEXT,
  guest_username TEXT REFERENCES users(username),
  guest_socket_id TEXT,
  rounds INTEGER NOT NULL,
  bet_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_total_coins ON users(total_coins DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_best_win_streak ON users(best_win_streak DESC);

CREATE INDEX IF NOT EXISTS idx_game_history_username ON game_history(username);
CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);

CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_players ON multiplayer_matches(player1_username, player2_username);
CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_status ON multiplayer_matches(status);
CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_started ON multiplayer_matches(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_players_username ON online_players(username);
CREATE INDEX IF NOT EXISTS idx_online_players_status ON online_players(status);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_rooms ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users 
  FOR SELECT USING (auth.jwt() ->> 'sub' = id::text);

-- Users can update their own data  
CREATE POLICY "Users can update own data" ON users 
  FOR UPDATE USING (auth.jwt() ->> 'sub' = id::text);

-- Game history policies - users can read their own history
CREATE POLICY "Users can read own game history" ON game_history
  FOR SELECT USING (username = (SELECT username FROM users WHERE auth.jwt() ->> 'sub' = id::text));

-- Users can insert their own game history
CREATE POLICY "Users can insert own game history" ON game_history
  FOR INSERT WITH CHECK (username = (SELECT username FROM users WHERE auth.jwt() ->> 'sub' = id::text));

-- Multiplayer matches - players can read matches they're in
CREATE POLICY "Players can read own matches" ON multiplayer_matches
  FOR SELECT USING (
    player1_username = (SELECT username FROM users WHERE auth.jwt() ->> 'sub' = id::text) OR
    player2_username = (SELECT username FROM users WHERE auth.jwt() ->> 'sub' = id::text)
  );

-- Note: For server-side operations, you'll want to use the service role key
-- which bypasses RLS policies. The above policies are for potential future 
-- client-side access.

-- Trigger to update updated_at on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate level from XP (PostgreSQL version of the JavaScript function)
CREATE OR REPLACE FUNCTION calculate_level(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  xp_required INTEGER := 0;
BEGIN
  WHILE total_xp >= xp_required LOOP
    IF level <= 10 THEN
      xp_required := xp_required + 100;
    ELSIF level <= 25 THEN
      xp_required := xp_required + 200;
    ELSIF level <= 50 THEN
      xp_required := xp_required + 400;
    ELSE
      xp_required := xp_required + 800;
    END IF;
    
    IF total_xp >= xp_required THEN
      level := level + 1;
    END IF;
  END LOOP;
  
  RETURN level;
END;
$$ LANGUAGE plpgsql;

-- Function to get rank info based on level
CREATE OR REPLACE FUNCTION get_rank_info(user_level INTEGER)
RETURNS TABLE(rank TEXT, color TEXT, emoji TEXT) AS $$
BEGIN
  IF user_level >= 51 THEN
    RETURN QUERY SELECT 'Legend'::TEXT, '#FFD700'::TEXT, '👑'::TEXT;
  ELSIF user_level >= 36 THEN
    RETURN QUERY SELECT 'Master'::TEXT, '#9333EA'::TEXT, '🏆'::TEXT;
  ELSIF user_level >= 21 THEN
    RETURN QUERY SELECT 'Expert'::TEXT, '#DC2626'::TEXT, '⭐'::TEXT;
  ELSIF user_level >= 11 THEN
    RETURN QUERY SELECT 'Apprentice'::TEXT, '#2563EB'::TEXT, '🎯'::TEXT;
  ELSE
    RETURN QUERY SELECT 'Novice'::TEXT, '#059669'::TEXT, '🌱'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- View for leaderboard with calculated levels and ranks
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  username,
  total_coins,
  games_played,
  CASE 
    WHEN games_played > 0 THEN ROUND((games_won::NUMERIC / games_played::NUMERIC * 100), 1)
    ELSE 0
  END as win_rate,
  best_win_streak,
  calculate_level(total_xp) as level,
  total_xp,
  (get_rank_info(calculate_level(total_xp))).rank as rank,
  (get_rank_info(calculate_level(total_xp))).color as rank_color,
  (get_rank_info(calculate_level(total_xp))).emoji as rank_emoji
FROM users
ORDER BY calculate_level(total_xp) DESC, total_coins DESC
LIMIT 10;

-- Sample data (optional - remove in production)
-- This creates a test user for development
/*
INSERT INTO users (username, password_hash, total_coins, games_played, games_won, total_xp) 
VALUES ('testuser', '$2a$10$example.hash.here', 150, 10, 6, 120)
ON CONFLICT (username) DO NOTHING;
*/