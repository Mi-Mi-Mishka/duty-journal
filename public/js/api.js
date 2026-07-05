// API модуль
const API_BASE = '';

async function apiGetJournal() {
    const response = await fetch(`${API_BASE}/api/journal`);
    if (!response.ok) throw new Error('Ошибка загрузки журнала');
    return response.json();
}

async function apiAddJournalEntry(entry) {
    const response = await fetch(`${API_BASE}/api/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Ошибка добавления');
    return response.json();
}

async function apiDeleteJournalEntry(id) {
    const response = await fetch(`${API_BASE}/api/journal/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Ошибка удаления');
    return response.json();
}

async function apiGetVacations() {
    const response = await fetch(`${API_BASE}/api/vacations`);
    if (!response.ok) throw new Error('Ошибка загрузки отпусков');
    return response.json();
}

async function apiAddVacation(vacation) {
    const response = await fetch(`${API_BASE}/api/vacations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vacation)
    });
    if (!response.ok) throw new Error('Ошибка добавления отпуска');
    return response.json();
}

async function apiDeleteVacation(id) {
    const response = await fetch(`${API_BASE}/api/vacations/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Ошибка удаления отпуска');
    return response.json();
}

async function apiGetBirthdays() {
    const response = await fetch(`${API_BASE}/api/birthdays`);
    if (!response.ok) throw new Error('Ошибка загрузки дней рождения');
    return response.json();
}

async function apiAddBirthday(birthday) {
    const response = await fetch(`${API_BASE}/api/birthdays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(birthday)
    });
    if (!response.ok) throw new Error('Ошибка добавления дня рождения');
    return response.json();
}

async function apiDeleteBirthday(id) {
    const response = await fetch(`${API_BASE}/api/birthdays/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Ошибка удаления дня рождения');
    return response.json();
}

async function apiGetUsers() {
    const response = await fetch(`${API_BASE}/api/users`);
    if (!response.ok) throw new Error('Ошибка загрузки пользователей');
    return response.json();
}

async function apiLogin(username, password) {
    const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Ошибка входа');
    return response.json();
}