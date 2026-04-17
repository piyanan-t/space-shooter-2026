-- ============================================
-- Space Shooter Database Schema
-- รัน: mysql -u root -p < database.sql
-- ============================================

CREATE DATABASE IF NOT EXISTS space_shooter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE space_shooter;

-- ตาราง users
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง scores
CREATE TABLE IF NOT EXISTS scores (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  score      INT NOT NULL,
  level      INT NOT NULL DEFAULT 1,
  played_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index สำหรับ leaderboard query เร็ว
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_user  ON scores(user_id);

-- View: leaderboard (best score per player)
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    u.username,
    MAX(s.score)       AS best_score,
    COUNT(s.id)        AS games_played,
    MAX(s.played_at)   AS last_played
  FROM scores s
  JOIN users u ON s.user_id = u.id
  GROUP BY u.id, u.username
  ORDER BY best_score DESC
  LIMIT 100;
