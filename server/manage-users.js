const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.sqlite');

// Функция для хеширования пароля
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

// Загрузка БД
async function loadDB() {
    const SQL = await initSqlJs();
    let dbData = null;
    if (fs.existsSync(DB_PATH)) {
        dbData = fs.readFileSync(DB_PATH);
    }
    return new SQL.Database(dbData);
}

// Сохранение БД
function saveDB(db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Выполнение запроса
function dbQuery(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// Выполнение команды
function dbRun(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    saveDB(db);
}

// Показать всех пользователей
async function listUsers() {
    const db = await loadDB();
    const users = dbQuery(db, 'SELECT id, username, full_name, role, department FROM users');
    console.table(users);
}

// Добавить пользователя
async function addUser(username, password, fullName, role = 'user', department = '') {
    const db = await loadDB();
    const hashedPassword = hashPassword(password);
    
    try {
        dbRun(db, 
            'INSERT INTO users (username, password, full_name, role, department) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, fullName, role, department]
        );
        console.log(`✅ Пользователь ${username} добавлен`);
    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
}

// Изменить пароль
async function changePassword(username, newPassword) {
    const db = await loadDB();
    const hashedPassword = hashPassword(newPassword);
    
    const users = dbQuery(db, 'SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
        console.log(`❌ Пользователь ${username} не найден`);
        return;
    }
    
    dbRun(db, 'UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);
    console.log(`✅ Пароль для ${username} изменён`);
}

// Удалить пользователя
async function deleteUser(username) {
    const db = await loadDB();
    const users = dbQuery(db, 'SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
        console.log(`❌ Пользователь ${username} не найден`);
        return;
    }
    
    dbRun(db, 'DELETE FROM users WHERE username = ?', [username]);
    console.log(`✅ Пользователь ${username} удалён`);
}

// Сбросить пароль для всех пользователей (если забыли)
async function resetAllPasswords() {
    const db = await loadDB();
    const defaultPassword = 'Pass123456';
    const hashedPassword = hashPassword(defaultPassword);
    
    dbRun(db, 'UPDATE users SET password = ?', [hashedPassword]);
    console.log(`✅ Все пароли сброшены на "${defaultPassword}"`);
}

// Главная функция
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'list':
            await listUsers();
            break;
        case 'add':
            await addUser(args[1], args[2], args[3], args[4] || 'user', args[5] || '');
            break;
        case 'change-password':
            await changePassword(args[1], args[2]);
            break;
        case 'delete':
            await deleteUser(args[1]);
            break;
        case 'reset-passwords':
            await resetAllPasswords();
            break;
        default:
            console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               Управление пользователями                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  node manage-users.js list                                   ║
║      - показать всех пользователей                           ║
║                                                               ║
║  node manage-users.js add логин пароль ФИО [роль] [отдел]    ║
║      - добавить пользователя                                 ║
║                                                               ║
║  node manage-users.js change-password логин новый_пароль     ║
║      - изменить пароль                                       ║
║                                                               ║
║  node manage-users.js delete логин                           ║
║      - удалить пользователя                                  ║
║                                                               ║
║  node manage-users.js reset-passwords                        ║
║      - сбросить все пароли на "Pass123456"                   ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Примеры:                                                    ║
║                                                               ║
║  node manage-users.js list                                   ║
║  node manage-users.js add petrov Pass789 "Петров П.П."       ║
║  node manage-users.js change-password admin NewPass123       ║
║  node manage-users.js delete testuser                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
            `);
    }
}

main().catch(console.error);