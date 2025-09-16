# Changelog

All notable changes to Bobby's Coin Flip will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-09-13

### Added
- Trusted Web App (TWA) support with assetlinks.json for Google Play Store deployment
- PWA functionality with comprehensive service worker and web app manifest
- JWT authentication system for mobile app compatibility
- CORS configuration for cross-origin mobile requests
- Real-time multiplayer support with Socket.IO (disabled for serverless deployment)
- Private room system for friends to play together
- XP/Leveling system with 5 rank tiers (Novice → Legend)
- Password change functionality with secure validation
- Advanced admin role system for database management

### Changed
- Migrated from session-only to hybrid authentication (sessions + JWT)
- Enhanced mobile-responsive design with improved touch targets
- Updated game mechanics to include XP earning for wins
- Improved user profile interface with XP display and ranking
- Optimized database queries for better performance

### Fixed
- Critical bug: Added missing privateRooms Map declaration for multiplayer
- Fixed multiplayer stats undefined issue in user profile display
- Resolved Socket.IO scoping issues in multiplayer functionality
- Fixed user stats object debugging and display issues
- Corrected authentication flow for both web and mobile clients

### Security
- Implemented secure password hashing with bcrypt
- Added proper input validation on all API endpoints
- Enhanced session management with express-session + JWT dual auth
- Secured admin endpoints with role-based access control

## [1.2.0] - 2025-09-10

### Added
- Complete Supabase PostgreSQL database integration
- User registration and authentication system
- Real-time leaderboards with ranking system
- Game history tracking (last 50 games)
- Comprehensive user profiles with detailed statistics
- Advertisement placement sections for monetization
- Automated database migrations with Supabase CLI

### Changed
- Migrated from in-memory storage to persistent PostgreSQL database
- Enhanced game mechanics with betting system
- Improved mobile-responsive design with Tailwind CSS
- Updated API endpoints for database integration

### Fixed
- Resolved data persistence issues
- Fixed user session management
- Corrected leaderboard calculation logic

## [1.1.0] - 2025-08-20

### Added
- Animated coin flipping with fancy design
- User profiles with statistics tracking
- Game history functionality
- Mobile-responsive layout
- Heroku deployment configuration

### Changed
- Enhanced UI with better animations
- Improved game flow and user experience

## [1.0.0] - 2025-08-15

### Added
- Initial release of Bobby's Coin Flip
- Basic coin flipping game with heads/tails prediction
- Simple betting system with coins
- Win/loss tracking
- Basic leaderboard functionality
- Landing page with game instructions

### Features
- Browser-based coin flipping game
- User starts with 100 coins
- Betting system with double-or-nothing mechanics
- Win streak tracking
- Simple leaderboard
- Mobile-friendly design