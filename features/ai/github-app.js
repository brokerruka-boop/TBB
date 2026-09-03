/**
 * GitHub API Integration for Poker/Lottery Game
 * Manages player data, game stats, and leaderboards via GitHub API
 */

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'brokerruka-boop';
const REPO_NAME = process.env.REPO_NAME || 'TBB';
const GAME_DATA_FILE = 'game-data/players.json';
const LEADERBOARD_FILE = 'game-data/leaderboard.json';

class GitHubGameAPI {
  constructor(token = GITHUB_TOKEN) {
    this.token = token;
    this.headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get player data from GitHub
   * @param {string} username - GitHub username
   * @returns {Promise<Object>} Player data
   */
  async getPlayerData(username) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GAME_DATA_FILE}`,
        { headers: this.headers }
      );
      
      if (!response.ok) throw new Error('Failed to fetch game data');
      
      const data = await response.json();
      const decodedContent = JSON.parse(atob(data.content));
      
      return decodedContent[username] || null;
    } catch (error) {
      console.error('Error fetching player data:', error);
      return null;
    }
  }

  /**
   * Create or update player profile
   * @param {string} username - GitHub username
   * @param {Object} playerData - Player game data
   * @returns {Promise<boolean>} Success status
   */
  async savePlayerData(username, playerData) {
    try {
      const fileResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GAME_DATA_FILE}`,
        { headers: this.headers }
      );

      let sha = null;
      let allPlayers = {};

      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        sha = fileData.sha;
        allPlayers = JSON.parse(atob(fileData.content));
      }

      allPlayers[username] = {
        ...allPlayers[username],
        ...playerData,
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GAME_DATA_FILE}`,
        {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            message: `Update player: ${username}`,
            content: btoa(JSON.stringify(allPlayers, null, 2)),
            sha: sha
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error saving player data:', error);
      return false;
    }
  }

  /**
   * Get leaderboard rankings
   * @param {number} limit - Number of top players to return
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard(limit = 10) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LEADERBOARD_FILE}`,
        { headers: this.headers }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const leaderboard = JSON.parse(atob(data.content));

      return leaderboard.slice(0, limit);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Update leaderboard with new player stats
   * @param {Object} playerStats - Player statistics
   * @returns {Promise<boolean>} Success status
   */
  async updateLeaderboard(playerStats) {
    try {
      const fileResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LEADERBOARD_FILE}`,
        { headers: this.headers }
      );

      let sha = null;
      let leaderboard = [];

      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        sha = fileData.sha;
        leaderboard = JSON.parse(atob(fileData.content));
      }

      // Add or update player in leaderboard
      const existingIndex = leaderboard.findIndex(p => p.username === playerStats.username);
      if (existingIndex >= 0) {
        leaderboard[existingIndex] = { ...leaderboard[existingIndex], ...playerStats };
      } else {
        leaderboard.push(playerStats);
      }

      // Sort by wins/score
      leaderboard.sort((a, b) => (b.wins || 0) - (a.wins || 0));

      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LEADERBOARD_FILE}`,
        {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            message: `Update leaderboard: ${playerStats.username}`,
            content: btoa(JSON.stringify(leaderboard, null, 2)),
            sha: sha
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return false;
    }
  }

  /**
   * Record game result
   * @param {Object} gameResult - Game outcome data
   * @returns {Promise<boolean>} Success status
   */
  async recordGameResult(gameResult) {
    try {
      const filename = `game-data/results/${gameResult.gameId}.json`;
      
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`,
        {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            message: `Record game result: ${gameResult.gameId}`,
            content: btoa(JSON.stringify({
              ...gameResult,
              timestamp: new Date().toISOString()
            }, null, 2))
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error recording game result:', error);
      return false;
    }
  }

  /**
   * Get user info from GitHub
   * @param {string} username - GitHub username
   * @returns {Promise<Object>} GitHub user data
   */
  async getGitHubUser(username) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/users/${username}`,
        { headers: this.headers }
      );

      if (!response.ok) throw new Error('User not found');
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching GitHub user:', error);
      return null;
    }
  }

  /**
   * Authenticate user via GitHub OAuth
   * @param {string} code - OAuth code from GitHub
   * @returns {Promise<Object>} User and access token
   */
  async authenticateWithGitHub(code) {
    try {
      // This would typically be handled by your backend
      // Exchange code for access token
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        // Get user info with new token
        const userResponse = await fetch(`${GITHUB_API_BASE}/user`, {
          headers: {
            'Authorization': `token ${data.access_token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        const userData = await userResponse.json();
        return {
          user: userData,
          token: data.access_token
        };
      }

      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Error authenticating with GitHub:', error);
      return null;
    }
  }

  /**
   * Create a game issue for lottery draws
   * @param {Object} lotteryData - Lottery draw information
   * @returns {Promise<Object>} Created issue data
   */
  async createLotteryIssue(lotteryData) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            title: `🎰 Lottery Draw: ${lotteryData.drawId}`,
            body: `
## Lottery Draw Details
- **Draw ID**: ${lotteryData.drawId}
- **Prize Pool**: ${lotteryData.prizePool} points
- **Winner**: ${lotteryData.winner}
- **Date**: ${new Date().toISOString()}

### Participants
${lotteryData.participants.map(p => `- ${p}`).join('\n')}
            `,
            labels: ['lottery', 'game-result']
          })
        }
      );

      return await response.json();
    } catch (error) {
      console.error('Error creating lottery issue:', error);
      return null;
    }
  }

  /**
   * Get game statistics
   * @returns {Promise<Object>} Game statistics
   */
  async getGameStatistics() {
    try {
      const leaderboard = await this.getLeaderboard(100);
      
      return {
        totalPlayers: leaderboard.length,
        topPlayer: leaderboard[0] || null,
        averageWins: leaderboard.reduce((sum, p) => sum + (p.wins || 0), 0) / leaderboard.length,
        totalGamesPlayed: leaderboard.reduce((sum, p) => sum + (p.gamesPlayed || 0), 0),
        leaderboard: leaderboard.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting game statistics:', error);
      return null;
    }
  }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubGameAPI;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
  exports.GitHubGameAPI = GitHubGameAPI;
}
