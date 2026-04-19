// ════════════════════════════════════════════════════════
//  game.js — Space Shooter Cloud Edition (FIXED FULL)
// ════════════════════════════════════════════════════════

// ── SAFE DOM HELPERS ────────────────────────────────────
const $ = (id) => document.getElementById(id);

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
  async put(path, body) {
    const r = await fetch(this.base + path, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
    return r.json();
  },
  async get(path) {
    const r = await fetch(this.base + path, { headers: this.headers() });
    return r.json();
  }
};

// ── STATE ───────────────────────────────────────────────
let currentUser = null;
let currentAvatar = '🚀';

// ── LEVEL ───────────────────────────────────────────────
const LEVEL_TITLES = [
  { min: 50, title: '⭐ MAX' },
  { min: 41, title: 'Legend' },
  { min: 31, title: 'Admiral' },
  { min: 21, title: 'Commander' },
  { min: 11, title: 'Ace' },
  { min: 6,  title: 'Pilot' },
  { min: 1,  title: 'Space Cadet' },
];
const getLevelTitle = lv => (LEVEL_TITLES.find(t => lv >= t.min) || LEVEL_TITLES.at(-1)).title;
const calcLevel = xp => Math.min(50, Math.floor(xp / 100) + 1);

// ── CANVAS SAFE INIT ────────────────────────────────────
let canvas, ctx;

function initCanvas() {
  canvas = $('gameCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const main = document.querySelector('.game-main');
  if (!main || !canvas) return;
  canvas.width = main.clientWidth;
  canvas.height = main.clientHeight;
}

// ── GAME STATE ──────────────────────────────────────────
let gState = 'idle';
let score = 0, level = 1, lives = 3;
let animId = null, lastTime = 0;

let player, bullets, enemies, particles, stars, powerups;

// ── INPUT ───────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', e => keys[e.code] = false);

// ── PLAYER ──────────────────────────────────────────────
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 36; this.h = 44;
    this.speed = 260;
    this.cooldown = 0;
  }

  update(dt) {
    if (keys['ArrowLeft']) this.x -= this.speed * dt;
    if (keys['ArrowRight']) this.x += this.speed * dt;

    this.x = Math.max(20, Math.min(canvas.width - 20, this.x));

    this.cooldown -= dt;
    if (keys['Space'] && this.cooldown <= 0) {
      this.shoot();
      this.cooldown = 0.2;
    }
  }

  shoot() {
    bullets.push({ x: this.x, y: this.y - 20, vy: -500 });
  }

  draw() {
    ctx.fillStyle = '#4f8ef7';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 20);
    ctx.lineTo(this.x + 15, this.y + 20);
    ctx.lineTo(this.x - 15, this.y + 20);
    ctx.closePath();
    ctx.fill();
  }
}

// ── ENEMY ───────────────────────────────────────────────
class Enemy {
  constructor(x) {
    this.x = x;
    this.y = -20;
    this.vy = 100;
  }

  update(dt) {
    this.y += this.vy * dt;
  }

  draw() {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
  }
}

// ── GAME LOOP ───────────────────────────────────────────
function loop(ts) {
  if (gState !== 'playing') return;

  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  player.update(dt);
  bullets.forEach(b => b.y += b.vy * dt);
  enemies.forEach(e => e.update(dt));

  // spawn enemy
  if (Math.random() < 0.02) {
    enemies.push(new Enemy(Math.random() * canvas.width));
  }

  // collision
  bullets.forEach(b => {
    enemies.forEach(e => {
      if (Math.abs(b.x - e.x) < 15 && Math.abs(b.y - e.y) < 15) {
        e.dead = true;
        b.dead = true;
        score += 10;
      }
    });
  });

  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);

  player.draw();
  bullets.forEach(b => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x, b.y, 3, 10);
  });
  enemies.forEach(e => e.draw());

  requestAnimationFrame(loop);
}

// ── START GAME ──────────────────────────────────────────
function startGame() {
  if (!canvas) initCanvas();

  score = 0;
  bullets = [];
  enemies = [];
  player = new Player(canvas.width / 2, canvas.height - 60);

  gState = 'playing';
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

// ── AUTO INIT ───────────────────────────────────────────
window.addEventListener('load', () => {
  initCanvas();
});