const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ─────────────────────────────────────────────
// GET /scores/me
// ─────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT score 
       FROM scores 
       WHERE user_id = ? 
       ORDER BY score DESC`,
      [req.user.id]
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
router.post('/', auth, async (req, res) => {
  try {
    const { score, level } = req.body;

    if (!score) {
      return res.json({ error: 'invalid score' });
    }

    // บันทึก score
    await db.query(
      `INSERT INTO scores (user_id, score, level)
       VALUES (?, ?, ?)`,
      [req.user.id, score, level || 1]
    );

    // หา best score ของแต่ละคน
    const [bestRows] = await db.query(
      `SELECT MAX(score) AS best
       FROM scores
       GROUP BY user_id`
    );

    // หาอันดับ (แก้แล้วใช้ rnk แทน rank)
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

    // XP (ง่าย ๆ)
    const xpGained = Math.floor(score / 100);
    
    // ดึง XP เดิม
    const [[user]] = await db.query(
      `SELECT total_xp FROM users WHERE id = ?`,
      [req.user.id]
    );

    const newXp = (user.total_xp || 0) + xpGained;

    await db.query(
      `UPDATE users SET total_xp = ? WHERE id = ?`,
      [newXp, req.user.id]
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