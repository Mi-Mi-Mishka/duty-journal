// birthdays.js - модуль дней рождения
(function () {
  const currentUser = window.auth?.user || null;
  const canEdit = currentUser?.role === "master";

  function getAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear() + 1;
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
      age--;
    return age;
  }

  function getDaysUntilBirthday(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    const nextBirthday = new Date(
      today.getFullYear(),
      birth.getMonth(),
      birth.getDate(),
    );
    if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
    return Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
  }

  function getWordForm(n, one, two, five) {
    n = Math.abs(n) % 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
  }

  function sortBirthdaysByDate(birthdays) {
    return [...birthdays].sort((a, b) => {
      const da = new Date(a.birth_date),
        db = new Date(b.birth_date);
      if (da.getMonth() !== db.getMonth()) return da.getMonth() - db.getMonth();
      return da.getDate() - db.getDate();
    });
  }

  function findNextBirthday(birthdays) {
    if (!birthdays.length) return null;
    let next = null,
      minDays = Infinity;
    birthdays.forEach((b) => {
      const days = getDaysUntilBirthday(b.birth_date);
      if (days < minDays) {
        minDays = days;
        next = { ...b, daysUntil: days };
      }
    });
    return next;
  }

  async function renderBirthdaysList(filterMonth = "all") {
    const birthdays = await apiGetBirthdays();
    const list = document.getElementById("birthdaysList");
    if (!list) return;

    const next = findNextBirthday(birthdays);
    const info = document.getElementById("nextBirthdayInfo");
    if (info) {
      if (!next) {
        info.innerHTML = '<span class="fw-bold fs-5">Нет данных</span>';
      } else {
        const d = new Date(next.birth_date);
        const months = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];
        info.innerHTML = `<span class="fw-bold fs-5">${next.name}</span><span class="badge bg-primary">${d.getDate()} ${months[d.getMonth()]}</span><span class="badge bg-warning text-dark">через ${next.daysUntil} ${getWordForm(next.daysUntil, "день", "дня", "дней")}</span>`;
      }
    }

    if (birthdays.length === 0) {
      list.innerHTML =
        '<div class="col-12"><div class="text-center py-5"><i class="bi bi-gift fs-1 text-muted"></i><p class="text-muted mt-3">Нет добавленных сотрудников.</p></div></div>';
      return;
    }

    const sorted = sortBirthdaysByDate(birthdays);
    let filtered = sorted;
    if (filterMonth !== "all") {
      filtered = sorted.filter(
        (b) => new Date(b.birth_date).getMonth() + 1 === parseInt(filterMonth),
      );
    }

    if (filtered.length === 0) {
      list.innerHTML =
        '<div class="col-12"><div class="text-center py-5"><i class="bi bi-calendar-x fs-1 text-muted"></i><p class="text-muted mt-3">Нет дней рождения в выбранном месяце.</p></div></div>';
      return;
    }

    const monthNames = [
      "Января",
      "Февраля",
      "Марта",
      "Апреля",
      "Мая",
      "Июня",
      "Июля",
      "Августа",
      "Сентября",
      "Октября",
      "Ноября",
      "Декабря",
    ];
    let currentMonth = -1,
      html = "";

    filtered.forEach((b) => {
      const d = new Date(b.birth_date);
      const month = d.getMonth(),
        day = d.getDate();
      if (filterMonth === "all" && month !== currentMonth) {
        currentMonth = month;
        html += `<div class="col-12 mb-3 mt-4 ${currentMonth === 0 ? "mt-0" : ""}"><h5 class="text-primary"><i class="bi bi-calendar-month me-2"></i>${monthNames[currentMonth]}</h5></div>`;
      }

      const isNext = next && b.id === next.id;
      html += `
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm h-100 ${isNext ? "border-warning" : ""}" style="${isNext ? "border-width: 2px;" : ""}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex">
                                    <div class="me-3"><i class="bi bi-person-circle fs-1" style="color: ${isNext ? "var(--corporate-red)" : "var(--corporate-teal)"};"></i></div>
                                    <div>
                                        <h6 class="fw-bold mb-1">${b.name}</h6>
                                        <p class="text-muted small mb-2">${b.position || "Сотрудник"} ${b.department ? `· ${b.department}` : ""}</p>
                                        <div class="d-flex align-items-center gap-3">
                                            <span class="badge" style="background-color: var(--corporate-teal);"><i class="bi bi-calendar3 me-1"></i>${day} ${monthNames[month]}</span>
                                            <span class="badge bg-secondary"><i class="bi bi-cake me-1"></i>${getAge(b.birth_date)} ${getWordForm(getAge(b.birth_date), "год", "года", "лет")}</span>
                                        </div>
                                        ${isNext ? `<div class="mt-2"><span class="badge bg-warning text-dark"><i class="bi bi-star-fill me-1"></i>Через ${next.daysUntil} ${getWordForm(next.daysUntil, "день", "дня", "дней")}</span></div>` : ""}
                                    </div>
                                </div>
                                ${canEdit ? `<button class="btn btn-sm btn-outline-danger delete-birthday" data-id="${b.id}" data-name="${b.name}"><i class="bi bi-trash"></i></button>` : ""}
                                </div>
                        </div>
                    </div>
                </div>
            `;
    });

    list.innerHTML = html;

    if (canEdit) {
      document.querySelectorAll(".delete-birthday").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const id = this.dataset.id;
          const name = this.dataset.name;
          if (confirm(`Удалить ${name}?`)) {
            await apiDeleteBirthday(id);
            await renderBirthdaysList();
            showNotification("Сотрудник удалён", "success");
          }
        });
      });
    }
  }

  function openBirthdayModal() {
    const currentUser = window.auth?.user;
    const canEdit =
      currentUser?.role === "master" || currentUser?.role === "master";

    if (!canEdit) {
      alert("У вас нет прав на добавление сотрудников");
      return;
    }

    document.getElementById("birthdayForm").reset();
    new bootstrap.Modal(document.getElementById("birthdayModal")).show();
  }

  async function saveBirthday() {
    const currentUser = window.auth?.user;
    const canEdit =
      currentUser?.role === "master" || currentUser?.role === "admin";

    if (!canEdit) {
      alert("У вас нет прав на добавление сотрудников");
      return;
    }

    const name = document.getElementById("birthdayName").value.trim();
    const birthDate = document.getElementById("birthdayDate").value;
    const position = document.getElementById("birthdayPosition").value.trim();
    const department = document
      .getElementById("birthdayDepartment")
      .value.trim();

    if (!name || !birthDate) {
      alert("Заполните ФИО и дату рождения");
      return;
    }

    const birthdays = await apiGetBirthdays();
    if (
      birthdays.find(
        (b) =>
          b.name.toLowerCase() === name.toLowerCase() &&
          b.birth_date === birthDate,
      )
    ) {
      alert("Такой сотрудник уже есть в списке");
      return;
    }

    await apiAddBirthday({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      name: name,
      birthDate: birthDate,
      position: position || null,
      department: department || null,
      createdAt: new Date().toISOString(),
    });

    await renderBirthdaysList();
    bootstrap.Modal.getInstance(
      document.getElementById("birthdayModal"),
    ).hide();
    window.showNotification("Сотрудник добавлен", "success");
  }

  function hideAddButton() {
    const currentUser = window.auth?.user;
    const canEdit =
      currentUser?.role === "master" || currentUser?.role === "admin";

    const addBtn = document.getElementById("addBirthdayBtn");
    if (!canEdit) {
      if (addBtn) addBtn.style.display = "none";
    } else {
      if (addBtn) addBtn.style.display = "block";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.getElementById("birthdaysList")) return;

    await renderBirthdaysList();

    // Определяем права
    const currentUser = window.auth?.user;
    const canEdit =
      currentUser?.role === "master" || currentUser?.role === "admin";

    // Показываем/скрываем кнопку
    const addBtn = document.getElementById("addBirthdayBtn");
    if (addBtn) {
      addBtn.style.display = canEdit ? "block" : "none";
    }

    // Фильтры по месяцам (всегда работают)
    document.querySelectorAll(".month-filter").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".month-filter").forEach((b) => {
          b.classList.remove("active");
          b.style.backgroundColor = "";
          b.style.color = "";
        });
        this.classList.add("active");
        this.style.backgroundColor = "var(--corporate-teal)";
        this.style.color = "white";
        renderBirthdaysList(this.getAttribute("data-month"));
      });
    });

    // Добавляем обработчики только если есть права
    if (canEdit) {
      document
        .getElementById("addBirthdayBtn")
        ?.addEventListener("click", openBirthdayModal);
      document
        .getElementById("saveBirthdayBtn")
        ?.addEventListener("click", saveBirthday);
    }
  });
})();
