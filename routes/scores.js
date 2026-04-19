const router = require('express').Router();
const db = require('../db');
const auth = require('./middleware/auth');

// ─────────────────────────────────────────
// POST /api/scores
// ─────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { score, level } = req.body;

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Score ไม่ถูกต้อง' });
    }

    const finalScore = Math.floor(score);
    const finalLevel = Math.floor(level) || 1;

    // 1️⃣ บันทึก score
    await db.query(
      'INSERT INTO scores (user_id, score, level) VALUES (?, ?, ?)',
      [req.user.userId, finalScore, finalLevel]
    );

    // 2️⃣ คำนวณ XP (แบบขั้นบันได)
    // ยิงแรง → ได้ XP มากขึ้นตามระดับ
    let xpGained = 0;

    if (finalScore < 500) xpGained = 10;
    else if (finalScore < 1000) xpGained = 25;
    else if (finalScore < 2000) xpGained = 50;
    else if (finalScore < 5000) xpGained = 120;
    else xpGained = 250;

    // บวก XP (max level 50 → 4900 XP)
    await db.query(
      'UPDATE users SET player_xp = LEAST(player_xp + ?, 4900) WHERE id = ?',
      [xpGained, req.user.userId]
    );

    // 3️⃣ ดึง XP ใหม่
    const [[user]] = await db.query(
      'SELECT player_xp FROM users WHERE id = ?',
      [req.user.userId]
    );

    const totalXp = user.player_xp;

    // สูตร Level ขั้นบันได (100 XP ต่อเลเวล)
    const playerLevel = Math.min(50, Math.floor(totalXp / 100) + 1);
    const xpInLevel = totalXp % 100;

    // 4️⃣ คำนวณ Rank (แก้ alias แล้ว)
    const [[rankRow]] = await db.query(`
      SELECT COUNT(*) + 1 AS player_rank
      FROM (
        SELECT MAX(score) AS best
        FROM scores
        GROUP BY user_id
      ) t
      WHERE t.best > ?
    `, [finalScore]);

    res.json({
      message: 'บันทึก score แล้ว!',
      rank: rankRow.player_rank,
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

// ─────────────────────────────────────────
// GET /api/scores/me
// ─────────────────────────────────────────
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