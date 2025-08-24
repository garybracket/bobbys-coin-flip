# Bobby's Coin Flip

A browser-based coin flipping game with user authentication, leaderboards, and statistics tracking.

## Features

### Current MVP Features
- ✅ User registration and login (username/password)
- ✅ Coin flipping game with betting system
- ✅ Animated coin with fancy design
- ✅ User profiles with detailed statistics  
- ⚠️ **Real-time multiplayer** (disabled for Vercel serverless)
- ⚠️ **Private room system** (disabled for Vercel serverless)
- ✅ **XP/Leveling system** with 5 rank tiers
- ✅ Real-time leaderboards with rankings
- ✅ Game history tracking
- ✅ **Role-based admin system** 
- ✅ **Password change functionality**
- ✅ Advertisement placement sections
- ✅ Mobile-responsive dark theme design
- ✅ **Vercel serverless deployment** (migrated from Heroku)

### Game Rules
- Players start with 100 coins
- Choose bet amount and predict Heads or Tails
- Correct prediction doubles your bet
- Wrong prediction loses your bet
- Build win streaks to climb the leaderboard
- Game over when you run out of coins

### Statistics Tracked
- Total coins earned
- Games played/won/lost
- Win rate percentage
- Current and best win streaks
- Complete game history (last 50 games)

## Technical Stack
- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Tailwind CSS
- **Database**: Supabase PostgreSQL with advanced schemas
- **Authentication**: bcrypt for password hashing + role-based admin system
- **Real-time**: Socket.IO for multiplayer functionality
- **Sessions**: express-session
- **Deployment**: Heroku ready with database persistence

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```env
   PORT=3000
   SESSION_SECRET=your-random-secret-key
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. Start the server: `npm start`
5. Open browser to `http://localhost:PORT` (default: 3000)

## Database Management

### Automated Migrations
This project uses Supabase CLI for database schema management:

```bash
# Apply pending migrations to production
supabase db push

# Reset local database (requires supabase start)
supabase db reset

# Create new migration
supabase migration new migration_name
```

### Admin System
The application includes role-based administration:
- Admin users can access `/api/admin/cleanup` endpoint
- Admin role determined by `is_admin` column in users table
- Replaces previous hardcoded admin check for security

## Deployment to Heroku

```bash
# Create Heroku app
heroku create bobbys-coin-flip

# Deploy
git push heroku main

# Open app
heroku open
```

## Advertisement Integration

The app includes pre-positioned ad spaces for:
- Header banner ads
- Sidebar ads
- Footer ads
- In-game promotional spaces

Ready for Google AdSense or other advertising networks.

## Future Feature Ideas

### Immediate Enhancements  
- ✅ Database persistence (Supabase PostgreSQL) - **COMPLETED**
- ✅ Admin role management system - **COMPLETED**
- ✅ Database migration automation - **COMPLETED**
- ✅ Real-time multiplayer system - **COMPLETED**
- ✅ XP/Leveling system - **COMPLETED**
- 🎁 Daily bonus coins
- 🏆 Achievement system  
- 🏟️ Tournament system
- 👥 Enhanced friend system and challenges
- 💰 Different coin types/themes
- 📊 Enhanced statistics and graphs

### Advanced Features
- 🎮 Multiple game modes (streaks, time-based, tournaments)
- 💳 In-app purchases for coins
- 🎨 Customizable coin skins
- 📱 Progressive Web App (PWA) features
- 🔔 Push notifications
- 🌍 Social sharing integration
- 📈 Analytics dashboard
- 🎯 Skill-based elements

### Monetization Ideas
- Premium coin packages
- Ad-free experience subscription
- Exclusive coin designs
- Tournament entry fees
- Referral bonuses
- Branded coins for sponsors

## Contributing

This is a personal project by Gary Bracket and Bobby Satchel. Feel free to suggest improvements!

## License

MIT License - see LICENSE file for details.
