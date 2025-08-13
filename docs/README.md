# Bobby's Coin Flip

A browser-based coin flipping game with user authentication, leaderboards, and statistics tracking.

## Features

### Current MVP Features
- ✅ User registration and login (username/password)
- ✅ Coin flipping game with betting system
- ✅ Animated coin with fancy design
- ✅ User profiles with detailed statistics
- ✅ Real-time leaderboards
- ✅ Game history tracking
- ✅ Advertisement placement sections
- ✅ Mobile-responsive design
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
- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: In-memory (for MVP)
- **Authentication**: bcrypt for password hashing
- **Sessions**: express-session
- **Deployment**: Heroku ready

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open browser to `http://localhost:3000`

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
- 🔄 Database persistence (PostgreSQL/MongoDB)
- 🎁 Daily bonus coins
- 🏆 Achievement system
- 👥 Friend system and challenges
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
