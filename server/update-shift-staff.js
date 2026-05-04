const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://...',
    ssl: { rejectUnauthorized: false }
});

async function updateShiftStaff() {
    // Новый список сотрудников
    const staffList = [
        { id: 1, name: 'Попов М.С.', shift_name: 'Смена 1' },
        { id: 2, name: 'Седько А.В.', shift_name: 'Смена 2' },
        { id: 3, name: 'Мишурняев Д.С.', shift_name: 'Смена 3' },
        { id: 4, name: 'Репкин В.А.', shift_name: 'Смена 4' },
        { id: 5, name: 'Атаманов В.Г.', shift_name: 'Подменный' },
        // Добавьте новых сотрудников сюда
        // { name: 'Новый Сотрудник', shift_name: 'Смена Е' }
    ];
    
    console.log('🔄 Обновление списка сменного персонала...\n');
    
    // Очищаем старый список
    await pool.query('DELETE FROM shift_staff');
    
    // Добавляем новых сотрудников
    for (let i = 0; i < staffList.length; i++) {
        await pool.query(
            'INSERT INTO shift_staff (id, name, shift_name) VALUES ($1, $2, $3)',
            [i + 1, staffList[i].name, staffList[i].shift_name]
        );
        console.log(`   Добавлен: ${staffList[i].name} (${staffList[i].shift_name})`);
    }
    
    console.log('\n✅ Список обновлён!');
    process.exit();
}

updateShiftStaff().catch(console.error);