// routes/auth.js — Register & Login
const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const SECRET = process.env.JWT_SECRET || 'dev_secret';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'กรุณาใส่ username และ password' });
    if (username.length < 3 || username.length > 30)
      return res.status(400).json({ error: 'Username ต้องมี 3-30 ตัวอักษร' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );

    const token = jwt.sign({ userId: result.insertId, username }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ!', token, username });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username นี้ถูกใช้แล้ว' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'กรุณาใส่ username และ password' });

    const [[user]] = await db.query(
      'SELECT * FROM users WHERE username = ?', [username]
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
    res.json({ message: 'เข้าสู่ระบบสำเร็จ!', token, username: user.username });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
