// Константы для журнала
const STORAGE_KEY = 'dutyJournalEntries';

// Типы событий
const EVENT_TYPES = {
    INSPECTION: 'inspection',     // Обход и осмотр оборудования
    EMERGENCY: 'emergency',        // Аварийное событие
    OTHER: 'other',                 // Прочие события
    SHIFT: 'shift'                   // Смена дежурного
};

// Загрузка записей
function loadEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Сохранение записей
function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    renderTable();
}

// Функция для получения класса и текста типа события
function getEventTypeBadge(type) {
    switch(type) {
        case EVENT_TYPES.INSPECTION:
            return '<span class="event-type-badge event-type-inspection">Обход</span>';
        case EVENT_TYPES.EMERGENCY:
            return '<span class="event-type-badge event-type-emergency">Авария</span>';
        case EVENT_TYPES.SHIFT:
            return '<span class="event-type-badge event-type-shift">Смена</span>';
        case EVENT_TYPES.OTHER:
        default:
            return '<span class="event-type-badge event-type-other">Прочее</span>';
    }
}

// Форматирование показаний обхода
function formatInspectionReadings(readings) {
    let result = [];
    
    if (readings.gasLow || readings.gasMedium || readings.gasHigh) {
        let gasStr = 'Давление газа:';
        if (readings.gasLow) gasStr += ` низкое ${readings.gasLow} кПа,`;
        if (readings.gasMedium) gasStr += ` среднее ${readings.gasMedium} кПа,`;
        if (readings.gasHigh) gasStr += ` высокое ${readings.gasHigh} кПа`;
        result.push(gasStr.replace(/,$/, ''));
    }
    
    if (readings.dguTemp) {
        result.push(`Температура ОЖ ДГУ: ${readings.dguTemp}°C`);
    }
    
    let lvsrReadings = [];
    if (readings.lvsr1) lvsrReadings.push(`LVSR1 ${readings.lvsr1}°C`);
    if (readings.lvsr2) lvsrReadings.push(`LVSR2 ${readings.lvsr2}°C`);
    if (readings.lvsr3) lvsrReadings.push(`LVSR3 ${readings.lvsr3}°C`);
    if (readings.lvsr4) lvsrReadings.push(`LVSR4 ${readings.lvsr4}°C`);
    if (readings.lvsr5) lvsrReadings.push(`LVSR5 ${readings.lvsr5}°C`);
    if (lvsrReadings.length > 0) {
        result.push(`Температуры LVSR: ${lvsrReadings.join(', ')}`);
    }
    
    let tempReadings = [];
    if (readings.otTemp) tempReadings.push(`ОТ ${readings.otTemp}°C`);
    if (readings.gvsTemp) tempReadings.push(`ГВС ${readings.gvsTemp}°C`);
    if (tempReadings.length > 0) {
        result.push(`Температуры: ${tempReadings.join(', ')}`);
    }
    
    let gvnReadings = [];
    if (readings.gvn2a) gvnReadings.push(`ГВН №2а ${readings.gvn2a}`);
    if (readings.gvn2b) gvnReadings.push(`ГВН №2б ${readings.gvn2b}`);
    if (readings.gvn3) gvnReadings.push(`ГВН №3 ${readings.gvn3}`);
    if (readings.gvn4) gvnReadings.push(`ГВН №4 ${readings.gvn4}`);
    if (readings.gvn5) gvnReadings.push(`ГВН №5 ${readings.gvn5}`);
    if (readings.gvn6) gvnReadings.push(`ГВН №6 ${readings.gvn6}`);
    if (gvnReadings.length > 0) {
        result.push(`Горелки: ${gvnReadings.join(', ')}`);
    }
    
    return result.join('; ');
}

// Склонение слова "запись"
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

// Отображение таблицы
function renderTable(newEntryId = null) {
    const entries = loadEntries();
    const tbody = document.getElementById('tableBody');
    const recordsCount = document.getElementById('recordsCount');
    
    if (!tbody) return;
    
    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-1 d-block mb-3"></i>
                    Нет записей. Нажмите "Добавить запись", чтобы создать первую запись!
                </td>
            </tr>
        `;
        if (recordsCount) recordsCount.textContent = '0 записей';
        return;
    }

    // Сортируем так, чтобы новые записи были вверху
    const sortedEntries = [...entries].sort((a, b) => {
        if (a.timestamp && b.timestamp) {
            return b.timestamp - a.timestamp;
        }
        const dateTimeA = a.date.split('.').reverse().join('') + a.startTime.replace(':', '');
        const dateTimeB = b.date.split('.').reverse().join('') + b.startTime.replace(':', '');
        return dateTimeB.localeCompare(dateTimeA);
    });
    
    tbody.innerHTML = sortedEntries.map((entry, index) => {
        const isNew = entry.id === newEntryId;
        const entryNumber = index + 1;
        const eventTypeBadge = getEventTypeBadge(entry.eventType || EVENT_TYPES.OTHER);
        
        let description = entry.eventText;
        if (entry.eventType === EVENT_TYPES.INSPECTION && entry.inspectionReadings) {
            description = formatInspectionReadings(entry.inspectionReadings);
        }
        
        return `
        <tr class="${isNew ? 'new-entry' : ''}">
            <td class="text-center"><span class="entry-number">#${entryNumber}</span></td>
            <td>${entry.date}</td>
            <td>${entry.startTime} - ${entry.endTime}</td>
            <td>${eventTypeBadge}</td>
            <td>${description}</td>
            <td>${entry.staffName}</td>
            <td class="text-center">
                <i class="bi bi-trash delete-btn" data-id="${entry.id}" title="Удалить запись"></i>
            </td>
        </tr>
    `}).join('');

    if (recordsCount) {
        recordsCount.textContent = `${entries.length} ${getWordForm(entries.length, 'запись', 'записи', 'записей')}`;
    }

    // Добавляем обработчики для удаления
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteEntry(id);
        });
    });
}

// Удаление записи
function deleteEntry(id) {
    if (confirm('Удалить эту запись?')) {
        const entries = loadEntries();
        const newEntries = entries.filter(e => e.id !== id);
        saveEntries(newEntries);
        showNotification('Запись удалена', 'danger');
    }
}

// Добавление записи (прочие события)
function addOtherEntry(event) {
    event.preventDefault();

    if (!currentStaffName) {
        alert('Пожалуйста, сначала выберите ФИО персонала из списка');
        return;
    }

    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const eventText = document.getElementById('eventText').value.trim();

    if (!startTime || !endTime || !eventText) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentDate = `${day}.${month}.${year}`;

    const newEntry = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        date: currentDate,
        startTime: startTime,
        endTime: endTime,
        eventText: eventText,
        staffName: currentStaffName,
        eventType: EVENT_TYPES.OTHER,
        timestamp: Date.now()
    };

    const entries = loadEntries();
    entries.push(newEntry);
    saveEntries(entries);

    document.getElementById('addForm').reset();
    
    renderTable(newEntry.id);

    const addModal = bootstrap.Modal.getInstance(document.getElementById('addEntryModal'));
    if (addModal) {
        addModal.hide();
    }

    showNotification('Запись успешно добавлена!', 'success');
}

// Добавление записи обхода
function addInspectionEntry(event) {
    event.preventDefault();

    if (!currentStaffName) {
        alert('Пожалуйста, сначала выберите ФИО персонала из списка');
        return;
    }

    const startTime = document.getElementById('inspectionStartTime').value;
    const endTime = document.getElementById('inspectionEndTime').value;

    if (!startTime || !endTime) {
        alert('Пожалуйста, укажите время начала и окончания осмотра');
        return;
    }

    const inspectionReadings = {
        gasLow: document.getElementById('gasLow').value,
        gasMedium: document.getElementById('gasMedium').value,
        gasHigh: document.getElementById('gasHigh').value,
        dguTemp: document.getElementById('dguTemp').value,
        lvsr1: document.getElementById('lvsr1').value,
        lvsr2: document.getElementById('lvsr2').value,
        lvsr3: document.getElementById('lvsr3').value,
        lvsr4: document.getElementById('lvsr4').value,
        lvsr5: document.getElementById('lvsr5').value,
        otTemp: document.getElementById('otTemp').value,
        gvsTemp: document.getElementById('gvsTemp').value,
        gvn2a: document.getElementById('gvn2a').value,
        gvn2b: document.getElementById('gvn2b').value,
        gvn3: document.getElementById('gvn3').value,
        gvn4: document.getElementById('gvn4').value,
        gvn5: document.getElementById('gvn5').value,
        gvn6: document.getElementById('gvn6').value
    };

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentDate = `${day}.${month}.${year}`;

    const newEntry = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        date: currentDate,
        startTime: startTime,
        endTime: endTime,
        eventText: 'Осмотр оборудования',
        staffName: currentStaffName,
        eventType: EVENT_TYPES.INSPECTION,
        inspectionReadings: inspectionReadings,
        timestamp: Date.now()
    };

    const entries = loadEntries();
    entries.push(newEntry);
    saveEntries(entries);

    document.getElementById('inspectionForm').reset();
    
    renderTable(newEntry.id);

    const inspectionModal = bootstrap.Modal.getInstance(document.getElementById('inspectionModal'));
    if (inspectionModal) {
        inspectionModal.hide();
    }

    showNotification('Показания осмотра сохранены!', 'success');
}

// Функция для создания записи о смене
function createShiftEntry() {
    if (!currentStaffName) {
        alert('Пожалуйста, сначала выберите ФИО текущего дежурного из списка');
        return;
    }

    const incomingStaff = document.getElementById('incomingStaffSelect').value;
    const shiftTime = document.getElementById('shiftTime').value;

    if (!incomingStaff) {
        alert('Пожалуйста, выберите персонал, принимающий смену');
        return;
    }

    if (!shiftTime) {
        alert('Пожалуйста, укажите время смены');
        return;
    }

    if (incomingStaff === currentStaffName) {
        alert('Принимающий персонал не может совпадать с текущим дежурным');
        return;
    }

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentDate = `${day}.${month}.${year}`;

    const eventText = `${currentStaffName} сдал смену. ${incomingStaff} принял смену`;

    const newEntry = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        date: currentDate,
        startTime: shiftTime,
        endTime: shiftTime,
        eventText: eventText,
        staffName: currentStaffName + ' → ' + incomingStaff,
        eventType: EVENT_TYPES.SHIFT,
        shiftFrom: currentStaffName,
        shiftTo: incomingStaff,
        timestamp: Date.now()
    };

    const entries = loadEntries();
    entries.push(newEntry);
    saveEntries(entries);

    // Обновляем текущего дежурного на принявшего смену
    saveStaffName(incomingStaff);

    renderTable(newEntry.id);

    const shiftModal = bootstrap.Modal.getInstance(document.getElementById('shiftModal'));
    if (shiftModal) {
        shiftModal.hide();
    }
    
    document.getElementById('incomingStaffSelect').value = '';
    document.getElementById('shiftTime').value = '';

    showNotification('Смена успешно передана', 'success');
}

// Обновление отображения текущего персонала в модальном окне смены
function updateShiftModalStaff() {
    const shiftStaffDisplay = document.getElementById('currentShiftStaff');
    if (shiftStaffDisplay) {
        shiftStaffDisplay.textContent = currentStaffName || 'Не выбран';
    }
}

// Вставка шаблона
window.insertTemplate = function(templateNumber) {
    const eventTextArea = document.getElementById('eventText');
    if (!eventTextArea) return;
    
    let templateText = '';
    switch(templateNumber) {
        case 1:
            templateText = 'Проведены плановые регламентные работы. Оборудование работает в штатном режиме.';
            break;
        case 2:
            templateText = 'Выявлены замечания в работе оборудования. Требуется наблюдение.';
            break;
        case 3:
            templateText = 'Смена передана. Оборудование работает в штатном режиме. Замечаний нет.';
            break;
        default:
            return;
    }
    
    eventTextArea.value = templateText;
    showNotification('Шаблон вставлен', 'info');
};

// Показать модальное окно обхода
function showInspectionModal() {
    if (!currentStaffName) {
        alert('Пожалуйста, сначала выберите ФИО персонала из списка');
        return;
    }
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    document.getElementById('inspectionStartTime').value = currentTime;
    document.getElementById('inspectionEndTime').value = currentTime;
    
    const inspectionModal = new bootstrap.Modal(document.getElementById('inspectionModal'));
    inspectionModal.show();
}

// Инициализация страницы журнала
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('tableBody')) return;
    
    // Обновляем существующие записи
    const entries = loadEntries();
    if (entries.length > 0) {
        let updated = false;
        const updatedEntries = entries.map(entry => {
            if (!entry.eventType) {
                updated = true;
                entry.eventType = EVENT_TYPES.OTHER;
            }
            if (!entry.timestamp) {
                updated = true;
                const dateParts = entry.date.split('.');
                if (dateParts.length === 3) {
                    const dateObj = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
                    let timestamp = dateObj.getTime();
                    if (entry.startTime) {
                        const timeParts = entry.startTime.split(':');
                        timestamp += timeParts[0] * 3600000 + timeParts[1] * 60000;
                    }
                    entry.timestamp = timestamp;
                } else {
                    entry.timestamp = Date.now() - (entries.length * 86400000);
                }
            }
            if (!entry.id) {
                updated = true;
                entry.id = Date.now() + Math.random().toString(36).substr(2, 9);
            }
            return entry;
        });
        if (updated) {
            saveEntries(updatedEntries);
        }
    }

    renderTable();

    // Обработчики событий
    document.getElementById('addForm')?.addEventListener('submit', addOtherEntry);
    document.getElementById('inspectionForm')?.addEventListener('submit', addInspectionEntry);
    document.getElementById('confirmShiftBtn')?.addEventListener('click', createShiftEntry);
    
    document.getElementById('addInspectionEvent')?.addEventListener('click', function(e) {
        e.preventDefault();
        showInspectionModal();
    });

    document.getElementById('addEmergencyEvent')?.addEventListener('click', function(e) {
        e.preventDefault();
        const comingSoonModal = new bootstrap.Modal(document.getElementById('comingSoonModal'));
        comingSoonModal.show();
    });

    // При открытии модального окна смены
    document.getElementById('shiftModal')?.addEventListener('show.bs.modal', function() {
        if (!currentStaffName) {
            alert('Сначала выберите ФИО текущего дежурного');
            const modal = bootstrap.Modal.getInstance(document.getElementById('shiftModal'));
            modal.hide();
            return;
        }
        
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        document.getElementById('shiftTime').value = currentTime;
        updateShiftModalStaff();
    });

    // При открытии модального окна прочих событий
    document.getElementById('addEntryModal')?.addEventListener('show.bs.modal', function(event) {
        if (!currentStaffName) {
            event.preventDefault();
            alert('Сначала выберите ФИО персонала');
            return false;
        }
        document.getElementById('staffName').value = currentStaffName;
    });

    // При открытии модального окна обхода
    document.getElementById('inspectionModal')?.addEventListener('show.bs.modal', function(event) {
        if (!currentStaffName) {
            event.preventDefault();
            alert('Сначала выберите ФИО персонала');
            return false;
        }
        document.getElementById('inspectionStaffName').value = currentStaffName;
    });
});