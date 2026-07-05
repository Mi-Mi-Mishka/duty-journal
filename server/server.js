const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ========== БАЗА ДАННЫХ (sql.js) ==========
const DB_PATH = path.join(__dirname, 'database.sqlite');
let db = null;

// Функция для выполнения SQL-запросов (возвращает массив объектов)
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

// Функция для выполнения SQL-команд (INSERT, UPDATE, DELETE)
function dbRun(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    saveDatabase();
}

// Функция для получения одной записи
function dbGet(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
    }
    stmt.free();
    return null;
}

// Сохранение БД в файл
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Инициализация БД
async function initDatabase() {
    const SQL = await initSqlJs();
    let dbData = null;
    if (fs.existsSync(DB_PATH)) {
        dbData = fs.readFileSync(DB_PATH);
    }
    db = new SQL.Database(dbData);
    
    console.log('🔄 Инициализация базы данных...');
    
    // Создаём таблицы
    dbRun(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'viewer',
            is_shared INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    dbRun(`
        CREATE TABLE IF NOT EXISTS shift_staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            shift_name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    dbRun(`
        CREATE TABLE IF NOT EXISTS active_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            device_info TEXT,
            login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    dbRun(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    dbRun(`
        CREATE TABLE IF NOT EXISTS journal_entries (
            id TEXT PRIMARY KEY,
            start_datetime TEXT NOT NULL,
            end_datetime TEXT NOT NULL,
            event_text TEXT NOT NULL,
            staff_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            inspection_readings TEXT,
            shift_from TEXT,
            shift_to TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    dbRun(`
        CREATE TABLE IF NOT EXISTS birthdays (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            birth_date TEXT NOT NULL,
            position TEXT,
            department TEXT,
            created_at TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Создаём пользователей
    const users = [
        { username: 'master', password: 'master123', full_name: 'Мастер', role: 'master' },
        { username: 'operator', password: 'operator123', full_name: 'Инженер-энергетик', role: 'operator' },
        { username: 'viewer', password: 'viewer123', full_name: 'Только просмотр', role: 'viewer' }
    ];
    
    for (const user of users) {
        const existing = dbGet('SELECT * FROM users WHERE username = ?', [user.username]);
        if (!existing) {
            const hashedPassword = bcrypt.hashSync(user.password, 10);
            dbRun(
                `INSERT INTO users (username, password, full_name, role, is_shared) VALUES (?, ?, ?, ?, ?)`,
                [user.username, hashedPassword, user.full_name, user.role, 0]
            );
        }
    }
    
    // Создаём сменный персонал
    const shiftStaffList = [
        { id: 1, name: 'Попов М.С.', shift_name: 'Смена 1' },
        { id: 2, name: 'Седько А.В.', shift_name: 'Смена 2' },
        { id: 3, name: 'Мишурняев Д.С.', shift_name: 'Смена 3' },
        { id: 4, name: 'Репкин В.А.', shift_name: 'Смена 4' },
        { id: 5, name: 'Атаманов В.Г.', shift_name: 'Подменный' }
    ];
    
    for (const staff of shiftStaffList) {
        const existing = dbGet('SELECT * FROM shift_staff WHERE name = ?', [staff.name]);
        if (!existing) {
            dbRun('INSERT INTO shift_staff (name, shift_name) VALUES (?, ?)', [staff.name, staff.shift_name]);
        }
    }
    
    console.log('✅ База данных инициализирована');
}

// ========== MIDDLEWARE ==========

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        
        const activeSession = dbGet('SELECT * FROM active_sessions WHERE token = ?', [token]);
        if (!activeSession) {
            return res.status(401).json({ error: 'Сессия завершена' });
        }
        
        dbRun('UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?', [token]);
        
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Недействительный токен' });
    }
}

function canWriteJournal(req, res, next) {
    if (req.user.role !== 'operator') {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    next();
}

function canEditBirthdays(req, res, next) {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    next();
}

// ========== API ==========

app.post('/api/login', async (req, res) => {
    const { username, password, shiftStaffId, rememberMe } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    
    const user = dbGet('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    if (user.role === 'operator') {
        const activeSession = dbGet('SELECT * FROM active_sessions WHERE user_id = ?', [user.id]);
        if (activeSession) {
            return res.status(403).json({ error: 'Учётная запись уже используется на другом устройстве. Выйдите там.' });
        }
    }
    
    let selectedStaff = null;
    if (user.role === 'operator') {
        if (!shiftStaffId) {
            return res.status(400).json({ error: 'Выберите сменного сотрудника', needShiftStaff: true });
        }
        selectedStaff = dbGet('SELECT * FROM shift_staff WHERE id = ?', [shiftStaffId]);
        if (!selectedStaff) {
            return res.status(400).json({ error: 'Неверный выбор сотрудника' });
        }
    }
    
    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            fullName: user.full_name,
            shiftStaffId: selectedStaff?.id || null,
            shiftStaffName: selectedStaff?.name || null
        },
        JWT_SECRET,
        { expiresIn: expiresIn }
    );
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 720 : 24));
    
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', 
        [user.id, token, expiresAt.toISOString()]);
    
    const deviceInfo = req.headers['user-agent'] || 'неизвестно';
    dbRun('INSERT INTO active_sessions (user_id, token, device_info) VALUES (?, ?, ?)',
        [user.id, token, deviceInfo]);
    
    res.json({
        success: true,
        token: token,
        user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            shiftStaffId: selectedStaff?.id || null,
            shiftStaffName: selectedStaff?.name || null
        }
    });
});

app.post('/api/logout', authenticateToken, async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    
    dbRun('DELETE FROM active_sessions WHERE token = ?', [token]);
    dbRun('DELETE FROM sessions WHERE token = ?', [token]);
    
    res.json({ success: true });
});

app.get('/api/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

app.get('/api/shift-staff', async (req, res) => {
    const staff = dbQuery('SELECT id, name, shift_name FROM shift_staff WHERE is_active = 1');
    res.json(staff);
});

app.get('/api/journal', authenticateToken, async (req, res) => {
    const entries = await db.prepare('SELECT * FROM journal_entries ORDER BY end_datetime DESC').all();
    res.json(entries);
});

app.post('/api/journal', authenticateToken, canWriteJournal, async (req, res) => {
    const { id, startDatetime, endDatetime, eventText, staffName, eventType, inspectionReadings, shiftFrom, shiftTo } = req.body;
    
    dbRun(`
        INSERT INTO journal_entries 
        (id, start_datetime, end_datetime, event_text, staff_name, event_type, inspection_readings, shift_from, shift_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, startDatetime, endDatetime, eventText, staffName, eventType, JSON.stringify(inspectionReadings), shiftFrom, shiftTo]);
    
    res.json({ success: true, id });
});

app.delete('/api/journal/:id', authenticateToken, canWriteJournal, async (req, res) => {
    dbRun('DELETE FROM journal_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

app.get('/api/birthdays', authenticateToken, async (req, res) => {
    const birthdays = dbQuery('SELECT * FROM birthdays');
    res.json(birthdays);
});

app.post('/api/birthdays', authenticateToken, canEditBirthdays, async (req, res) => {
    const { id, name, birthDate, position, department, createdAt } = req.body;
    dbRun(`
        INSERT INTO birthdays (id, name, birth_date, position, department, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [id, name, birthDate, position, department, createdAt || new Date().toISOString()]);
    
    res.json({ success: true, id });
});

app.delete('/api/birthdays/:id', authenticateToken, canEditBirthdays, async (req, res) => {
    dbRun('DELETE FROM birthdays WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

app.get('/api/users', async (req, res) => {
    const users = dbQuery('SELECT id, username, full_name, role, is_shared FROM users');
    res.json(users);
});

// ========== ЗАПУСК ==========
initDatabase().then(() => {
    app.listen(PORT, HOST, () => {
        console.log(`\n🚀 Сервер запущен на http://${HOST}:${PORT}`);
        console.log(`👥 Пользователи: master/master123, operator/operator123, viewer/viewer123`);
        console.log(`💾 База данных: ${DB_PATH}\n`);
    });
}).catch(err => {
    console.error('Ошибка инициализации БД:', err);
});