// main.js - основной модуль
(function() {
    // Глобальная переменная для выбранного персонала
    window.currentStaffName = '';
    
    // Загрузка текущего дежурного
    async function loadCurrentShiftStaff() {
        try {
            const response = await fetch('/api/shift-staff');
            if (!response.ok) throw new Error('Ошибка загрузки');
            const staff = await response.json();
            
            // Получаем сохранённого дежурного или первого из списка
            const saved = localStorage.getItem('globalStaffName');
            if (saved && staff.find(s => s.name === saved)) {
                window.currentStaffName = saved;
            } else if (staff.length > 0) {
                window.currentStaffName = staff[0].name;
                localStorage.setItem('globalStaffName', window.currentStaffName);
            }
            
            updateStaffDisplay();
            
            // Сохраняем список для других страниц
            window.shiftStaffList = staff;
        } catch (error) {
            console.error('Ошибка загрузки сменного персонала:', error);
            window.currentStaffName = 'Ошибка загрузки';
            updateStaffDisplay();
        }
    }
    
    // Обновление отображения текущего дежурного
    function updateStaffDisplay() {
        const display = document.getElementById('currentStaffDisplay');
        const staffInput = document.getElementById('staffName');
        const inspectionStaffInput = document.getElementById('inspectionStaffName');
        
        const name = window.currentStaffName || 'Не выбран';
        if (display) display.textContent = name;
        if (staffInput) staffInput.value = window.currentStaffName;
        if (inspectionStaffInput) inspectionStaffInput.value = window.currentStaffName;
    }
    
    // Показ уведомления
    function showNotification(message, type = 'info') {
        const oldAlerts = document.querySelectorAll('.alert-fixed');
        oldAlerts.forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3 alert-fixed`;
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '400px';
        alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
    
    // Добавление меню пользователя в навбар
    function addUserMenu(user) {
        const userMenu = document.querySelector('.navbar-nav.ms-auto');
        if (!userMenu || document.getElementById('userMenuExists')) return;
        
        const roleNames = {
            'chief_engineer': '👷 Главный инженер',
            'power_engineer': '⚡ Главный энергетик',
            'lead_engineer': '🔧 Ведущий инженер',
            'master': '🛠️ Мастер',
            'operator': '👨‍💼 Инженер-энергетик'
        };
        
        const userDropdown = document.createElement('li');
        userDropdown.className = 'nav-item dropdown';
        userDropdown.id = 'userMenuExists';
        userDropdown.innerHTML = `
            <a class="nav-link dropdown-toggle text-white" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-person-circle me-1"></i>${roleNames[user.role] || user.fullName || user.username}
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Выйти</a></li>
            </ul>
        `;
        userMenu.prepend(userDropdown);
        
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.auth.logout();
        });
    }
    
    // Инициализация
    async function init() {
        console.log('main.js: инициализация');
        
        if (!window.auth.requireAuth()) return;
        
        const user = await window.auth.loadCurrentUser();
        if (!user) return;
        
        console.log('Пользователь:', user);
        
        addUserMenu(user);
        
        // Загружаем текущего дежурного
        await loadCurrentShiftStaff();
        
        console.log('main.js: инициализация завершена');
    }
    
    // Экспортируем функции
    window.updateStaffDisplay = updateStaffDisplay;
    window.showNotification = showNotification;
    window.loadCurrentShiftStaff = loadCurrentShiftStaff;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========== PWA УСТАНОВКА ==========
let deferredPrompt;
const installContainer = document.getElementById('installContainer');
const installBtn = document.getElementById('installBtn');

// Перехватываем событие beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Показываем кнопку
    if (installContainer) installContainer.style.display = 'block';
});

// Обработчик клика по кнопке
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Показываем диалог установки
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Результат установки: ${outcome}`);
        deferredPrompt = null;
        // Скрываем кнопку после установки
        if (installContainer) installContainer.style.display = 'none';
    });
}

// Если приложение уже установлено, скрываем кнопку
window.addEventListener('appinstalled', () => {
    console.log('✅ Приложение установлено');
    if (installContainer) installContainer.style.display = 'none';
    deferredPrompt = null;
});

// Показываем кнопку, если сайт открыт в браузере (не как PWA)
if (window.matchMedia('(display-mode: browser)').matches) {
    // Кнопка будет показана только при событии beforeinstallprompt
    // Это нормально
}
})();