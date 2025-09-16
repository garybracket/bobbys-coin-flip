# Bobby's Coin Flip

A browser-based coin flipping game with user authentication, leaderboards, and statistics tracking.

## Features

### Current MVP Features (v1.3.0)
- ✅ User registration and login (username/password)
- ✅ Coin flipping game with betting system
- ✅ Animated coin with fancy design
- ✅ User profiles with detailed statistics and XP/ranking system
- ✅ Real-time leaderboards with 5-tier ranking system (Novice → Legend)
- ✅ Game history tracking (last 50 games)
- ✅ PWA support with service worker and web app manifest
- ✅ JWT authentication for mobile app compatibility
- ✅ Password change functionality with secure validation
- ✅ Admin role system for database management
- ✅ Advertisement placement sections
- ✅ Mobile-responsive design with 44px touch targets
- ✅ Heroku deployment ready

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
- **Backend**: Node.js + Express + Socket.IO (for multiplayer)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Tailwind CSS
- **Database**: Supabase PostgreSQL with advanced schemas
- **Authentication**: Hybrid system (express-session + JWT for mobile)
- **PWA**: Service Worker + Web App Manifest (2025 standards)
- **Mobile**: Capacitor framework for native app deployment
- **Deployment**: Heroku with full database persistence

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

## Deployment

### Web Deployment (Heroku)
```bash
# Create Heroku app
heroku create bobbys-coin-flip

# Deploy
git push heroku main

# Open app
heroku open
```

### Mobile App Deployment
The app is ready for mobile deployment with PWA and native app support:

#### Android APK Installation
1. **Latest APK**: `android/bobbys-coin-flip-capacitor-aligned.apk` (v1.3.0)
2. **Installation**: Use ADB or direct transfer to Android device
3. **Requirements**: Android 7.0+ (API 24+)

#### Google Play Store (Future)
- **App Bundle**: `android/bobbys-coin-flip-capacitor-release.aab`
- **TWA Support**: Enabled with assetlinks.json for Trusted Web App deployment
- **Package Name**: com.no-illusion.bobbyscoinflip

#### PWA Installation
- Visit https://bobbys.no-illusion.com on mobile
- Tap "Add to Home Screen" for app-like experience
- Works offline with service worker caching

## Advertisement Integration

The app includes pre-positioned ad spaces for:
- Header banner ads
- Sidebar ads
- Footer ads
- In-game promotional spaces

Ready for Google AdSense or other advertising networks.

## Recent Updates (v1.3.0 - September 2025)

### ✅ Major Features Completed
- ✅ Database persistence (Supabase PostgreSQL) - **COMPLETED**
- ✅ Admin role management system - **COMPLETED**
- ✅ Database migration automation - **COMPLETED**
- ✅ PWA functionality with service worker - **COMPLETED**
- ✅ JWT authentication for mobile apps - **COMPLETED**
- ✅ XP/Leveling system with ranking tiers - **COMPLETED**
- ✅ Password change functionality - **COMPLETED**
- ✅ Real-time multiplayer support (Socket.IO) - **COMPLETED**
- ✅ Private room system for friends - **COMPLETED**

## Future Feature Ideas

### Immediate Enhancements
- 🎁 Daily bonus coins
- 🏆 Achievement system
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

This is a personal project by Gary McQueen and Bobby Satchel. Feel free to suggest improvements!

## License

MIT License - see LICENSE file for details.
