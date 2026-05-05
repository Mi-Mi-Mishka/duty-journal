// vacation.js - модуль графика отпусков
(function() {
    // Список всех сотрудников (18 человек)
    const STAFF_LIST_FULL = [
    { id: 1, name: 'Кузнецов Андрей', initials: 'КА', department: 'Главный энергетик' },
    { id: 2, name: 'Прокопенко Андрей', initials: 'ПА', department: 'Ведущий инженер' },
    { id: 3, name: 'Колтунов Алексей', initials: 'КА', department: 'Мастер' },
    { id: 4, name: 'Мишурняев Дмитрий', initials: 'МД', department: 'Инженер-энергетик' },
    { id: 5, name: 'Попов Михаил', initials: 'ПМ', department: 'Инженер-энергетик' },
    { id: 6, name: 'Седько Александр', initials: 'СА', department: 'Инженер-энергетик' },
    { id: 7, name: 'Репкин Владимир', initials: 'РВ', department: 'Инженер-энергетик' },
    { id: 7, name: 'Атаманов Максим', initials: 'АМ', department: 'Инженер-энергетик' },
    { id: 8, name: 'Харченко Николай', initials: 'ХН', department: 'Слесарь-электрик' },
    { id: 9, name: 'Мукосеев Евгений', initials: 'МЕ', department: 'Слесарь-электрик' },
    { id: 10, name: 'Варнавский Иван', initials: 'ВИ', department: 'Слесарь-электрик' }
    ];
    
    const currentUser = window.auth?.user || null;
    const canEdit = currentUser?.role === 'master';
    
    let currentYear = 2026;
    let currentView = 'timeline';
    
    function getWordForm(n, one, two, five) {
        n = Math.abs(n) % 100;
        if (n >= 5 && n <= 20) return five;
        n %= 10;
        if (n === 1) return one;
        if (n >= 2 && n <= 4) return two;
        return five;
    }
    
    async function updateVacationStats() {
        const vacations = await apiGetVacations();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        
        const currentVacation = vacations.filter(v => {
            const start = new Date(v.start_date), end = new Date(v.end_date);
            return now >= start && now <= end;
        }).length;
        
        const monthlyPlan = vacations.filter(v => {
            const sm = new Date(v.start_date).getMonth() + 1;
            const em = new Date(v.end_date).getMonth() + 1;
            return sm === currentMonth || em === currentMonth;
        }).length;
        
        document.getElementById('currentVacation').textContent = currentVacation;
        document.getElementById('monthlyPlan').textContent = monthlyPlan;
        document.getElementById('totalStaff').textContent = STAFF_LIST_FULL.length;
    }
    
    async function renderTimeline() {
        const vacations = await apiGetVacations();
        const tbody = document.getElementById('timelineBody');
        if (!tbody) return;
        
        document.getElementById('currentYearDisplay').textContent = currentYear;
        
        let html = '';
        
        for (const staff of STAFF_LIST_FULL) {
            const staffVacations = vacations.filter(v => v.staff_id === staff.id);
            const monthCells = [];
            
            for (let month = 0; month < 12; month++) {
                const monthVacations = staffVacations.filter(v => {
                    const start = new Date(v.start_date);
                    const end = new Date(v.end_date);
                    const monthStart = new Date(currentYear, month, 1);
                    const monthEnd = new Date(currentYear, month + 1, 0);
                    return start <= monthEnd && end >= monthStart;
                });
                
                if (monthVacations.length === 0) {
                    monthCells.push('<td class="text-center text-muted p-0" style="height: 45px;"></td>');
                } else {
                    const colors = monthVacations.map(v => v.type === 'approved' ? '#dc3545' : '#0d6efd').join(',');
                    const titles = monthVacations.map(v => `${v.type === 'approved' ? '✓ Утверждён' : '○ Запланирован'}: ${v.start_date} - ${v.end_date}${v.comment ? ' (' + v.comment + ')' : ''}`).join('\n');
                    
                    monthCells.push(`
                        <td class="p-0 position-relative timeline-cell" style="height: 45px; cursor: pointer;" 
                            data-year="${currentYear}" data-month="${month}" data-staff="${staff.id}" title="${titles}">
                            <div class="position-absolute top-0 start-0 w-100 h-100" style="background: linear-gradient(90deg, ${colors}); opacity: 0.7;"></div>
                        </td>
                    `);
                }
            }
            
            html += `<tr>
                <td style="position: sticky; left: 0; background: white; font-weight: 500;">
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge" style="background-color: var(--corporate-teal); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${staff.initials}</span>
                        <div><div>${staff.name}</div><small class="text-muted">${staff.department}</small></div>
                    </div>
                </td>
                ${monthCells.join('')}
            </tr>`;
        }
        
        tbody.innerHTML = html;
        
        document.querySelectorAll('.timeline-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const year = parseInt(cell.dataset.year);
                const month = parseInt(cell.dataset.month);
                showCalendarForMonth(year, month);
            });
        });
    }
    
    async function renderCalendar(year, month) {
        const vacations = await apiGetVacations();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let startOffset = firstDay.getDay();
        startOffset = startOffset === 0 ? 6 : startOffset - 1;
        
        let html = '<div class="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">';
        const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        weekDays.forEach(day => {
            html += `<div class="text-center fw-bold text-muted small py-2">${day}</div>`;
        });
        
        for (let i = 0; i < startOffset; i++) {
            html += '<div></div>';
        }
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentDate = new Date(year, month, day);
            const dayVacations = vacations.filter(v => {
                const start = new Date(v.start_date);
                const end = new Date(v.end_date);
                return currentDate >= start && currentDate <= end;
            });
            
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
            
            html += `
                <div class="border rounded p-2 calendar-day ${isToday ? 'border-warning bg-warning bg-opacity-10' : ''}" style="min-height: 100px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold ${isToday ? 'text-warning' : ''} ${isWeekend ? 'text-danger' : ''}">${day}</span>
                        ${dayVacations.length > 0 ? `<span class="badge bg-primary rounded-pill">${dayVacations.length}</span>` : ''}
                    </div>
                    <div class="mt-1">
                        ${dayVacations.slice(0, 4).map(v => {
                            const staff = STAFF_LIST_FULL.find(s => s.id === v.staff_id);
                            return `<div class="vacation-badge badge ${v.type === 'approved' ? 'bg-danger' : 'bg-info'} text-white mb-1 d-block" 
                                        style="font-size: 10px; cursor: pointer;"
                                        data-staff="${v.staff_id}" data-start="${v.start_date}" data-end="${v.end_date}" data-type="${v.type}" data-comment="${v.comment || ''}">
                                        <i class="bi bi-person-circle me-1"></i>${staff?.initials || v.staff_id}
                                    </div>`;
                        }).join('')}
                        ${dayVacations.length > 4 ? `<span class="text-muted" style="font-size: 10px;">+${dayVacations.length - 4}</span>` : ''}
                    </div>
                </div>
            `;
        }
        
        const totalCells = startOffset + lastDay.getDate();
        const remainingCells = 42 - totalCells;
        for (let i = 0; i < remainingCells; i++) {
            html += '<div></div>';
        }
        
        html += '</div>';
        document.getElementById('calendarGrid').innerHTML = html;
        
        document.querySelectorAll('.vacation-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const staffId = parseInt(badge.dataset.staff);
                const staff = STAFF_LIST_FULL.find(s => s.id === staffId);
                const start = badge.dataset.start;
                const end = badge.dataset.end;
                const type = badge.dataset.type;
                const comment = badge.dataset.comment;
                
                const startDate = new Date(start).toLocaleDateString('ru-RU');
                const endDate = new Date(end).toLocaleDateString('ru-RU');
                const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
                
                document.getElementById('vacationDetailBody').innerHTML = `
                    <p><strong>${staff?.name}</strong></p>
                    <p><small class="text-muted">${staff?.department}</small></p>
                    <hr>
                    <p><i class="bi bi-calendar3 me-2"></i>${startDate} - ${endDate}</p>
                    <p><i class="bi bi-clock me-2"></i>${days} ${getWordForm(days, 'день', 'дня', 'дней')}</p>
                    <p><span class="badge ${type === 'approved' ? 'bg-danger' : 'bg-info'}">${type === 'approved' ? 'Утверждённый' : 'Запланированный'}</span></p>
                    ${comment ? `<p><i class="bi bi-chat me-2"></i>${comment}</p>` : ''}
                `;
                new bootstrap.Modal(document.getElementById('vacationDetailModal')).show();
            });
        });
    }
    
    function showCalendarForMonth(year, month) {
        currentYear = year;
        currentView = 'calendar';
        document.getElementById('timelineView').style.display = 'none';
        document.getElementById('calendarView').style.display = 'block';
        document.getElementById('calendarMonth').value = month;
        document.getElementById('calendarYear').value = year;
        renderCalendar(year, month);
    }
    
    function showTimeline() {
        currentView = 'timeline';
        document.getElementById('timelineView').style.display = 'block';
        document.getElementById('calendarView').style.display = 'none';
        renderTimeline();
    }
    
    async function clearAllVacations() {
        if (!canEdit) {
            alert('У вас нет прав на удаление отпусков');
            return;
        }
        if (confirm('Вы уверены, что хотите удалить ВСЕ отпуска? Это действие нельзя отменить.')) {
            const vacations = await apiGetVacations();
            for (let v of vacations) {
                await apiDeleteVacation(v.id);
            }
            await renderTimeline();
            await updateVacationStats();
            window.showNotification('Все отпуска удалены', 'success');
        }
    }
    
    function openVacationModal(staffId = null) {
        if (!canEdit) {
            alert('У вас нет прав на добавление отпусков');
            return;
        }
        const modal = new bootstrap.Modal(document.getElementById('vacationModal'));
        if (staffId) document.getElementById('vacationStaff').value = staffId;
        
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 14);
        
        document.getElementById('vacationStart').value = today.toISOString().split('T')[0];
        document.getElementById('vacationEnd').value = nextWeek.toISOString().split('T')[0];
        modal.show();
    }
    
    async function saveVacation() {
        if (!canEdit) {
            alert('У вас нет прав на добавление отпусков');
            return;
        }
        const staffId = document.getElementById('vacationStaff').value;
        const type = document.getElementById('vacationType').value;
        const start = document.getElementById('vacationStart').value;
        const end = document.getElementById('vacationEnd').value;
        const comment = document.getElementById('vacationComment').value;
        
        if (!staffId || !start || !end) {
            alert('Заполните все обязательные поля');
            return;
        }
        
        if (new Date(end) < new Date(start)) {
            alert('Дата окончания не может быть раньше даты начала');
            return;
        }
        
        await apiAddVacation({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            staffId: parseInt(staffId),
            type: type,
            start: start,
            end: end,
            comment: comment || null
        });
        
        await renderTimeline();
        await updateVacationStats();
        bootstrap.Modal.getInstance(document.getElementById('vacationModal')).hide();
        document.getElementById('vacationForm').reset();
        window.showNotification('Отпуск добавлен', 'success');
    }
    
    async function loadStaffSelect() {
        const select = document.getElementById('vacationStaff');
        if (select) {
            select.innerHTML = '<option value="">Выберите сотрудника</option>' +
                STAFF_LIST_FULL.map(s => `<option value="${s.id}">${s.name} (${s.department})</option>`).join('');
        }
    }
    
function hideEditButtons() {
    // Актуально получаем пользователя каждый раз
    const currentUser = window.auth?.user;
    const canEdit = currentUser?.role === 'master';
    
    const clearBtn = document.getElementById('clearVacationsBtn');
    const addBtn = document.getElementById('addVacationBtn');
    
    if (!canEdit) {
        if (clearBtn) clearBtn.style.display = 'none';
        if (addBtn) addBtn.style.display = 'none';
    } else {
        if (clearBtn) clearBtn.style.display = 'block';
        if (addBtn) addBtn.style.display = 'block';
    }
}
    
    document.addEventListener('DOMContentLoaded', async () => {
        if (!document.getElementById('timelineBody')) return;
        
        await loadStaffSelect();
        await renderTimeline();
        await updateVacationStats();
        hideEditButtons();
        
        document.getElementById('prevYearBtn')?.addEventListener('click', async () => {
            currentYear--;
            if (currentView === 'timeline') {
                await renderTimeline();
                await updateVacationStats();
            } else {
                const month = parseInt(document.getElementById('calendarMonth').value);
                await renderCalendar(currentYear, month);
            }
        });
        
        document.getElementById('nextYearBtn')?.addEventListener('click', async () => {
            currentYear++;
            if (currentView === 'timeline') {
                await renderTimeline();
                await updateVacationStats();
            } else {
                const month = parseInt(document.getElementById('calendarMonth').value);
                await renderCalendar(currentYear, month);
            }
        });
        
        document.getElementById('viewTimelineBtn')?.addEventListener('click', showTimeline);
        document.getElementById('viewCalendarBtn')?.addEventListener('click', () => {
            const now = new Date();
            showCalendarForMonth(currentYear, now.getMonth());
        });
        document.getElementById('backToTimelineBtn')?.addEventListener('click', showTimeline);
        
        document.getElementById('calendarMonth')?.addEventListener('change', () => {
            const month = parseInt(document.getElementById('calendarMonth').value);
            renderCalendar(currentYear, month);
        });
        document.getElementById('calendarYear')?.addEventListener('change', () => {
            currentYear = parseInt(document.getElementById('calendarYear').value);
            const month = parseInt(document.getElementById('calendarMonth').value);
            renderCalendar(currentYear, month);
        });
        document.getElementById('todayBtn')?.addEventListener('click', () => {
            const today = new Date();
            currentYear = today.getFullYear();
            showCalendarForMonth(currentYear, today.getMonth());
        });
        
        document.querySelectorAll('.month-header').forEach(header => {
            header.addEventListener('click', () => {
                const month = parseInt(header.dataset.month);
                showCalendarForMonth(currentYear, month);
            });
        });
        
        if (canEdit) {
            document.getElementById('clearVacationsBtn')?.addEventListener('click', clearAllVacations);
            document.getElementById('addVacationBtn')?.addEventListener('click', () => openVacationModal());
            document.getElementById('saveVacationBtn')?.addEventListener('click', saveVacation);
        }
        window.addEventListener('pageshow', function() {
    // При возврате на страницу (например, из истории) обновляем права
    hideEditButtons();
    // Также можно обновить статистику и таблицу, если нужно
    updateVacationStats();
    renderTimeline();
});
    });
})();