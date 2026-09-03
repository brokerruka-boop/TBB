/**
 * Express.js Backend Server for Poker/Lottery Game
 * Provides REST API endpoints for game operations
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const GitHubGameAPI = require('./github-app');

dotenv.config();

const app = express();
const gameAPI = new GitHubGameAPI(process.env.GITHUB_TOKEN);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * GET /auth/github
 * Redirect to GitHub OAuth authorization
 */
app.get('/auth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/auth/github/callback`;
  const scope = 'user:email read:user';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  res.redirect(githubAuthUrl);
});

/**
 * GET /auth/github/callback
 * Handle GitHub OAuth callback
 */
app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    const authData = await gameAPI.authenticateWithGitHub(code);
    
    if (!authData) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}?token=${authData.token}&user=${authData.user.login}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
});

// ============================================
// PLAYER ENDPOINTS
// ============================================

/**
 * GET /api/players/:username
 * Get player profile and stats
 */
app.get('/api/players/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const playerData = await gameAPI.getPlayerData(username);
    const githubUser = await gameAPI.getGitHubUser(username);
    
    if (!playerData && !githubUser) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      username,
      profile: githubUser,
      gameData: playerData || {
        wins: 0,
        losses: 0,
        balance: 0,
        gamesPlayed: 0,
        joinedDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

/**
 * POST /api/players
 * Create or register new player
 */
app.post('/api/players', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const playerData = {
      username,
      email,
      wins: 0,
      losses: 0,
      balance: 1000, // Starting balance
      gamesPlayed: 0,
      joinedDate: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    const success = await gameAPI.savePlayerData(username, playerData);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create player' });
    }

    res.status(201).json({
      message: 'Player created successfully',
      player: playerData
    });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

/**
 * PUT /api/players/:username
 * Update player profile
 */
app.put('/api/players/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const updateData = req.body;

    const success = await gameAPI.savePlayerData(username, {
      ...updateData,
      lastUpdated: new Date().toISOString()
    });

    if (!success) {
      return res.status(500).json({ error: 'Failed to update player' });
    }

    res.json({
      message: 'Player updated successfully',
      updated: updateData
    });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================

/**
 * GET /api/leaderboard
 * Get top players leaderboard
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || 10), 100);
    
    const leaderboard = await gameAPI.getLeaderboard(limit);
    
    res.json({
      timestamp: new Date().toISOString(),
      count: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/leaderboard/update
 * Update player in leaderboard
 */
app.post('/api/leaderboard/update', async (req, res) => {
  try {
    const playerStats = req.body;

    if (!playerStats.username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const success = await gameAPI.updateLeaderboard(playerStats);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update leaderboard' });
    }

    res.json({
      message: 'Leaderboard updated successfully',
      player: playerStats
    });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
});

// ============================================
// GAME ENDPOINTS
// ============================================

/**
 * POST /api/games/result
 * Record a game result
 */
app.post('/api/games/result', async (req, res) => {
  try {
    const gameResult = req.body;

    if (!gameResult.gameId || !gameResult.players) {
      return res.status(400).json({ error: 'Invalid game result data' });
    }

    const success = await gameAPI.recordGameResult(gameResult);

    if (!success) {
      return res.status(500).json({ error: 'Failed to record game result' });
    }

    // Update leaderboards for all players
    for (const player of gameResult.players) {
      await gameAPI.updateLeaderboard({
        username: player.username,
        wins: (player.wins || 0) + (player.isWinner ? 1 : 0),
        gamesPlayed: (player.gamesPlayed || 0) + 1,
        lastGameDate: new Date().toISOString()
      });
    }

    res.status(201).json({
      message: 'Game result recorded successfully',
      gameId: gameResult.gameId
    });
  } catch (error) {
    console.error('Error recording game result:', error);
    res.status(500).json({ error: 'Failed to record game result' });
  }
});

/**
 * GET /api/games/stats
 * Get overall game statistics
 */
app.get('/api/games/stats', async (req, res) => {
  try {
    const stats = await gameAPI.getGameStatistics();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error fetching game statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================
// LOTTERY ENDPOINTS
// ============================================

/**
 * POST /api/lottery/draw
 * Create a lottery draw
 */
app.post('/api/lottery/draw', async (req, res) => {
  try {
    const lotteryData = req.body;

    if (!lotteryData.drawId || !lotteryData.participants) {
      return res.status(400).json({ error: 'Invalid lottery data' });
    }

    const issue = await gameAPI.createLotteryIssue(lotteryData);

    if (!issue) {
      return res.status(500).json({ error: 'Failed to create lottery draw' });
    }

    res.status(201).json({
      message: 'Lottery draw created successfully',
      issueId: issue.id,
      issueUrl: issue.html_url
    });
  } catch (error) {
    console.error('Error creating lottery draw:', error);
    res.status(500).json({ error: 'Failed to create lottery draw' });
  }
});

/**
 * GET /api/lottery/history
 * Get lottery draw history
 */
app.get('/api/lottery/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || 20), 100);
    
    res.json({
      timestamp: new Date().toISOString(),
      draws: [],
      message: 'Implement fetching draws from GitHub issues'
    });
  } catch (error) {
    console.error('Error fetching lottery history:', error);
    res.status(500).json({ error: 'Failed to fetch lottery history' });
  }
});

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/status
 * API status and configuration info
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    repo: `${process.env.REPO_OWNER}/${process.env.REPO_NAME}`,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

/**
 * 404 Not Found handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🎰 Poker/Lottery Game Server running on http://localhost:${PORT}`);
  console.log(`📊 Repo: ${process.env.REPO_OWNER}/${process.env.REPO_NAME}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;