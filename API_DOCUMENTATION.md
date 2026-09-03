# Poker/Lottery Game - API Documentation

## Overview
REST API for poker and lottery game with GitHub integration.

## Authentication

### GitHub OAuth
```
GET /auth/github
```
Redirects to GitHub OAuth authorization page.

```
GET /auth/github/callback?code=CODE
```
Handles OAuth callback and returns token.

---

## Player Endpoints

### Get Player Profile
```
GET /api/players/:username
```
**Response:**
```json
{
  "username": "player123",
  "profile": { /* GitHub user data */ },
  "gameData": {
    "wins": 10,
    "losses": 5,
    "balance": 1500,
    "gamesPlayed": 15,
    "joinedDate": "2026-09-03T00:00:00Z"
  }
}
```

### Create Player
```
POST /api/players
Content-Type: application/json

{
  "username": "player123",
  "email": "player@example.com"
}
```

### Update Player
```
PUT /api/players/:username
Content-Type: application/json

{
  "balance": 2000,
  "wins": 12
}
```

---

## Leaderboard Endpoints

### Get Leaderboard
```
GET /api/leaderboard?limit=10
```
**Response:**
```json
{
  "timestamp": "2026-09-03T11:00:00Z",
  "count": 10,
  "leaderboard": [
    {
      "username": "topplayer",
      "wins": 150,
      "gamesPlayed": 200
    }
  ]
}
```

### Update Leaderboard
```
POST /api/leaderboard/update
Content-Type: application/json

{
  "username": "player123",
  "wins": 12,
  "gamesPlayed": 15
}
```

---

## Game Endpoints

### Record Game Result
```
POST /api/games/result
Content-Type: application/json

{
  "gameId": "game-001",
  "players": [
    {
      "username": "player1",
      "isWinner": true,
      "wins": 10,
      "gamesPlayed": 15
    },
    {
      "username": "player2",
      "isWinner": false,
      "wins": 8,
      "gamesPlayed": 14
    }
  ]
}
```

### Get Game Statistics
```
GET /api/games/stats
```
**Response:**
```json
{
  "timestamp": "2026-09-03T11:00:00Z",
  "totalPlayers": 42,
  "topPlayer": { /* player data */ },
  "averageWins": 15.5,
  "totalGamesPlayed": 650,
  "leaderboard": [ /* top 10 */ ]
}
```

---

## Lottery Endpoints

### Create Lottery Draw
```
POST /api/lottery/draw
Content-Type: application/json

{
  "drawId": "lottery-001",
  "prizePool": 5000,
  "winner": "luckyplayer",
  "participants": ["player1", "player2", "player3"]
}
```
**Response:**
```json
{
  "message": "Lottery draw created successfully",
  "issueId": 12345,
  "issueUrl": "https://github.com/brokerruka-boop/TBB/issues/12345"
}
```

### Get Lottery History
```
GET /api/lottery/history?limit=20
```

---

## Health Check

### Server Status
```
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-03T11:00:00Z",
  "uptime": 3600
}
```

### API Status
```
GET /api/status
```
**Response:**
```json
{
  "status": "running",
  "timestamp": "2026-09-03T11:00:00Z",
  "repo": "brokerruka-boop/TBB",
  "environment": "development"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Username required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "path": "/api/players/unknown",
  "method": "GET"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch player data",
  "path": "/api/players/player123"
}
```

---

## Setup & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub credentials
   ```

3. **Start server:**
   ```bash
   npm start        # Production
   npm run dev      # Development with nodemon
   ```

4. **Test API:**
   ```bash
   curl http://localhost:3000/health
   ```
