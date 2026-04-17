// ════════════════════════════════════════════════════════
//  game.js — Space Shooter Cloud Edition
//  Auth + Canvas Game Engine + API integration
// ════════════════════════════════════════════════════════

// ── API helpers ──────────────────────────────────────────
const API = {
  base: '/api',
  token: () => localStorage.getItem('token'),
  headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {})
    };
  },
  async post(path, body) {
    const r = await fetch(this.base + path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    return r.json();
  },
  async get(path) {
    const r = await fetch(this.base + path, { headers: this.headers() });
    return r.json();
  }
};

// ── Auth state ───────────────────────────────────────────
let currentUser = null;

function showMsg(msg, type = 'error') {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.className = 'auth-msg ' + type;
  setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
}

function switchTab(tab) {
  document.getElementById('tab-login').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('tab-register').style.display = tab === 'register' ? '' : 'none';
  document.querySelectorAll('.auth-tab').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0) === (tab === 'login'));
  });
}

async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!username || !password) return showMsg('กรุณากรอกข้อมูลให้ครบ');

  showMsg('กำลังเข้าสู่ระบบ...', 'success');
  const data = await API.post('/auth/login', { username, password });
  if (data.error) return showMsg(data.error);

  localStorage.setItem('token', data.token);
  currentUser = data.username;
  onLoginSuccess();
}

async function doRegister() {
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  if (!username || !password) return showMsg('กรุณากรอกข้อมูลให้ครบ');

  showMsg('กำลังสมัครสมาชิก...', 'success');
  const data = await API.post('/auth/register', { username, password });
  if (data.error) return showMsg(data.error);

  localStorage.setItem('token', data.token);
  currentUser = data.username;
  onLoginSuccess();
}

function doLogout() {
  localStorage.removeItem('token');
  currentUser = null;
  showScreen('auth-screen');
  stopGame();
}

function onLoginSuccess() {
  document.getElementById('player-name').textContent    = currentUser;
  document.getElementById('player-avatar').textContent  = currentUser[0].toUpperCase();
  showScreen('game-screen');
  initCanvas();
  loadLeaderboard();
  loadMyBest();
}

// ── Auto-login on load ───────────────────────────────────
window.addEventListener('load', async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    // Verify token is still valid by fetching personal scores
    const data = await API.get('/scores/me');
    if (data.error) throw new Error('expired');
    // Decode username from token (simple parse)
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentUser = payload.username;
    onLoginSuccess();
  } catch {
    localStorage.removeItem('token');
  }
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function loadMyBest() {
  const scores = await API.get('/scores/me');
  if (scores.length > 0) {
    document.getElementById('player-best').textContent = 'Best: ' + scores[0].score.toLocaleString();
  }
}

async function loadLeaderboard() {
  const data = await API.get('/leaderboard?limit=10');
  const ul = document.getElementById('lb-list');
  const medals = ['gold','silver','bronze'];

  if (!data.length) {
    ul.innerHTML = '<li class="lb-item"><span style="color:var(--muted);font-size:11px">ยังไม่มีข้อมูล</span></li>';
    return;
  }

  ul.innerHTML = data.map((row, i) => `
    <li class="lb-item">
      <span class="lb-rank ${medals[i] || ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)+'.'}</span>
      <span class="lb-name" title="${row.username}">${row.username}</span>
      <span class="lb-score">${Number(row.best_score).toLocaleString()}</span>
    </li>
  `).join('');
}

function showLeaderboard() {
  loadLeaderboard();
}

// ════════════════════════════════════════════════════════
//  GAME ENGINE
// ════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// Game state
let gState = 'idle'; // idle | playing | paused | over
let score = 0, level = 1, lives = 3;
let animId = null;
let lastTime = 0;

// Entity pools
let player, bullets, enemies, particles, stars, powerups;
let enemySpawnTimer = 0, enemySpawnRate = 2000; // ms
let levelUpScore = 500;
let bossActive = false;

// Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyP' && gState === 'playing') pauseGame();
  else if (e.code === 'KeyP' && gState === 'paused') resumeGame();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Mobile touch controls
let touchStartX = null;
canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
canvas.addEventListener('touchmove', e => {
  if (!touchStartX) return;
  const dx = e.touches[0].clientX - touchStartX;
  if (dx > 10)      { keys['ArrowRight'] = true; keys['ArrowLeft'] = false; }
  else if (dx < -10) { keys['ArrowLeft'] = true; keys['ArrowRight'] = false; }
  touchStartX = e.touches[0].clientX;
}, { passive: true });
canvas.addEventListener('touchend', () => {
  keys['ArrowLeft'] = keys['ArrowRight'] = false;
  touchStartX = null;
  if (player && gState === 'playing') player.shoot();
});

// ── Canvas sizing ─────────────────────────────────────────
function initCanvas() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const main = document.querySelector('.game-main');
  if (!main) return;
  canvas.width  = main.clientWidth;
  canvas.height = main.clientHeight;
  if (gState === 'idle' || gState === 'over') {
    stars = createStars(canvas.width, canvas.height);
    if (gState === 'idle') drawIdleFrame();
  }
}

// ── Stars background ──────────────────────────────────────
function createStars(w, h) {
  return Array.from({ length: 120 }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: Math.random() * 1.5 + 0.3,
    speed: Math.random() * 40 + 10,
    alpha: Math.random() * 0.7 + 0.3
  }));
}

function drawStars(dt) {
  stars.forEach(s => {
    s.y += s.speed * dt;
    if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Player ────────────────────────────────────────────────
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 36; this.h = 44;
    this.speed = 260;
    this.shootCooldown = 0;
    this.shootRate = 300; // ms
    this.invulnerable = 0;
    this.trail = [];
  }

  update(dt) {
    if (keys['ArrowLeft']  || keys['KeyA']) this.x -= this.speed * dt;
    if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed * dt;
    this.x = Math.max(this.w/2, Math.min(canvas.width - this.w/2, this.x));

    this.shootCooldown -= dt * 1000;
    if ((keys['Space'] || keys['ArrowUp']) && this.shootCooldown <= 0) this.shoot();

    if (this.invulnerable > 0) this.invulnerable -= dt * 1000;

    this.trail.unshift({ x: this.x, y: this.y + this.h/2, t: 1 });
    if (this.trail.length > 8) this.trail.pop();
    this.trail.forEach(p => p.t -= dt * 3);
  }

  shoot() {
    if (this.shootCooldown > 0) return;
    bullets.push(new Bullet(this.x, this.y - this.h/2, 0, -600, '#4f8ef7', true));
    if (level >= 3) bullets.push(new Bullet(this.x - 10, this.y - this.h/3, -80, -580, '#4f8ef7', true));
    if (level >= 3) bullets.push(new Bullet(this.x + 10, this.y - this.h/3,  80, -580, '#4f8ef7', true));
    if (level >= 6) bullets.push(new Bullet(this.x - 20, this.y, -160, -520, '#a855f7', true));
    if (level >= 6) bullets.push(new Bullet(this.x + 20, this.y,  160, -520, '#a855f7', true));
    this.shootCooldown = Math.max(150, this.shootRate - level * 15);
  }

  draw() {
    // Engine trail
    this.trail.forEach((p, i) => {
      if (p.t <= 0) return;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
      grad.addColorStop(0, `rgba(79,142,247,${p.t * 0.6})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill();
    });

    const alpha = (this.invulnerable > 0 && Math.floor(this.invulnerable / 80) % 2) ? 0.3 : 1;
    ctx.globalAlpha = alpha;

    const x = this.x, y = this.y;
    // Body
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.moveTo(x, y - this.h/2);
    ctx.lineTo(x + this.w/2, y + this.h/2);
    ctx.lineTo(x - this.w/2, y + this.h/2);
    ctx.closePath(); ctx.fill();

    // Cockpit
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 8, 12, 0, 0, Math.PI*2);
    ctx.fill();

    // Wings glow
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(x - this.w/2, y + this.h/2);
    ctx.lineTo(x - this.w/2 - 12, y + 4);
    ctx.lineTo(x - 10, y + 8);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + this.w/2, y + this.h/2);
    ctx.lineTo(x + this.w/2 + 12, y + 4);
    ctx.lineTo(x + 10, y + 8);
    ctx.closePath(); ctx.fill();

    ctx.globalAlpha = 1;
  }

  getBounds() { return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; }
}

// ── Bullet ────────────────────────────────────────────────
class Bullet {
  constructor(x, y, vx, vy, color, fromPlayer) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.fromPlayer = fromPlayer;
    this.w = 3; this.h = 12; this.alive = true;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -20 || this.y > canvas.height + 20 || this.x < -20 || this.x > canvas.width + 20)
      this.alive = false;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  getBounds() { return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; }
}

// ── Enemy ─────────────────────────────────────────────────
const ENEMY_TYPES = [
  { color: '#ef4444', hp: 1, score: 100, size: 28, speed: 80,  shootRate: 3000, isBoss: false },
  { color: '#f97316', hp: 2, score: 200, size: 34, speed: 60,  shootRate: 2000, isBoss: false },
  { color: '#a855f7', hp: 3, score: 350, size: 40, speed: 50,  shootRate: 1500, isBoss: false },
  { color: '#ec4899', hp: 12,score:2000, size: 70, speed: 35,  shootRate: 800,  isBoss: true  },
];

class Enemy {
  constructor(type, x, y) {
    Object.assign(this, ENEMY_TYPES[type]);
    this.type = type;
    this.x = x; this.y = y;
    this.maxHp = this.hp;
    this.shootTimer = Math.random() * this.shootRate;
    this.alive = true;
    this.angle = 0;
    this.wobble = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this.y += this.speed * dt;
    this.wobble += dt * 1.5;
    this.x += Math.sin(this.wobble) * (this.isBoss ? 60 : 30) * dt;
    this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
    this.angle += dt;
    this.shootTimer -= dt * 1000;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootRate + Math.random() * 800;
      if (player) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        const speed = this.isBoss ? 420 : 280;
        bullets.push(new Bullet(this.x, this.y + this.size/2, dx/dist*speed, dy/dist*speed, this.color, false));
        if (this.isBoss) {
          bullets.push(new Bullet(this.x-20, this.y+this.size/2, (dx-20)/dist*speed, dy/dist*speed, this.color, false));
          bullets.push(new Bullet(this.x+20, this.y+this.size/2, (dx+20)/dist*speed, dy/dist*speed, this.color, false));
        }
      }
    }
    if (this.y > canvas.height + this.size) this.alive = false;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle * 0.5);

    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.isBoss ? 30 : 12;

    // Body (UFO shape)
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size/2, this.size/3.5, 0, 0, Math.PI*2);
    ctx.fill();

    // Dome
    ctx.fillStyle = this.isBoss ? '#fff' : '#fff6';
    ctx.beginPath();
    ctx.ellipse(0, -this.size/6, this.size/3.5, this.size/4, 0, 0, Math.PI*2);
    ctx.fill();

    // HP bar for multi-hp enemies
    if (this.maxHp > 1) {
      const bw = this.size;
      const bh = 5;
      const bx = -bw/2, by = this.size/2 + 6;
      ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = this.color;
      ctx.fillRect(bx, by, bw * (this.hp/this.maxHp), bh);
      ctx.shadowBlur = 0;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
  getBounds() { return { x: this.x-this.size/2, y: this.y-this.size/2, w: this.size, h: this.size*0.7 }; }
}

// ── Particle ──────────────────────────────────────────────
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = (Math.random()-0.5)*300;
    this.vy = (Math.random()-0.5)*300 - 80;
    this.r = Math.random()*4+2;
    this.color = color;
    this.life = 1;
    this.decay = Math.random()*2+1;
  }
  update(dt) { this.x += this.vx*dt; this.y += this.vy*dt; this.vy += 150*dt; this.life -= this.decay*dt; }
  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function explode(x, y, color, count=16) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

// ── Powerup ───────────────────────────────────────────────
class Powerup {
  constructor(x, y) {
    this.x = x; this.y = y; this.vy = 80;
    this.alive = true; this.t = 0;
    this.type = Math.random() < 0.5 ? 'life' : 'rapid';
  }
  update(dt) { this.y += this.vy*dt; this.t += dt; if (this.y > canvas.height + 20) this.alive = false; }
  draw() {
    const icon = this.type === 'life' ? '❤' : '⚡';
    ctx.font = '22px serif'; ctx.textAlign = 'center';
    const bob = Math.sin(this.t*3)*4;
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = this.type === 'life' ? '#ef4444' : '#fbbf24';
    ctx.shadowBlur = 16;
    ctx.fillText(icon, this.x, this.y + bob);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  getBounds() { return { x:this.x-14, y:this.y-14, w:28, h:28 }; }
}

// ── Collision ─────────────────────────────────────────────
function hits(a, b) {
  const ab = a.getBounds(), bb = b.getBounds();
  return ab.x < bb.x+bb.w && ab.x+ab.w > bb.x && ab.y < bb.y+bb.h && ab.y+ab.h > bb.y;
}

// ── HUD update ────────────────────────────────────────────
function updateHUD() {
  const heartsAll = '❤'.repeat(lives) + '🖤'.repeat(Math.max(0, 3-lives));
  document.getElementById('hud-score').textContent = score.toLocaleString();
  document.getElementById('hud-lives').textContent = heartsAll;
  document.getElementById('hud-level').textContent = 'LV ' + level;
  document.getElementById('sb-score').textContent  = score.toLocaleString();
  document.getElementById('sb-level').textContent  = level;
  document.getElementById('sb-lives').textContent  = heartsAll;
}

// ── Spawn enemy ───────────────────────────────────────────
function spawnEnemy() {
  const x = Math.random() * (canvas.width - 80) + 40;
  let type;
  const r = Math.random();
  if (score >= 3000 && !bossActive && Math.random() < 0.05) { type = 3; bossActive = true; }
  else if (level >= 5 && r < 0.3)  type = 2;
  else if (level >= 3 && r < 0.5)  type = 1;
  else type = 0;
  enemies.push(new Enemy(type, x, -40));
}

// ── Main game loop ────────────────────────────────────────
function loop(ts) {
  if (gState !== 'playing') return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  // Clear
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars(dt);

  // Spawn enemies
  enemySpawnTimer -= dt * 1000;
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    enemySpawnTimer = Math.max(600, enemySpawnRate - level * 80);
  }

  // Level up
  if (score >= levelUpScore) {
    level++;
    levelUpScore = score + 500 + level * 200;
    showLevelUp(level);
    enemySpawnRate = Math.max(600, 2000 - level * 100);
  }

  // Update
  player.update(dt);
  bullets.forEach(b => b.update(dt));
  enemies.forEach(e => e.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  // Player bullets vs enemies
  bullets.filter(b => b.fromPlayer && b.alive).forEach(b => {
    enemies.filter(e => e.alive).forEach(e => {
      if (hits(b, e)) {
        b.alive = false;
        e.hp--;
        explode(b.x, b.y, e.color, 6);
        if (e.hp <= 0) {
          e.alive = false;
          if (e.isBoss) bossActive = false;
          explode(e.x, e.y, e.color, e.isBoss ? 40 : 16);
          score += e.score * level;
          if (Math.random() < 0.15) powerups.push(new Powerup(e.x, e.y));
        }
      }
    });
  });

  // Enemy bullets vs player
  if (player.invulnerable <= 0) {
    bullets.filter(b => !b.fromPlayer && b.alive).forEach(b => {
      if (hits(b, player)) {
        b.alive = false;
        takeDamage();
      }
    });

    // Enemy collision with player
    enemies.filter(e => e.alive).forEach(e => {
      if (hits(e, player)) {
        e.hp = 0; e.alive = false;
        explode(e.x, e.y, e.color, 20);
        if (e.isBoss) bossActive = false;
        takeDamage();
      }
    });
  }

  // Powerups vs player
  powerups.filter(p => p.alive).forEach(p => {
    if (hits(p, player)) {
      p.alive = false;
      if (p.type === 'life' && lives < 5) { lives++; explode(p.x, p.y, '#ef4444', 10); }
      else if (p.type === 'rapid') { player.shootRate = Math.max(100, player.shootRate - 50); explode(p.x, p.y, '#fbbf24', 10); }
    }
  });

  // Clean dead
  bullets   = bullets  .filter(b => b.alive);
  enemies   = enemies  .filter(e => e.alive);
  particles = particles.filter(p => p.life > 0);
  powerups  = powerups .filter(p => p.alive);

  // Draw
  enemies  .forEach(e => e.draw());
  powerups .forEach(p => p.draw());
  bullets  .forEach(b => b.draw());
  particles.forEach(p => p.draw());
  player.draw();

  updateHUD();

  animId = requestAnimationFrame(loop);
}

let levelUpMsg = null;
function showLevelUp(lv) {
  levelUpMsg = { text: `LEVEL ${lv}!`, alpha: 1, y: canvas.height/2 };
  // draw it once then fade via particles redraw (simple approach)
}

function takeDamage() {
  lives--;
  player.invulnerable = 2000;
  explode(player.x, player.y, '#ef4444', 20);
  if (lives <= 0) endGame();
}

// ── Draw idle frame ───────────────────────────────────────
function drawIdleFrame() {
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (stars) drawStars(0);
}

// ── Game control ──────────────────────────────────────────
function startGame() {
  // Reset state
  score = 0; level = 1; lives = 3;
  enemySpawnTimer = 1000;
  enemySpawnRate = 2000;
  levelUpScore = 500;
  bossActive = false;

  if (!stars) stars = createStars(canvas.width, canvas.height);
  player    = new Player(canvas.width/2, canvas.height - 80);
  bullets   = [];
  enemies   = [];
  particles = [];
  powerups  = [];

  document.getElementById('overlay-start').style.display   = 'none';
  document.getElementById('overlay-gameover').style.display = 'none';
  document.getElementById('overlay-pause').style.display    = 'none';

  gState = 'playing';
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
  document.getElementById('pause-btn').textContent = '⏸ Pause';
}

function stopGame() {
  gState = 'idle';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
}

function pauseGame() {
  gState = 'paused';
  cancelAnimationFrame(animId);
  document.getElementById('overlay-pause').style.display = 'flex';
  document.getElementById('pause-btn').textContent = '▶ Resume';
}

function resumeGame() {
  document.getElementById('overlay-pause').style.display = 'none';
  gState = 'playing';
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
  document.getElementById('pause-btn').textContent = '⏸ Pause';
}

function toggleGame() {
  if (gState === 'playing') pauseGame();
  else if (gState === 'paused') resumeGame();
}

async function endGame() {
  gState = 'over';
  cancelAnimationFrame(animId);

  const finalScore = score;
  document.getElementById('go-score').textContent = finalScore.toLocaleString();
  document.getElementById('go-rank').textContent = 'กำลังบันทึก score...';
  document.getElementById('overlay-gameover').style.display = 'flex';

  // Submit score to server
  try {
    const data = await API.post('/scores', { score: finalScore, level });
    if (data.error) {
      document.getElementById('go-rank').textContent = 'บันทึกไม่สำเร็จ: ' + data.error;
    } else {
      document.getElementById('go-rank').textContent =
        `🏆 อันดับที่ ${data.rank} ในอาณาจักร`;
      // Update best score display
      document.getElementById('player-best').textContent = 'Best: ' + finalScore.toLocaleString();
    }
  } catch (err) {
    document.getElementById('go-rank').textContent = 'ไม่สามารถเชื่อมต่อ server';
  }

  loadLeaderboard(); // refresh leaderboard
}
