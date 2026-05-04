// edit-shift-staff.js - редактирование сменного персонала
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

async function editShiftStaff() {
    const SQL = await initSqlJs();
    let dbData = null;
    
    if (fs.existsSync(DB_PATH)) {
        dbData = fs.readFileSync(DB_PATH);
    } else {
        console.log('❌ База данных не найдена!');
        return;
    }
    
    const db = new SQL.Database(dbData);
    
    console.log('\n📋 Текущий список сменного персонала:\n');
    const staffData = db.exec('SELECT * FROM shift_staff');
    
    if (staffData.length > 0 && staffData[0].values.length > 0) {
        console.table(staffData[0].values.map(row => ({
            id: row[0],
            name: row[1],
            shift_name: row[2],
            active: row[3] === 1 ? 'Да' : 'Нет'
        })));
    } else {
        console.log('⚠️ Список пуст. Добавляем стандартных сотрудников...');
        const defaultStaff = [
            { name: 'Иванов Иван', shift_name: 'Смена А' },
            { name: 'Петров Петр', shift_name: 'Смена Б' },
            { name: 'Сидоров Сидор', shift_name: 'Смена В' },
            { name: 'Смирнова Анна', shift_name: 'Смена Г' },
            { name: 'Козлов Дмитрий', shift_name: 'Смена Д' }
        ];
        for (const staff of defaultStaff) {
            db.run(`INSERT INTO shift_staff (name, shift_name) VALUES (?, ?)`, [staff.name, staff.shift_name]);
        }
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
        console.log('✅ Стандартные сотрудники добавлены');
    }
    
    db.close();
}

editShiftStaff().catch(console.error);