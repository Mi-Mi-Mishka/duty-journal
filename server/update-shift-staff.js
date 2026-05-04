// update-shift-staff.js - обновление сменного персонала
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

async function updateShiftStaff() {
    const SQL = await initSqlJs();
    let dbData = null;
    
    if (fs.existsSync(DB_PATH)) {
        dbData = fs.readFileSync(DB_PATH);
    } else {
        console.log('❌ База данных не найдена!');
        return;
    }
    
    const db = new SQL.Database(dbData);
    
    // Здесь указывайте новые имена
    const updatedStaff = [
        { id: 1, name: 'Попов М.С.', shift_name: 'Смена 1' },
        { id: 2, name: 'Седько А.В.', shift_name: 'Смена 2' },
        { id: 3, name: 'Мишурняев Д.С.', shift_name: 'Смена 3' },
        { id: 4, name: 'Репкин В.А.', shift_name: 'Смена 4' },
        { id: 5, name: 'Атаманов В.Г.', shift_name: 'Подменный' },
        // Добавьте новых сотрудников
        // { id: 6, name: 'Новый Сотрудник', shift_name: 'Смена Е' }
    ];
    
    console.log('🔄 Обновление списка сменного персонала...\n');
    
    for (const staff of updatedStaff) {
        if (staff.id <= 5) {
            // Обновляем существующих
            db.run(`UPDATE shift_staff SET name = ?, shift_name = ? WHERE id = ?`, [staff.name, staff.shift_name, staff.id]);
            console.log(`   Обновлён: ${staff.name} (${staff.shift_name})`);
        } else {
            // Добавляем новых
            const existing = db.exec(`SELECT * FROM shift_staff WHERE id = ${staff.id}`);
            if (existing.length === 0 || existing[0].values.length === 0) {
                db.run(`INSERT INTO shift_staff (id, name, shift_name) VALUES (?, ?, ?)`, [staff.id, staff.name, staff.shift_name]);
                console.log(`   Добавлен: ${staff.name} (${staff.shift_name})`);
            }
        }
    }
    
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    
    console.log('\n✅ Список обновлён!');
    db.close();
}

updateShiftStaff().catch(console.error);