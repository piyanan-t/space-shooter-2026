const express = require('express');
const router = express.Router();
const db = require('../db');

// ─────────────────────────────────────────────
// helper: decode JWT
// ─────────────────────────────────────────────
function getUserId(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.id;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// GET /scores/me
// ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ error: 'unauthorized' });

  try {
    const [rows] = await db.query(
      `SELECT score 
       FROM scores 
       WHERE user_id = ? 
       ORDER BY score DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.json({ error: 'โหลดคะแนนไม่สำเร็จ' });
  }
});

// ─────────────────────────────────────────────
// POST /scores
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ error: 'unauthorized' });

  try {
    const { score, level } = req.body;

    if (!score) {
      return res.json({ error: 'invalid score' });
    }

    // save score
    await db.query(
      `INSERT INTO scores (user_id, score, level)
       VALUES (?, ?, ?)`,
      [userId, score, level || 1]
    );

    // rank
    const [rankRows] = await db.query(
      `SELECT COUNT(*) + 1 AS rnk
       FROM (
         SELECT MAX(score) AS best
         FROM scores
         GROUP BY user_id
       ) t
       WHERE t.best > ?`,
      [score]
    );

    const playerRank = rankRows[0].rnk;

    // XP
    const xpGained = Math.floor(score / 100);

    const [[user]] = await db.query(
      `SELECT total_xp FROM users WHERE id = ?`,
      [userId]
    );

    const newXp = (user?.total_xp || 0) + xpGained;

    await db.query(
      `UPDATE users SET total_xp = ? WHERE id = ?`,
      [newXp, userId]
    );

    res.json({
      success: true,
      rank: playerRank,
      xpGained,
      totalXp: newXp,
      playerLevel: Math.floor(newXp / 100) + 1,
      xpInLevel: newXp % 100
    });

  } catch (err) {
    console.error(err);
    res.json({ error: 'save score failed' });
  }
});

// ─────────────────────────────────────────────
// GET /leaderboard
// ─────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const [rows] = await db.query(
      `SELECT u.username,
              u.avatar,
              u.total_xp,
              t.best_score
       FROM users u
       JOIN (
         SELECT user_id, MAX(score) AS best_score
         FROM scores
         GROUP BY user_id
       ) t ON u.id = t.user_id
       ORDER BY t.best_score DESC
       LIMIT ?`,
      [limit]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.json({ error: 'leaderboard error' });
  }
});

module.exports = router;