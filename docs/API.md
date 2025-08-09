# API Documentation

## Authentication Endpoints

### POST /api/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true/false,
  "message": "string"
}
```

### POST /api/login
Login with existing credentials.

**Request Body:**
```json
{
  "username": "string", 
  "password": "string"
}
```

**Response:**
```json
{
  "success": true/false,
  "message": "string"
}
```

### POST /api/logout
Logout current user (destroys session).

**Response:**
```json
{
  "success": true
}
```

## User Endpoints

### GET /api/user
Get current user information (requires authentication).

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "string",
    "stats": {
      "gamesPlayed": 0,
      "gamesWon": 0,
      "gamesLost": 0,
      "winStreak": 0,
      "bestWinStreak": 0,
      "totalCoins": 100,
      "created": "ISO-8601-date"
    }
  }
}
```

## Game Endpoints

### POST /api/flip
Execute a coin flip (requires authentication).

**Request Body:**
```json
{
  "bet": 10,
  "prediction": "heads" // or "tails"
}
```

**Response:**
```json
{
  "success": true,
  "result": "heads", // actual flip result
  "won": true, // whether prediction was correct
  "winAmount": 10, // positive if won, negative if lost
  "newBalance": 110,
  "stats": {
    // updated user stats object
  }
}
```

### GET /api/history
Get user's game history (requires authentication).

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "timestamp": "ISO-8601-date",
      "bet": 10,
      "prediction": "heads",
      "result": "tails", 
      "won": false,
      "winAmount": -10,
      "balanceAfter": 90
    }
  ]
}
```

### GET /api/leaderboard
Get top 10 players by total coins.

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "username": "string",
      "totalCoins": 500,
      "gamesPlayed": 50,
      "winRate": "52.0",
      "bestWinStreak": 8
    }
  ]
}
```

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad request (invalid input)
- 401: Unauthorized (authentication required)
- 500: Internal server error