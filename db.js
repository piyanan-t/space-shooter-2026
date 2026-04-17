// db.js (เวอร์ชันถูกต้อง 100%)
require('dotenv').config();
const mysql = require('mysql2/promise');

// ใช้ DATABASE_URL แบบตรง ๆ
const pool = mysql.createPool(process.env.DATABASE_URL);

// test connect
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL error:', err.message);
  }
})();

module.exports = pool;