// Функция для экспорта всех данных (журнал + отпуска + дни рождения)
function exportAllData() {
    // Проверяем наличие функций загрузки данных
    const journalEntries = (typeof loadEntries === 'function' && typeof loadEntries() !== 'undefined') ? loadEntries() : 
                          (localStorage.getItem('dutyJournalEntries') ? JSON.parse(localStorage.getItem('dutyJournalEntries')) : []);
    
    const vacationData = (typeof loadVacations === 'function' && typeof loadVacations() !== 'undefined') ? loadVacations() : 
                        (localStorage.getItem('vacationSchedule') ? JSON.parse(localStorage.getItem('vacationSchedule')) : []);
    
    const birthdaysData = (typeof loadBirthdays === 'function' && typeof loadBirthdays() !== 'undefined') ? loadBirthdays() : 
                         (localStorage.getItem('birthdaysList') ? JSON.parse(localStorage.getItem('birthdaysList')) : []);
    
    if (journalEntries.length === 0 && vacationData.length === 0 && birthdaysData.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }

    const exportData = {
        exportDate: new Date().toISOString(),
        version: '3.0',
        data: {
            journal: journalEntries,
            vacations: vacationData,
            birthdays: birthdaysData
        },
        stats: {
            journalCount: journalEntries.length,
            vacationsCount: vacationData.length,
            birthdaysCount: birthdaysData.length
        }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Используем глобальную функцию showNotification если она есть
    if (typeof showNotification === 'function') {
        showNotification(`Экспортировано: ${journalEntries.length} записей журнала, ${vacationData.length} отпусков, ${birthdaysData.length} дней рождения`, 'success');
    } else {
        alert(`Экспортировано: ${journalEntries.length} записей журнала, ${vacationData.length} отпусков, ${birthdaysData.length} дней рождения`);
    }
}

// Функция для импорта всех данных
function importAllData(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.version === '3.0' && importedData.data) {
                // Новый формат с днями рождения
                
                // Импорт журнала
                if (importedData.data.journal && Array.isArray(importedData.data.journal)) {
                    const validJournalEntries = importedData.data.journal.filter(entry => {
                        return entry.id && entry.date && entry.startTime && entry.endTime && 
                               entry.eventText && entry.staffName && entry.eventType;
                    });
                    
                    // Пробуем использовать функцию saveEntries, если нет - сохраняем напрямую
                    if (typeof saveEntries === 'function') {
                        saveEntries(validJournalEntries);
                    } else {
                        localStorage.setItem('dutyJournalEntries', JSON.stringify(validJournalEntries));
                    }
                }
                
                // Импорт отпусков
                if (importedData.data.vacations && Array.isArray(importedData.data.vacations)) {
                    const validVacations = importedData.data.vacations.filter(v => {
                        return v.id && v.staffId && v.start && v.end && v.type;
                    });
                    
                    if (typeof saveVacations === 'function') {
                        saveVacations(validVacations);
                    } else {
                        localStorage.setItem('vacationSchedule', JSON.stringify(validVacations));
                    }
                }
                
                // Импорт дней рождения
                if (importedData.data.birthdays && Array.isArray(importedData.data.birthdays)) {
                    const validBirthdays = importedData.data.birthdays.filter(b => {
                        return b.id && b.name && b.birthDate;
                    });
                    
                    if (typeof saveBirthdays === 'function') {
                        saveBirthdays(validBirthdays);
                    } else {
                        localStorage.setItem('birthdaysList', JSON.stringify(validBirthdays));
                    }
                }
                
                // Обновляем отображение в зависимости от страницы
                if (document.getElementById('tableBody') && typeof renderTable === 'function') {
                    renderTable();
                } else if (document.getElementById('tableBody')) {
                    // Если нет функции renderTable, но есть таблица, перезагружаем страницу
                    location.reload();
                }
                
                if (document.getElementById('staffGrid') && typeof renderVacationGrid === 'function') {
                    renderVacationGrid();
                } else if (document.getElementById('staffGrid')) {
                    location.reload();
                }
                
                if (document.getElementById('birthdaysList') && typeof renderBirthdaysList === 'function') {
                    renderBirthdaysList();
                } else if (document.getElementById('birthdaysList')) {
                    location.reload();
                }
                
                const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                if (importModal) importModal.hide();
                
                if (typeof showNotification === 'function') {
                    showNotification('Данные успешно импортированы', 'success');
                } else {
                    alert('Данные успешно импортированы');
                }
                
            } else if (importedData.version === '2.0' && importedData.data) {
                // Старый формат (журнал + отпуска)
                
                if (importedData.data.journal && Array.isArray(importedData.data.journal)) {
                    const validJournalEntries = importedData.data.journal.filter(entry => {
                        return entry.id && entry.date && entry.startTime && entry.endTime && 
                               entry.eventText && entry.staffName && entry.eventType;
                    });
                    
                    if (typeof saveEntries === 'function') {
                        saveEntries(validJournalEntries);
                    } else {
                        localStorage.setItem('dutyJournalEntries', JSON.stringify(validJournalEntries));
                    }
                }
                
                if (importedData.data.vacations && Array.isArray(importedData.data.vacations)) {
                    const validVacations = importedData.data.vacations.filter(v => {
                        return v.id && v.staffId && v.start && v.end && v.type;
                    });
                    
                    if (typeof saveVacations === 'function') {
                        saveVacations(validVacations);
                    } else {
                        localStorage.setItem('vacationSchedule', JSON.stringify(validVacations));
                    }
                }
                
                // Обновляем отображение
                if (document.getElementById('tableBody') && typeof renderTable === 'function') {
                    renderTable();
                } else if (document.getElementById('tableBody')) {
                    location.reload();
                }
                
                if (document.getElementById('staffGrid') && typeof renderVacationGrid === 'function') {
                    renderVacationGrid();
                } else if (document.getElementById('staffGrid')) {
                    location.reload();
                }
                
                const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                if (importModal) importModal.hide();
                
                if (typeof showNotification === 'function') {
                    showNotification('Данные импортированы (формат 2.0)', 'success');
                } else {
                    alert('Данные импортированы (формат 2.0)');
                }
                
            } else if (importedData.entries) {
                // Самый старый формат (только журнал)
                const validEntries = importedData.entries.filter(entry => {
                    return entry.id && entry.date && entry.startTime && entry.endTime && 
                           entry.eventText && entry.staffName && entry.eventType;
                });
                
                if (typeof saveEntries === 'function') {
                    saveEntries(validEntries);
                } else {
                    localStorage.setItem('dutyJournalEntries', JSON.stringify(validEntries));
                }
                
                if (document.getElementById('tableBody') && typeof renderTable === 'function') {
                    renderTable();
                } else if (document.getElementById('tableBody')) {
                    location.reload();
                }
                
                const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                if (importModal) importModal.hide();
                
                if (typeof showNotification === 'function') {
                    showNotification(`Импортировано ${validEntries.length} записей журнала`, 'success');
                } else {
                    alert(`Импортировано ${validEntries.length} записей журнала`);
                }
            } else {
                throw new Error('Неизвестный формат файла');
            }
            
        } catch (error) {
            alert('Ошибка при импорте файла: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Функция для инициализации обработчиков
function initExportImportHandlers() {
    console.log('Инициализация обработчиков экспорта/импорта');
    
    // Удаляем старые обработчики, если они есть
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        // Удаляем все предыдущие обработчики
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        
        // Добавляем новый обработчик
        newExportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке экспорта');
            exportAllData();
        });
    }
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        const newImportBtn = importBtn.cloneNode(true);
        importBtn.parentNode.replaceChild(newImportBtn, importBtn);
        
        newImportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке импорта');
            const importModal = new bootstrap.Modal(document.getElementById('importModal'));
            importModal.show();
        });
    }
    
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
        const newConfirmBtn = confirmImportBtn.cloneNode(true);
        confirmImportBtn.parentNode.replaceChild(newConfirmBtn, confirmImportBtn);
        
        newConfirmBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('importFileInput');
            if (fileInput.files.length === 0) {
                alert('Пожалуйста, выберите файл для импорта');
                return;
            }
            importAllData(fileInput.files[0]);
        });
    }
    
    // Очищаем выбор файла при закрытии модального окна
    const importModal = document.getElementById('importModal');
    if (importModal) {
        importModal.addEventListener('hidden.bs.modal', function() {
            const fileInput = document.getElementById('importFileInput');
            if (fileInput) fileInput.value = '';
        });
    }
}

// Запускаем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Немного задерживаем инициализацию, чтобы другие скрипты успели загрузиться
    setTimeout(initExportImportHandlers, 100);
});

// Также запускаем после полной загрузки страницы
window.addEventListener('load', function() {
    initExportImportHandlers();
});

// Экспортируем функции в глобальную область
window.exportAllData = exportAllData;
window.importAllData = importAllData;