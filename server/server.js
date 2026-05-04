const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ========== ПОДКЛЮЧЕНИЕ К POSTGRESQL ==========
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ========== ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ==========
async function initDatabase() {
    console.log('🔄 Инициализация базы данных PostgreSQL...');
    
    // Таблица пользователей
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'operator',
            is_shared INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица сменных дежурных
    await pool.query(`
        CREATE TABLE IF NOT EXISTS shift_staff (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            shift_name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица сессий
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица журнала дежурств
    await pool.query(`
        CREATE TABLE IF NOT EXISTS journal_entries (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            event_text TEXT NOT NULL,
            staff_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            timestamp BIGINT NOT NULL,
            inspection_readings TEXT,
            shift_from TEXT,
            shift_to TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица отпусков
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vacations (
            id TEXT PRIMARY KEY,
            staff_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица дней рождения
    await pool.query(`
        CREATE TABLE IF NOT EXISTS birthdays (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            birth_date TEXT NOT NULL,
            position TEXT,
            department TEXT,
            created_at TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Создаём пользователей
    const users = [
        { username: 'chief_engineer', password: 'eng123', full_name: 'Главный инженер', role: 'chief_engineer', is_shared: 0 },
        { username: 'power_engineer', password: 'power123', full_name: 'Главный энергетик', role: 'power_engineer', is_shared: 0 },
        { username: 'lead_engineer', password: 'lead123', full_name: 'Ведущий инженер', role: 'lead_engineer', is_shared: 0 },
        { username: 'master', password: 'master123', full_name: 'Мастер', role: 'master', is_shared: 0 },
        { username: 'operator', password: 'operator123', full_name: 'Сменный персонал', role: 'operator', is_shared: 1 }
    ];
    
    for (const user of users) {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [user.username]);
        if (existing.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync(user.password, 10);
            await pool.query(
                'INSERT INTO users (username, password, full_name, role, is_shared) VALUES ($1, $2, $3, $4, $5)',
                [user.username, hashedPassword, user.full_name, user.role, user.is_shared]
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
        const existing = await pool.query('SELECT * FROM shift_staff WHERE name = $1', [staff.name]);
        if (existing.rows.length === 0) {
            await pool.query(
                'INSERT INTO shift_staff (name, shift_name) VALUES ($1, $2)',
                [staff.name, staff.shift_name]
            );
        }
    }
    
    console.log('✅ База данных PostgreSQL инициализирована');
}

// ========== API ==========

// Аутентификация
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Недействительный токен' });
    }
}

// Права на запись в журнал
function canWriteJournal(req, res, next) {
    if (req.user.role !== 'operator') {
        return res.status(403).json({ error: 'Доступ запрещён. Только операторы могут редактировать журнал.' });
    }
    next();
}

// Права на редактирование отпусков (только мастер)
function canEditVacations(req, res, next) {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Доступ запрещён. Только мастер может редактировать отпуска.' });
    }
    next();
}

// Права на редактирование дней рождения (только мастер)
function canEditBirthdays(req, res, next) {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Доступ запрещён. Только мастер может редактировать дни рождения.' });
    }
    next();
}

// ========== API АУТЕНТИФИКАЦИИ ==========

app.post('/api/login', async (req, res) => {
    const { username, password, shiftStaffId } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    const user = result.rows[0];
    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    let selectedStaff = null;
    if (user.role === 'operator') {
        if (!shiftStaffId) {
            return res.status(400).json({ error: 'Выберите сменного сотрудника', needShiftStaff: true });
        }
        const staffResult = await pool.query('SELECT * FROM shift_staff WHERE id = $1', [shiftStaffId]);
        if (staffResult.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный выбор сотрудника' });
        }
        selectedStaff = staffResult.rows[0];
    }
    
    const token = jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            fullName: user.full_name,
            isShared: user.is_shared === 1,
            shiftStaffId: selectedStaff?.id || null,
            shiftStaffName: selectedStaff?.name || null
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await pool.query(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
    );
    
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
            shiftStaffName: selectedStaff?.name || null
        }
    });
});

app.post('/api/logout', authenticateToken, async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ success: true });
});

app.get('/api/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

app.get('/api/shift-staff', async (req, res) => {
    const result = await pool.query('SELECT id, name, shift_name FROM shift_staff WHERE is_active = 1');
    res.json(result.rows);
});

// ========== API ЖУРНАЛА ==========

app.get('/api/journal', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM journal_entries ORDER BY timestamp DESC');
    res.json(result.rows);
});

app.post('/api/journal', authenticateToken, canWriteJournal, async (req, res) => {
    const { id, date, startTime, endTime, eventText, staffName, eventType, timestamp, inspectionReadings, shiftFrom, shiftTo } = req.body;
    
    await pool.query(
        `INSERT INTO journal_entries 
         (id, date, start_time, end_time, event_text, staff_name, event_type, timestamp, inspection_readings, shift_from, shift_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, date, startTime, endTime, eventText, staffName, eventType, timestamp, JSON.stringify(inspectionReadings), shiftFrom, shiftTo]
    );
    
    res.json({ success: true, id });
});

app.delete('/api/journal/:id', authenticateToken, canWriteJournal, async (req, res) => {
    await pool.query('DELETE FROM journal_entries WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// ========== API ОТПУСКОВ ==========

app.get('/api/vacations', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM vacations');
    res.json(result.rows);
});

app.post('/api/vacations', authenticateToken, canEditVacations, async (req, res) => {
    const { id, staffId, type, start, end, comment } = req.body;
    await pool.query(
        'INSERT INTO vacations (id, staff_id, type, start_date, end_date, comment) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, staffId, type, start, end, comment]
    );
    res.json({ success: true, id });
});

app.delete('/api/vacations/:id', authenticateToken, canEditVacations, async (req, res) => {
    await pool.query('DELETE FROM vacations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// ========== API ДНЕЙ РОЖДЕНИЯ ==========

app.get('/api/birthdays', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM birthdays');
    res.json(result.rows);
});

app.post('/api/birthdays', authenticateToken, canEditBirthdays, async (req, res) => {
    const { id, name, birthDate, position, department, createdAt } = req.body;
    await pool.query(
        'INSERT INTO birthdays (id, name, birth_date, position, department, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, name, birthDate, position, department, createdAt || new Date().toISOString(), new Date()]
    );
    res.json({ success: true, id });
});

app.delete('/api/birthdays/:id', authenticateToken, canEditBirthdays, async (req, res) => {
    await pool.query('DELETE FROM birthdays WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

app.get('/api/users', async (req, res) => {
    const result = await pool.query('SELECT id, username, full_name, role, is_shared FROM users');
    res.json(result.rows);
});

// ========== ЗАПУСК ==========
initDatabase().then(() => {
    app.listen(PORT, HOST, () => {
        console.log(`\n🚀 Сервер запущен на http://${HOST}:${PORT}`);
        console.log(`👥 Пользователи: chief_engineer/eng123, power_engineer/power123, lead_engineer/lead123, master/master123, operator/operator123`);
        console.log(`💾 База данных: PostgreSQL\n`);
    });
}).catch(err => {
    console.error('Ошибка инициализации БД:', err);
});