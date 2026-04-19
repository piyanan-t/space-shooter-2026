// routes/scores.js — Submit & Get Scores
const router = require('express').Router();
const db     = require('../db');

// ✅ FIX: path ต้องย้อนออกไปก่อน
const auth   = require('../middleware/auth');


// POST /api/scores — บันทึก score + คำนวณ XP (ต้อง login)
router.post('/', auth, async (req, res) => {
  try {
    const { score, level } = req.body;

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Score ไม่ถูกต้อง' });
    }

    const finalScore = Math.floor(score);
    const finalLevel = Math.floor(level) || 1;

    // ── บันทึก score ─────────────────────
    await db.query(
      'INSERT INTO scores (user_id, score, level) VALUES (?, ?, ?)',
      [req.user.userId, finalScore, finalLevel]
    );

    // ── คำนวณ XP ────────────────────────
    const xpGained = Math.floor(finalScore / 10);

    await db.query(
      'UPDATE users SET player_xp = LEAST(player_xp + ?, 4900) WHERE id = ?',
      [xpGained, req.user.userId]
    );

    // ── ดึง XP ล่าสุด ───────────────────
    const [[user]] = await db.query(
      'SELECT player_xp FROM users WHERE id = ?',
      [req.user.userId]
    );

    const totalXp      = user.player_xp || 0;
    const playerLevel  = Math.min(50, Math.floor(totalXp / 100) + 1);
    const xpInLevel    = totalXp % 100;

    // ── FIX SQL (ตัวที่พัง rank) ────────
    const [[rankRow]] = await db.query(`
      SELECT COUNT(*) + 1 AS rank
      FROM (
        SELECT MAX(score) AS best
        FROM scores
        GROUP BY user_id
      ) AS t
      WHERE t.best > ?
    `, [finalScore]);

    res.json({
      message: 'บันทึก score แล้ว!',
      rank: rankRow.rank,
      xpGained,
      totalXp,
      playerLevel,
      xpInLevel
    });

  } catch (err) {
    console.error('SAVE SCORE ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/scores/me — ประวัติ score ของตัวเอง
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT score, level, played_at FROM scores WHERE user_id = ? ORDER BY score DESC LIMIT 10',
      [req.user.userId]
    );

    res.json(rows);

  } catch (err) {
    console.error('GET MY SCORES ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;