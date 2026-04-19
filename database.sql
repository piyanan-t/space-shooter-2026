-- ============================================
-- Space Shooter Database Schema (Railway Ready)
-- ============================================

-- ตาราง users
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_emoji  VARCHAR(10) DEFAULT '🚀',
  player_xp     INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง scores
CREATE TABLE IF NOT EXISTS scores (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  score     INT NOT NULL,
  level     INT NOT NULL DEFAULT 1,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index (ช่วยให้ leaderboard เร็วขึ้น)
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_user  ON scores(user_id);

-- View leaderboard (พร้อม avatar + player_level)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.username,
  COALESCE(u.avatar_emoji, '🚀')           AS avatar,
  LEAST(50, FLOOR(u.player_xp / 100) + 1)  AS player_level,
  MAX(s.score)                               AS best_score,
  COUNT(s.id)                                AS games_played,
  MAX(s.played_at)                           AS last_played
FROM scores s
JOIN users u ON s.user_id = u.id
GROUP BY u.id, u.username, u.avatar_emoji, u.player_xp
ORDER BY best_score DESC;

-- ============================================
-- Migration (ถ้ามี DB เดิมอยู่แล้ว รัน 2 บรรทัดนี้)
-- ============================================
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(10) DEFAULT '🚀';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS player_xp INT DEFAULT 0;
