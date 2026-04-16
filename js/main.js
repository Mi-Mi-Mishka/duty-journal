// Общие константы
const STAFF_KEY = 'globalStaffName';
const STAFF_LIST = [
    'Иванов Иван Иванович',
    'Петров Петр Петрович',
    'Сидоров Сидор Сидорович',
    'Смирнова Анна Сергеевна'
];

// Глобальная переменная для ФИО персонала
let currentStaffName = '';

// Загрузка сохранённого ФИО персонала
function loadStaffName() {
    const stored = localStorage.getItem(STAFF_KEY);
    return stored || '';
}

// Сохранение ФИО персонала
function saveStaffName(name) {
    localStorage.setItem(STAFF_KEY, name);
    currentStaffName = name;
    updateStaffDisplay();
    
    // Обновляем отображение на всех страницах
    if (typeof updateShiftModalStaff === 'function') {
        updateShiftModalStaff();
    }
}

// Обновление отображения текущего персонала в навбаре
function updateStaffDisplay() {
    const display = document.getElementById('currentStaffDisplay');
    const staffInput = document.getElementById('staffName');
    const inspectionStaffInput = document.getElementById('inspectionStaffName');
    
    if (currentStaffName) {
        if (display) display.textContent = currentStaffName;
        if (staffInput) staffInput.value = currentStaffName;
        if (inspectionStaffInput) inspectionStaffInput.value = currentStaffName;
    } else {
        if (display) display.textContent = 'Выберите персонал';
        if (staffInput) staffInput.value = '';
        if (inspectionStaffInput) inspectionStaffInput.value = '';
    }
}

// Уведомление
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Очистка всех записей журнала
function clearAllEntries() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ записи? Это действие нельзя отменить.')) {
        localStorage.removeItem('dutyJournalEntries');
        if (typeof renderTable === 'function') {
            renderTable();
        }
        showNotification('Журнал очищен', 'warning');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const savedStaff = loadStaffName();
    
    if (savedStaff && STAFF_LIST.includes(savedStaff)) {
        currentStaffName = savedStaff;
        updateStaffDisplay();
    }

    // Обработчики выбора персонала
    document.querySelectorAll('.staff-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedName = this.getAttribute('data-name');
            saveStaffName(selectedName);
            showNotification(`Выбран персонал: ${selectedName}`, 'success');
            
            const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('staffDropdown'));
            if (dropdown) dropdown.hide();
        });
    });

    // Обработчик кнопки очистки (если есть на странице)
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllEntries);
    }
});