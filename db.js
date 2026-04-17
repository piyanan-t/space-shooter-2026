// db.js — MySQL Connection Pool
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'space_shooter',
  waitForConnections: true,
  connectionLimit:    10,
});

// ทดสอบ connection ตอนเริ่ม
pool.getConnection()
  .then(conn => { console.log('✅ MySQL connected'); conn.release(); })
  .catch(err  => console.error('❌ MySQL error:', err.message));

module.exports = pool;
