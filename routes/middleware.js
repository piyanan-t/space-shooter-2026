// routes/middleware.js — JWT Auth Middleware
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret';

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token)
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token หมดอายุหรือไม่ถูกต้อง' });
  }
};
