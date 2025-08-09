# Game Rules & Mechanics

## Basic Gameplay

### Starting the Game
- New players receive **100 coins** upon registration
- No email verification required - just username and password
- Players can immediately start flipping coins after registration

### Making a Bet
1. Choose your bet amount (minimum 1 coin, maximum = current balance)
2. Select your prediction: **Heads** or **Tails**  
3. Click the prediction button to flip the coin
4. Watch the animated coin flip result

### Winning & Losing
- **Correct prediction**: Win coins equal to your bet amount
- **Wrong prediction**: Lose your bet amount
- **Example**: Bet 10 coins on Heads, coin shows Heads → gain 10 coins (total: 110)
- **Example**: Bet 10 coins on Heads, coin shows Tails → lose 10 coins (total: 90)

### Game Over
- Game ends when your balance reaches 0 coins
- Players must create a new account to play again
- No coin purchasing or free refills (in current MVP)

## Statistics Tracking

### Individual Stats
- **Total Coins**: Current balance
- **Games Played**: Total number of flips
- **Games Won/Lost**: Win/loss breakdown
- **Win Rate**: Percentage of games won
- **Win Streak**: Current consecutive wins
- **Best Win Streak**: Highest consecutive wins achieved

### Game History
- Last 50 games are stored and displayed
- Each entry shows: bet amount, prediction, result, coins won/lost, timestamp
- Color-coded for easy identification (green = win, red = loss)

## Leaderboard System

### Ranking Criteria
- Primary: **Total coins** (highest to lowest)
- Secondary: Best win streak (for tiebreaking)
- Top 10 players displayed publicly

### Leaderboard Features
- Real-time updates every 30 seconds
- Special badges for top 3 positions (🥇🥈🥉)
- Displays: rank, username, coins, games played, win rate, best streak

## Strategy Tips

### Betting Strategies
- **Conservative**: Small, consistent bets to build slowly
- **Aggressive**: Large bets for quick gains (higher risk)
- **All-in**: Risk everything on a single flip
- **Progressive**: Increase bet after losses, decrease after wins

### Streak Building
- Win streaks are key to leaderboard climbing
- Consider smaller bets during streaks to maintain position
- One loss resets streak to zero

### Risk Management
- Never bet more than you can afford to lose
- Consider your current position on leaderboard
- Balance between growth and preservation

## Fair Play

### Randomization
- Coin flips use JavaScript's `Math.random()` function
- Each flip is independent (50/50 probability)
- No patterns or predictability

### Account Rules
- One account per player
- No transferring coins between accounts
- Inactive accounts may be removed from leaderboard

## Future Rule Considerations

### Potential Additions
- Daily coin bonuses for active players
- Achievement-based coin rewards
- Tournament modes with entry fees
- Time-limited special events
- Skill-based mini-games for bonus coins