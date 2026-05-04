// auth.js - модуль авторизации
(function() {
    // Сохраняем оригинальный fetch
    const originalFetch = window.fetch;
    
    // Перехватываем fetch запросы и добавляем токен
    window.fetch = function(...args) {
        const token = localStorage.getItem('token');
        if (token && args[0].includes('/api/')) {
            const options = args[1] || {};
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${token}`;
            args[1] = options;
        }
        return originalFetch.apply(this, args);
    };
    
    // Глобальный объект для авторизации
    window.auth = {
        user: null,
        token: localStorage.getItem('token'),
        
        async loadCurrentUser() {
            try {
                const response = await fetch('/api/me');
                if (response.ok) {
                    this.user = await response.json();
                    console.log('auth: пользователь загружен', this.user);
                    return this.user;
                } else {
                    console.log('auth: токен недействителен');
                    this.logout();
                    return null;
                }
            } catch (error) {
                console.error('auth: ошибка загрузки пользователя', error);
                return null;
            }
        },
        
        logout() {
            localStorage.removeItem('token');
            this.user = null;
            window.location.href = '/login.html';
        },
        
        requireAuth() {
            if (!localStorage.getItem('token')) {
                window.location.href = '/login.html';
                return false;
            }
            return true;
        },
        
        getDisplayName() {
            if (this.user?.role === 'operator' && this.user?.shiftStaffName) {
                return this.user.shiftStaffName;
            }
            return this.user?.fullName || this.user?.username || 'Пользователь';
        }
    };
    
    // Загружаем пользователя при загрузке страницы
    window.auth.loadCurrentUser();
    
    // Делаем функции глобальными для обратной совместимости
    window.loadCurrentUser = () => window.auth.loadCurrentUser();
    window.logout = () => window.auth.logout();
    window.requireAuth = () => window.auth.requireAuth();
})();