// Константа для хранения дней рождения
const BIRTHDAYS_KEY = 'birthdaysList';

// Загрузка списка дней рождения
function loadBirthdays() {
    const stored = localStorage.getItem(BIRTHDAYS_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Сохранение списка дней рождения
function saveBirthdays(birthdays) {
    localStorage.setItem(BIRTHDAYS_KEY, JSON.stringify(birthdays));
    renderBirthdaysList();
}

// Функция для получения возраста
function getAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = (today.getFullYear() - birth.getFullYear())+1;
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// Функция для определения дней до дня рождения
function getDaysUntilBirthday(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    
    // Устанавливаем дату рождения на текущий год
    const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    
    // Если день рождения уже прошел в этом году, берем следующий год
    if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    // Разница в днях
    const diffTime = nextBirthday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Поиск ближайшего дня рождения
function findNextBirthday(birthdays) {
    if (birthdays.length === 0) return null;
    
    const today = new Date();
    let nextBirthday = null;
    let minDays = Infinity;
    
    birthdays.forEach(b => {
        const days = getDaysUntilBirthday(b.birthDate);
        if (days < minDays) {
            minDays = days;
            nextBirthday = b;
        }
    });
    
    return { ...nextBirthday, daysUntil: minDays };
}

// Сортировка дней рождения по дате в течение года
function sortBirthdaysByDate(birthdays) {
    return [...birthdays].sort((a, b) => {
        const dateA = new Date(a.birthDate);
        const dateB = new Date(b.birthDate);
        
        // Сравниваем только месяц и день (игнорируем год)
        if (dateA.getMonth() !== dateB.getMonth()) {
            return dateA.getMonth() - dateB.getMonth();
        }
        return dateA.getDate() - dateB.getDate();
    });
}

// Отображение списка дней рождения
function renderBirthdaysList(filterMonth = 'all') {
    const birthdays = loadBirthdays();
    const list = document.getElementById('birthdaysList');
    
    if (!list) return;
    
    // Обновляем информацию о ближайшем дне рождения
    updateNextBirthdayInfo(birthdays);
    
    if (birthdays.length === 0) {
        list.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-gift fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Нет добавленных сотрудников. Нажмите "Добавить сотрудника" для начала.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Сортируем по дате
    const sortedBirthdays = sortBirthdaysByDate(birthdays);
    
    // Фильтруем по месяцу, если нужно
    let filteredBirthdays = sortedBirthdays;
    if (filterMonth !== 'all') {
        filteredBirthdays = sortedBirthdays.filter(b => {
            const month = new Date(b.birthDate).getMonth() + 1;
            return month === parseInt(filterMonth);
        });
    }
    
    if (filteredBirthdays.length === 0) {
        list.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="text-muted mt-3">Нет дней рождения в выбранном месяце.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Находим ближайший день рождения для выделения
    const nextBirthday = findNextBirthday(birthdays);
    
    let currentMonth = -1;
    let html = '';
    
    filteredBirthdays.forEach(b => {
        const birthDate = new Date(b.birthDate);
        const month = birthDate.getMonth();
        const day = birthDate.getDate();
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                           'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        
        // Добавляем заголовок месяца, если месяц изменился и фильтр не активен
        if (filterMonth === 'all' && month !== currentMonth) {
            currentMonth = month;
            html += `
                <div class="col-12 mb-3 mt-4 ${currentMonth === 0 ? 'mt-0' : ''}">
                    <h5 class="text-primary">
                        <i class="bi bi-calendar-month me-2"></i>
                        ${monthNames[currentMonth]}
                    </h5>
                </div>
            `;
        }
        
        // Проверяем, является ли этот сотрудник ближайшим
        const isNextBirthday = nextBirthday && b.id === nextBirthday.id;
        const age = getAge(b.birthDate);
        
        html += `
            <div class="col-md-4 mb-3">
                <div class="card shadow-sm h-100 ${isNextBirthday ? 'border-warning' : ''}" 
                     style="${isNextBirthday ? 'border-width: 2px;' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="d-flex">
                                <div class="birthday-avatar me-3">
                                    <i class="bi bi-person-circle fs-1" style="color: ${isNextBirthday ? 'var(--corporate-red)' : 'var(--corporate-teal)'};"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-1">${b.name}</h6>
                                    <p class="text-muted small mb-2">
                                        ${b.position || 'Сотрудник'} 
                                        ${b.department ? `· ${b.department}` : ''}
                                    </p>
                                    <div class="d-flex align-items-center gap-3">
                                        <span class="badge" style="background-color: var(--corporate-teal);">
                                            <i class="bi bi-calendar3 me-1"></i>
                                            ${day} ${monthNames[month]}
                                        </span>
                                        <span class="badge bg-secondary">
                                            <i class="bi bi-cake me-1"></i>
                                            ${age} ${getWordForm(age, 'год', 'года', 'лет')}
                                        </span>
                                    </div>
                                    ${isNextBirthday ? `
                                        <div class="mt-2">
                                            <span class="badge bg-warning text-dark">
                                                <i class="bi bi-star-fill me-1"></i>
                                                Через ${nextBirthday.daysUntil} ${getWordForm(nextBirthday.daysUntil, 'день', 'дня', 'дней')}
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline-danger delete-birthday" data-id="${b.id}" data-name="${b.name}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-birthday').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            showDeleteConfirmation(id, name);
        });
    });
}

// Обновление информации о ближайшем дне рождения
function updateNextBirthdayInfo(birthdays) {
    const nextBirthday = findNextBirthday(birthdays);
    const infoElement = document.getElementById('nextBirthdayInfo');
    
    if (!infoElement) return;
    
    if (!nextBirthday) {
        infoElement.innerHTML = '<span class="fw-bold fs-5">Нет данных о днях рождения</span>';
        return;
    }
    
    const birthDate = new Date(nextBirthday.birthDate);
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                       'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    infoElement.innerHTML = `
        <span class="fw-bold fs-5">${nextBirthday.name}</span>
        <span class="badge bg-primary">${birthDate.getDate()} ${monthNames[birthDate.getMonth()]}</span>
        <span class="badge bg-warning text-dark">через ${nextBirthday.daysUntil} ${getWordForm(nextBirthday.daysUntil, 'день', 'дня', 'дней')}</span>
    `;
}

// Показать подтверждение удаления
function showDeleteConfirmation(id, name) {
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    document.getElementById('deleteStaffName').textContent = name;
    
    document.getElementById('confirmDeleteBtn').onclick = function() {
        deleteBirthday(id);
        modal.hide();
    };
    
    modal.show();
}

// Удаление сотрудника
function deleteBirthday(id) {
    const birthdays = loadBirthdays();
    const updatedBirthdays = birthdays.filter(b => b.id !== id);
    saveBirthdays(updatedBirthdays);
    showNotification('Сотрудник удален из списка', 'success');
}

// Склонение слов
function getWordForm(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}

// Открытие модального окна для добавления сотрудника
function openBirthdayModal() {
    const modal = new bootstrap.Modal(document.getElementById('birthdayModal'));
    
    // Очищаем форму
    document.getElementById('birthdayForm').reset();
    
    modal.show();
}

// Сохранение нового сотрудника
function saveBirthday() {
    const name = document.getElementById('birthdayName').value.trim();
    const birthDate = document.getElementById('birthdayDate').value;
    const position = document.getElementById('birthdayPosition').value.trim();
    const department = document.getElementById('birthdayDepartment').value.trim();
    
    if (!name || !birthDate) {
        alert('Пожалуйста, заполните ФИО и дату рождения');
        return;
    }
    
    const birthdays = loadBirthdays();
    
    // Проверяем, нет ли уже такого сотрудника
    const existing = birthdays.find(b => 
        b.name.toLowerCase() === name.toLowerCase() && 
        b.birthDate === birthDate
    );
    
    if (existing) {
        alert('Такой сотрудник уже есть в списке');
        return;
    }
    
    const newBirthday = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name: name,
        birthDate: birthDate,
        position: position,
        department: department,
        createdAt: new Date().toISOString()
    };
    
    birthdays.push(newBirthday);
    saveBirthdays(birthdays);
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('birthdayModal'));
    modal.hide();
    
    showNotification('Сотрудник добавлен', 'success');
}

// Инициализация страницы дней рождения
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('birthdaysList')) return;
    
    renderBirthdaysList();
    
    // Обработчики фильтров по месяцам
    document.querySelectorAll('.month-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.month-filter').forEach(b => {
                b.classList.remove('active');
                b.style.backgroundColor = '';
                b.style.color = '';
            });
            
            this.classList.add('active');
            this.style.backgroundColor = 'var(--corporate-teal)';
            this.style.color = 'white';
            
            const month = this.getAttribute('data-month');
            renderBirthdaysList(month);
        });
    });
    
    // Кнопка добавления сотрудника
    document.getElementById('addBirthdayBtn')?.addEventListener('click', openBirthdayModal);
    
    // Кнопка сохранения
    document.getElementById('saveBirthdayBtn')?.addEventListener('click', saveBirthday);
});

// Добавьте эту функцию в конец файла birthdays.js
// Она нужна для экспорта/импорта
function loadBirthdays() {
    const stored = localStorage.getItem(BIRTHDAYS_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveBirthdays(birthdays) {
    localStorage.setItem(BIRTHDAYS_KEY, JSON.stringify(birthdays));
    if (typeof renderBirthdaysList === 'function') {
        renderBirthdaysList();
    }
}



