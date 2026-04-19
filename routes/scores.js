// routes/scores.js — Submit & Get Scores
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth'); // ✅ FIX PATH

// POST /api/scores — บันทึก score + คำนวณ XP (ต้อง login)
router.post('/', auth, async (req, res) => {
  try {
    const { score, level } = req.body;

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Score ไม่ถูกต้อง' });
    }

    const finalScore = Math.floor(score);
    const finalLevel = Math.floor(level) || 1;

    // ── บันทึก score ──
    await db.query(
      'INSERT INTO scores (user_id, score, level) VALUES (?, ?, ?)',
      [req.user.userId, finalScore, finalLevel]
    );

    // ── XP ──
    const xpGained = Math.floor(finalScore / 10);

    await db.query(
      'UPDATE users SET player_xp = LEAST(player_xp + ?, 4900) WHERE id = ?',
      [xpGained, req.user.userId]
    );

    // ── ดึง XP ใหม่ ──
    const [[user]] = await db.query(
      'SELECT player_xp FROM users WHERE id = ?',
      [req.user.userId]
    );

    const totalXp     = user.player_xp;
    const playerLevel = Math.min(50, Math.floor(totalXp / 100) + 1);
    const xpInLevel   = totalXp % 100;

    // ── FIX SQL (เปลี่ยน rank → rnk) ──
    const [[rankRow]] = await db.query(`
      SELECT COUNT(*) + 1 AS rnk
      FROM (
        SELECT MAX(score) AS best 
        FROM scores 
        GROUP BY user_id
      ) t
      WHERE t.best > ?
    `, [finalScore]);

    const playerRank = rankRow?.rnk || 1;

    res.json({
      message: 'บันทึก score แล้ว!',
      rank: playerRank,
      xpGained,
      totalXp,
      playerLevel,
      xpInLevel,
    });

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