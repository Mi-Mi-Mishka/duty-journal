const express = require("express");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const HOST = "0.0.0.0";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const DB_PATH = path.join(__dirname, "database.sqlite");
let db = null;

function dbQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbRun(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDatabase();
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDatabase() {
  const SQL = await initSqlJs();
  let dbData = null;
  if (fs.existsSync(DB_PATH)) {
    dbData = fs.readFileSync(DB_PATH);
  }
  db = new SQL.Database(dbData);

  // Таблица пользователей (с role)
  db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'operator',
            is_shared INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

  // Таблица сменных дежурных
  db.run(`
        CREATE TABLE IF NOT EXISTS shift_staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            shift_name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        event_text TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        inspection_readings TEXT,
        shift_from TEXT,
        shift_to TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS vacations (
        id TEXT PRIMARY KEY,
        staff_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS birthdays (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        position TEXT,
        department TEXT,
        created_at TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  saveDatabase();

  // Создаём пользователей с правильными ролями
  const users = [
    {
      username: "chief_engineer",
      password: "eng123",
      full_name: "Главный инженер",
      role: "chief_engineer",
      is_shared: 0,
    },
    {
      username: "power_engineer",
      password: "power123",
      full_name: "Главный энергетик",
      role: "power_engineer",
      is_shared: 0,
    },
    {
      username: "lead_engineer",
      password: "lead123",
      full_name: "Ведущий инженер",
      role: "lead_engineer",
      is_shared: 0,
    },
    {
      username: "master",
      password: "master123",
      full_name: "Мастер",
      role: "master",
      is_shared: 0,
    },
    {
      username: "operator",
      password: "operator123",
      full_name: "Сменный персонал",
      role: "operator",
      is_shared: 1,
    },
  ];

  for (const user of users) {
    const existing = dbQuery(`SELECT * FROM users WHERE username = ?`, [
      user.username,
    ]);
    if (existing.length === 0) {
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      dbRun(
        `INSERT INTO users (username, password, full_name, role, is_shared) VALUES (?, ?, ?, ?, ?)`,
        [
          user.username,
          hashedPassword,
          user.full_name,
          user.role,
          user.is_shared,
        ],
      );
    }
  }

  // Создаём список сменных сотрудников
  const shiftStaffList = [
    { id: 1, name: "Попов М.С.", shift_name: "Смена 1" },
    { id: 2, name: "Седько А.В.", shift_name: "Смена 2" },
    { id: 3, name: "Мишурняев Д.С.", shift_name: "Смена 3" },
    { id: 4, name: "Репкин В.А.", shift_name: "Смена 4" },
    { id: 5, name: "Атаманов В.Г.", shift_name: "Подменный" },
  ];

  for (const staff of shiftStaffList) {
    const existing = dbQuery(`SELECT * FROM shift_staff WHERE name = ?`, [
      staff.name,
    ]);
    if (existing.length === 0) {
      dbRun(`INSERT INTO shift_staff (name, shift_name) VALUES (?, ?)`, [
        staff.name,
        staff.shift_name,
      ]);
    }
  }

  console.log("✅ База данных инициализирована");
}

// ========== MIDDLEWARE ==========

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Недействительный токен" });
  }
}

// Права на запись в журнал (только оператор)
function canWriteJournal(req, res, next) {
  if (req.user.role !== "operator") {
    return res
      .status(403)
      .json({
        error: "Доступ запрещён. Только операторы могут редактировать журнал.",
      });
  }
  next();
}

// Права на редактирование отпусков (только мастер)
function canEditVacations(req, res, next) {
  if (req.user.role !== "master") {
    return res
      .status(403)
      .json({
        error: "Доступ запрещён. Только мастер может редактировать отпуска.",
      });
  }
  next();
}

// Права на редактирование дней рождения (только мастер)
function canEditBirthdays(req, res, next) {
  if (req.user.role !== "master") {
    return res
      .status(403)
      .json({
        error:
          "Доступ запрещён. Только мастер может редактировать дни рождения.",
      });
  }
  next();
}

// ========== API АУТЕНТИФИКАЦИИ ==========

app.post("/api/login", (req, res) => {
  const { username, password, shiftStaffId } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Введите логин и пароль" });
  }

  const users = dbQuery(`SELECT * FROM users WHERE username = ?`, [username]);

  if (users.length === 0) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }

  const user = users[0];
  const isValidPassword = bcrypt.compareSync(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }

  let selectedStaff = null;
  if (user.role === "operator") {
    if (!shiftStaffId) {
      return res
        .status(400)
        .json({ error: "Выберите сменного сотрудника", needShiftStaff: true });
    }
    const staffList = dbQuery(`SELECT * FROM shift_staff WHERE id = ?`, [
      shiftStaffId,
    ]);
    if (staffList.length === 0) {
      return res.status(400).json({ error: "Неверный выбор сотрудника" });
    }
    selectedStaff = staffList[0];
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      isShared: user.is_shared === 1,
      shiftStaffId: selectedStaff?.id || null,
      shiftStaffName: selectedStaff?.name || null,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  dbRun(`INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`, [
    user.id,
    token,
    expiresAt.toISOString(),
  ]);

  res.json({
    success: true,
    token: token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      isShared: user.is_shared === 1,
      shiftStaffId: selectedStaff?.id || null,
      shiftStaffName: selectedStaff?.name || null,
    },
  });
});

app.post("/api/logout", authenticateToken, (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader.split(" ")[1];
  dbRun(`DELETE FROM sessions WHERE token = ?`, [token]);
  res.json({ success: true });
});

app.get("/api/me", authenticateToken, (req, res) => {
  res.json(req.user);
});

// Получить список сменных сотрудников
app.get("/api/shift-staff", (req, res) => {
  const staff = dbQuery(
    `SELECT id, name, shift_name FROM shift_staff WHERE is_active = 1`,
  );
  res.json(staff);
});

// ========== API ЖУРНАЛА ==========
// Чтение журнала доступно всем авторизованным
app.get("/api/journal", authenticateToken, (req, res) => {
  const rows = dbQuery(`SELECT * FROM journal_entries ORDER BY timestamp DESC`);
  res.json(rows);
});

// Запись в журнал только для оператора
app.post("/api/journal", authenticateToken, canWriteJournal, (req, res) => {
  const {
    id,
    date,
    startTime,
    endTime,
    eventText,
    staffName,
    eventType,
    timestamp,
    inspectionReadings,
    shiftFrom,
    shiftTo,
  } = req.body;

  dbRun(
    `
        INSERT INTO journal_entries 
        (id, date, start_time, end_time, event_text, staff_name, event_type, timestamp, inspection_readings, shift_from, shift_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      date,
      startTime,
      endTime,
      eventText,
      staffName,
      eventType,
      timestamp,
      JSON.stringify(inspectionReadings),
      shiftFrom,
      shiftTo,
    ],
  );

  res.json({ success: true, id });
});

// Удаление из журнала только для оператора
app.delete(
  "/api/journal/:id",
  authenticateToken,
  canWriteJournal,
  (req, res) => {
    dbRun(`DELETE FROM journal_entries WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  },
);

// ========== API ОТПУСКОВ ==========
// Чтение отпусков доступно всем авторизованным
app.get("/api/vacations", authenticateToken, (req, res) => {
  const rows = dbQuery(`SELECT * FROM vacations`);
  res.json(rows);
});

// Запись/удаление отпусков только для мастера
app.post("/api/vacations", authenticateToken, canEditVacations, (req, res) => {
  const { id, staffId, type, start, end, comment } = req.body;
  dbRun(
    `INSERT INTO vacations (id, staff_id, type, start_date, end_date, comment) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, staffId, type, start, end, comment],
  );
  res.json({ success: true, id });
});

app.delete(
  "/api/vacations/:id",
  authenticateToken,
  canEditVacations,
  (req, res) => {
    dbRun(`DELETE FROM vacations WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  },
);

// ========== API ДНЕЙ РОЖДЕНИЯ ==========
// Чтение дней рождения доступно всем авторизованным
app.get("/api/birthdays", authenticateToken, (req, res) => {
  const rows = dbQuery(`SELECT * FROM birthdays`);
  res.json(rows);
});

// Запись/удаление дней рождения только для мастера
app.post("/api/birthdays", authenticateToken, canEditBirthdays, (req, res) => {
  const { id, name, birthDate, position, department, createdAt } = req.body;
  dbRun(
    `INSERT INTO birthdays (id, name, birth_date, position, department, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      birthDate,
      position,
      department,
      createdAt || new Date().toISOString(),
      new Date().toISOString(),
    ],
  );
  res.json({ success: true, id });
});

app.delete(
  "/api/birthdays/:id",
  authenticateToken,
  canEditBirthdays,
  (req, res) => {
    dbRun(`DELETE FROM birthdays WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  },
);

app.get("/api/users", (req, res) => {
  const rows = dbQuery(
    `SELECT id, username, full_name, role, is_shared FROM users`,
  );
  res.json(rows);
});

// Инициализация и запуск
initDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Сервер запущен на http://${HOST}:${PORT}`);
    console.log(`👥 Пользователи и права:`);
    console.log(`   chief_engineer/eng123 - только чтение всего`);
    console.log(`   power_engineer/power123 - только чтение всего`);
    console.log(`   lead_engineer/lead123 - только чтение всего`);
    console.log(
      `   master/master123 - чтение всего + редактирование отпусков и ДР`,
    );
    console.log(`   operator/operator123 - чтение всего + запись в журнал`);
    console.log(`💾 База данных: ${DB_PATH}\n`);
  });
});
