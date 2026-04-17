// routes/scores.js — Submit & Get Scores
const router = require('express').Router();
const db     = require('../db');
const auth   = require('./middleware');

// POST /api/scores  — บันทึก score (ต้อง login)
router.post('/', auth, async (req, res) => {
  try {
    const { score, level } = req.body;
    if (typeof score !== 'number' || score < 0)
      return res.status(400).json({ error: 'Score ไม่ถูกต้อง' });

    await db.query(
      'INSERT INTO scores (user_id, score, level) VALUES (?, ?, ?)',
      [req.user.userId, Math.floor(score), Math.floor(level) || 1]
    );

    // ดึง rank ปัจจุบันของผู้เล่น
    const [[rank]] = await db.query(`
      SELECT COUNT(*) + 1 AS rank
      FROM (
        SELECT MAX(score) AS best FROM scores GROUP BY user_id
      ) t
      WHERE t.best > ?
    `, [score]);

    res.json({ message: 'บันทึก score แล้ว!', rank: rank.rank });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/scores/me — ประวัติ score ของตัวเอง (ต้อง login)
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT score, level, played_at FROM scores WHERE user_id = ? ORDER BY score DESC LIMIT 10',
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
