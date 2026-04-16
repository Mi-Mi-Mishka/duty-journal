// Константы для отпусков
const VACATION_KEY = 'vacationSchedule';
const STAFF_LIST_FULL = [
            { id: 1, name: 'Варнавский Иван', initials: 'ВИ', department: 'Слесарь-электрик' },
            { id: 2, name: 'Мукосеев Евгений', initials: 'МЕ', department: 'Слесарь-электрик' },
            { id: 3, name: 'Харченко Николай', initials: 'ХН', department: 'Слесарь-электрик' },
            { id: 4, name: 'Попов Михаил', initials: 'ПМ', department: 'Инженер-энергетик' },
            { id: 5, name: 'Мишурняев Дмитрий', initials: 'МД', department: 'Инженер-энергетик' },
            { id: 6, name: 'Седько Александр', initials: 'СА', department: 'Инженер-энергетик' },
            { id: 7, name: 'Репкин Владимир', initials: 'РВ', department: 'Инженер-энергетик' },
            { id: 8, name: 'Атаманов Максим', initials: 'АМ', department: 'Инженер-энергетик' },
            { id: 9, name: 'Колтунов Алексей', initials: 'КА', department: 'Мастер участка' },
];

// Загрузка отпусков
function loadVacations() {
    const stored = localStorage.getItem(VACATION_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Сохранение отпусков
function saveVacations(vacations) {
    localStorage.setItem(VACATION_KEY, JSON.stringify(vacations));
    renderVacationGrid();
}

// Очистка всех отпусков
function clearAllVacations() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ отпуска? Это действие нельзя отменить.')) {
        localStorage.removeItem(VACATION_KEY);
        renderVacationGrid();
        showNotification('График отпусков очищен', 'success');
    }
}

// Обновление статистики
function updateVacationStats(vacations) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    const currentVacation = vacations.filter(v => {
        const start = new Date(v.start);
        const end = new Date(v.end);
        return now >= start && now <= end;
    }).length;
    
    const monthlyPlan = vacations.filter(v => {
        const startMonth = new Date(v.start).getMonth() + 1;
        const endMonth = new Date(v.end).getMonth() + 1;
        return startMonth === currentMonth || endMonth === currentMonth;
    }).length;
    
    const conflicts = new Set();
    for (let i = 0; i < vacations.length; i++) {
        for (let j = i + 1; j < vacations.length; j++) {
            if (vacations[i].staffId !== vacations[j].staffId) {
                const v1Start = new Date(vacations[i].start);
                const v1End = new Date(vacations[i].end);
                const v2Start = new Date(vacations[j].start);
                const v2End = new Date(vacations[j].end);
                
                if (v1Start <= v2End && v1End >= v2Start) {
                    conflicts.add(vacations[i].staffId);
                    conflicts.add(vacations[j].staffId);
                }
            }
        }
    }
    
    document.getElementById('currentVacation').textContent = currentVacation;
    document.getElementById('monthlyPlan').textContent = monthlyPlan;
    document.getElementById('conflicts').textContent = conflicts.size;
}

// Проверка на пересечения
function checkConflicts(staffId, staffVacations, allVacations) {
    for (let v of staffVacations) {
        if (checkSingleConflict(staffId, v, allVacations)) {
            return true;
        }
    }
    return false;
}

function checkSingleConflict(staffId, vacation, allVacations) {
    const vStart = new Date(vacation.start);
    const vEnd = new Date(vacation.end);
    
    return allVacations.some(other => {
        if (other.staffId === staffId) return false;
        const oStart = new Date(other.start);
        const oEnd = new Date(other.end);
        return (vStart <= oEnd && vEnd >= oStart);
    });
}

// Рендер сетки сотрудников
function renderVacationGrid(filterMonth = 'all', searchTerm = '') {
    const vacations = loadVacations();
    const grid = document.getElementById('staffGrid');
    
    if (!grid) return;
    
    const staffList = STAFF_LIST_FULL.filter(staff => 
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    updateVacationStats(vacations);
    
    const staffSelect = document.getElementById('vacationStaff');
    if (staffSelect) {
        staffSelect.innerHTML = '<option value="">Выберите сотрудника</option>' +
            STAFF_LIST_FULL.map(s => `<option value="${s.id}">${s.name} (${s.department})</option>`).join('');
    }
    
    if (vacations.length === 0) {
        let emptyHtml = '';
        staffList.forEach(staff => {
            emptyHtml += `
                <div class="col-md-4" data-staff-id="${staff.id}">
                    <div class="card shadow-sm h-100">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <span class="badge me-2" style="background-color: var(--corporate-teal); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                                    ${staff.initials}
                                </span>
                                <div>
                                    <span class="fw-bold d-block">${staff.name}</span>
                                    <small class="text-muted">${staff.department}</small>
                                </div>
                            </div>
                            <span class="badge" style="background-color: var(--corporate-teal);">0 дн.</span>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span>Использовано</span>
                                    <span>0 / 28 дней</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar" style="width: 0%; background-color: var(--corporate-teal);"></div>
                                </div>
                            </div>
                            <div class="text-center py-4">
                                <i class="bi bi-calendar-plus display-6 text-muted"></i>
                                <p class="text-muted mt-2">Нет отпусков</p>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <button class="btn btn-sm btn-outline-primary w-100 add-vacation-btn" data-staff-id="${staff.id}">
                                <i class="bi bi-plus-circle me-1"></i>Добавить отпуск
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = emptyHtml;
    } else {
        let html = '';
        staffList.forEach(staff => {
            const staffVacations = vacations.filter(v => v.staffId === staff.id);
            
            let filteredVacations = staffVacations;
            if (filterMonth !== 'all') {
                filteredVacations = staffVacations.filter(v => {
                    const startMonth = new Date(v.start).getMonth() + 1;
                    const endMonth = new Date(v.end).getMonth() + 1;
                    return startMonth === parseInt(filterMonth) || endMonth === parseInt(filterMonth);
                });
            }
            
            const totalDays = staffVacations.reduce((sum, v) => {
                const days = Math.ceil((new Date(v.end) - new Date(v.start)) / (1000 * 60 * 60 * 24)) + 1;
                return sum + days;
            }, 0);
            
            const usedPercentage = Math.min(100, Math.round((totalDays / 28) * 100));
            const hasConflict = checkConflicts(staff.id, staffVacations, vacations);
            
            html += `
                <div class="col-md-4" data-staff-id="${staff.id}">
                    <div class="card shadow-sm h-100 ${hasConflict ? 'border-warning' : ''}">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <span class="badge me-2" style="background-color: var(--corporate-teal); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                                    ${staff.initials}
                                </span>
                                <div>
                                    <span class="fw-bold d-block">${staff.name}</span>
                                    <small class="text-muted">${staff.department}</small>
                                </div>
                            </div>
                            <span class="badge" style="background-color: var(--corporate-teal);">${totalDays} дн.</span>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span>Использовано</span>
                                    <span>${totalDays} / 28 дней</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar" style="width: ${usedPercentage}%; background-color: var(--corporate-teal);"></div>
                                </div>
                            </div>
                            
                            <div class="vacation-list" style="max-height: 200px; overflow-y: auto;">
                                ${filteredVacations.length > 0 ? filteredVacations.map(v => {
                                    const start = new Date(v.start).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                                    const end = new Date(v.end).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                                    const isConflict = checkSingleConflict(staff.id, v, vacations);
                                    return `
                                        <div class="vacation-item p-2 mb-2 rounded" 
                                             style="background-color: ${v.type === 'approved' ? 'rgba(184, 5, 45, 0.1)' : 'rgba(0, 140, 140, 0.1)'}; 
                                                    ${isConflict ? 'border-left: 3px solid #ffc107;' : ''}">
                                            <div class="d-flex justify-content-between">
                                                <span><i class="bi bi-calendar3 me-1"></i>${start} - ${end}</span>
                                                <span class="badge ${v.type === 'approved' ? 'bg-primary' : 'bg-success'}">${v.type === 'approved' ? 'Утв.' : 'План'}</span>
                                            </div>
                                            ${v.comment ? `<small class="text-muted">${v.comment}</small>` : ''}
                                            ${isConflict ? '<small class="text-warning d-block"><i class="bi bi-exclamation-triangle"></i> Пересечение</small>' : ''}
                                        </div>
                                    `;
                                }).join('') : '<p class="text-muted small text-center mb-0">Нет отпусков в этом месяце</p>'}
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <button class="btn btn-sm btn-outline-primary w-100 add-vacation-btn" data-staff-id="${staff.id}">
                                <i class="bi bi-plus-circle me-1"></i>Добавить отпуск
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    }
    
    document.querySelectorAll('.add-vacation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const staffId = this.getAttribute('data-staff-id');
            openVacationModal(staffId);
        });
    });
}

// Открытие модального окна для добавления отпуска
function openVacationModal(staffId = null) {
    const modalElement = document.getElementById('vacationModal');
    if (!modalElement) return;
    
    const modal = new bootstrap.Modal(modalElement);
    
    if (staffId) {
        document.getElementById('vacationStaff').value = staffId;
    }
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 14);
    
    document.getElementById('vacationStart').value = today.toISOString().split('T')[0];
    document.getElementById('vacationEnd').value = nextWeek.toISOString().split('T')[0];
    
    modal.show();
}

// Инициализация страницы отпусков
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('staffGrid')) return;
    
    renderVacationGrid();
    
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
            const searchTerm = document.getElementById('staffSearch')?.value || '';
            renderVacationGrid(month, searchTerm);
        });
    });
    
    const searchInput = document.getElementById('staffSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const activeMonth = document.querySelector('.month-filter.active')?.getAttribute('data-month') || 'all';
            renderVacationGrid(activeMonth, this.value);
        });
    }
    
    document.getElementById('clearVacationsBtn')?.addEventListener('click', clearAllVacations);
    
    document.getElementById('addVacationBtn')?.addEventListener('click', function() {
        openVacationModal();
    });
    
    document.getElementById('saveVacationBtn')?.addEventListener('click', function() {
        const staffId = document.getElementById('vacationStaff')?.value;
        const type = document.getElementById('vacationType')?.value;
        const start = document.getElementById('vacationStart')?.value;
        const end = document.getElementById('vacationEnd')?.value;
        const comment = document.getElementById('vacationComment')?.value || '';
        
        if (!staffId || !start || !end) {
            alert('Заполните все обязательные поля');
            return;
        }
        
        if (new Date(end) < new Date(start)) {
            alert('Дата окончания не может быть раньше даты начала');
            return;
        }
        
        const vacations = loadVacations();
        vacations.push({
            id: Date.now() + Math.random(),
            staffId: parseInt(staffId),
            type: type,
            start: start,
            end: end,
            comment: comment
        });
        
        saveVacations(vacations);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('vacationModal'));
        if (modal) {
            modal.hide();
        }
        
        document.getElementById('vacationForm')?.reset();
        showNotification('Отпуск добавлен', 'success');
    });
});