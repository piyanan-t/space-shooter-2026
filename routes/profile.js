// routes/profile.js — Avatar & Profile
const router = require('express').Router();
const db     = require('../db');
const auth   = require('./middleware');

const ALLOWED_AVATARS = [
  '🚀','👾','🛸','⚡','🌟','💀','🔥','🤖','👽','🦾',
  '🐉','🦅','🌙','☄️','🎯','💎','🏆','⚔️','🛡️','🌀'
];

// GET /api/profile/me — ดึงข้อมูลโปรไฟล์ (avatar + xp)
router.get('/me', auth, async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT username, avatar_emoji, player_xp FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    const totalXp    = user.player_xp || 0;
    const playerLevel = Math.min(50, Math.floor(totalXp / 100) + 1);
    const xpInLevel  = totalXp % 100;

    res.json({
      username:    user.username,
      avatar:      user.avatar_emoji || '🚀',
      totalXp,
      playerLevel,
      xpInLevel,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile/avatar — เปลี่ยน avatar emoji
router.put('/avatar', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!ALLOWED_AVATARS.includes(emoji))
      return res.status(400).json({ error: 'Avatar ไม่ถูกต้อง' });

    await db.query(
      'UPDATE users SET avatar_emoji = ? WHERE id = ?',
      [emoji, req.user.userId]
    );
    res.json({ message: 'เปลี่ยน avatar แล้ว!', avatar: emoji });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
