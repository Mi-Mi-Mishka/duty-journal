// schemas.js - страница со схемами оборудования

const SCHEMAS_DATA = [
    {
        id: 1,
        title: 'Электрическая схема РУ-04кВ',
        description: 'Схема распределительного устройства 4 кВ',
        icon: 'bi bi-bolt',
        file: 'ru-04kv.pdf',
        badge: 'Электро'
    },
    {
        id: 2,
        title: 'Электрическая схема РУ-10кВ',
        description: 'Схема распределительного устройства 10 кВ',
        icon: 'bi bi-bolt',
        file: 'ru-10kv.pdf',
        badge: 'Электро'
    },
    {
        id: 3,
        title: 'Схема газоснабжения',
        description: 'Схема газопровода и газового оборудования',
        icon: 'bi bi-fuel-pump',
        file: 'gas-scheme.pdf',
        badge: 'Газ'
    }
    // Добавьте сюда свои схемы
];

document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('schemasGrid');
    
    if (SCHEMAS_DATA.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-file-pdf fs-1 text-muted"></i>
                <p class="text-muted mt-3">Нет добавленных схем</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = SCHEMAS_DATA.map(schema => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="schema-card card h-100" onclick="openSchema('${schema.file}', '${schema.title}')">
                <div class="card-body">
                    <div class="schema-icon">
                        <i class="${schema.icon}"></i>
                    </div>
                    <div class="schema-title">${schema.title}</div>
                    <div class="schema-desc">${schema.description}</div>
                    <div class="mt-2">
                        <span class="schema-badge bg-primary text-white">${schema.badge}</span>
                        <span class="schema-badge bg-light text-muted">PDF</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
});

function openSchema(file, title) {
    const modal = new bootstrap.Modal(document.getElementById('schemaModal'));
    document.getElementById('schemaModalTitle').textContent = title;
    document.getElementById('schemaIframe').src = `/pdf/${file}`;
    modal.show();
}

document.getElementById('schemaModal').addEventListener('hidden.bs.modal', function() {
    document.getElementById('schemaIframe').src = '';
});