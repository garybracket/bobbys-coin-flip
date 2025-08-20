-- Migration: Add admin role support to users table
-- Created: 2025-01-01
-- Purpose: Fix hardcoded admin check security vulnerability by adding proper role-based authentication

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Set Garybracket as admin (correct capitalization for production)
UPDATE users SET is_admin = TRUE WHERE username = 'Garybracket';

-- Add RLS policy for admin operations (optional, for future use)
CREATE POLICY "Admin users can read all data" ON users 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users admin_check 
      WHERE admin_check.username = (SELECT username FROM users WHERE auth.jwt() ->> 'sub' = id::text)
      AND admin_check.is_admin = TRUE
    )
  );

-- Comment for future reference
COMMENT ON COLUMN users.is_admin IS 'Boolean flag indicating if user has administrator privileges. Used for admin-only operations like database cleanup and user management.';