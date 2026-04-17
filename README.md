# 🚀 Space Shooter Cloud Game

เกมยิงยานอวกาศ พร้อมระบบ Login และ Leaderboard แบบ Cloud จริง

## 🛠️ ติดตั้งและรัน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Database
```bash
# รัน schema ใน MySQL
mysql -u root -p < database.sql
```

### 3. ตั้งค่า Environment
```bash
cp .env.example .env
# แก้ไข .env ให้ตรงกับ MySQL ของคุณ
```

### 4. รัน Server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

เปิด browser ที่ http://localhost:3000

---

## 📡 API Endpoints

| Method | Endpoint | Auth | คำอธิบาย |
|--------|----------|------|-----------|
| POST | /api/auth/register | ❌ | สมัครสมาชิก |
| POST | /api/auth/login | ❌ | เข้าสู่ระบบ → JWT |
| POST | /api/scores | ✅ JWT | บันทึก score |
| GET | /api/scores/me | ✅ JWT | ดู scores ของตัวเอง |
| GET | /api/leaderboard | ❌ | Top 10 global |

---

## 🕹️ วิธีเล่น

- **← →** หรือ **A D** — เลื่อนยาน
- **SPACE** หรือ **↑** — ยิง
- **P** — หยุด/เล่นต่อ
- มือถือ: ปัดซ้ายขวา เพื่อเลื่อน / แตะเพื่อยิง

### ระบบ Level
- ทุก 500 คะแนน = เลเวลขึ้น
- ระดับสูง → ศัตรูเพิ่ม + ยิงเร็วขึ้น
- Level 3+ = ยิงแบบ spread (3 กระสุน)
- Level 6+ = ยิงแบบ wide (5 กระสุน)
- Score 3000+ = Boss UFO โผล่!

### ศัตรู
| สี | HP | คะแนน |
|----|----|--------|
| 🔴 แดง | 1 | 100 |
| 🟠 ส้ม | 2 | 200 |
| 🟣 ม่วง | 3 | 350 |
| 💗 Boss | 12 | 2,000 |

---

## ☁️ Deploy บน Render (ฟรี)

1. Push code ขึ้น GitHub
2. ไปที่ [render.com](https://render.com) → New Web Service
3. เชื่อม GitHub repo
4. ตั้งค่า:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. เพิ่ม Environment Variables จาก `.env`
6. สร้าง MySQL database ที่ Railway หรือ PlanetScale แล้วใส่ DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

---

## ☁️ Deploy บน Railway

1. ติดตั้ง [Railway CLI](https://docs.railway.app/develop/cli)
2. `railway login`
3. `railway init`
4. เพิ่ม MySQL plugin ใน Railway dashboard
5. `railway up`

