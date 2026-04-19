// routes/leaderboard.js — Global Leaderboard (ไม่ต้อง login)
const router = require('express').Router();
const db     = require('../db');

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await db.query(
      'SELECT username, avatar, player_level, best_score, games_played, last_played FROM leaderboard LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
