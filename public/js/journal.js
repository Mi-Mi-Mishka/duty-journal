// journal.js - журнал дежурств
(function () {
  const EVENT_TYPES = {
    INSPECTION: "inspection",
    EMERGENCY: "emergency",
    OTHER: "other",
    SHIFT: "shift",
  };

  // ========== ПЕРЕМЕННЫЕ ==========
  let canWrite = false;
  let currentUser = null;

  // Фильтры
  let currentFilters = {
    search: "",
    dateFrom: "",
    dateTo: "",
    eventType: "all",
  };

  // ========== ИНИЦИАЛИЗАЦИЯ ==========
  async function initializePermissions() {
    let waitCount = 0;
    while (!window.auth?.user && waitCount < 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitCount++;
    }

    currentUser = window.auth?.user;
    canWrite = currentUser?.role === "operator";

    console.log("journal.js: canWrite =", canWrite);

    if (window.currentStaffName) {
      updateStaffDisplay();
    }

    updateButtonsVisibility();
    await renderTable();
    attachEventHandlers();
  }

  function updateStaffDisplay() {
    const staffInput = document.getElementById("staffName");
    const inspectionStaffInput = document.getElementById("inspectionStaffName");
    const emergencyStaffInput = document.getElementById("emergencyStaffName");
    if (staffInput) staffInput.value = window.currentStaffName;
    if (inspectionStaffInput)
      inspectionStaffInput.value = window.currentStaffName;
    if (emergencyStaffInput)
      emergencyStaffInput.value = window.currentStaffName;
  }

  function updateButtonsVisibility() {
    const addEntryButton = document
      .querySelector("#eventTypeDropdown")
      ?.closest(".dropdown");
    const shiftBtn = document.getElementById("shiftBtn");
    const addInspectionBtn = document.getElementById("addInspectionEvent");
    const addOtherBtn = document.getElementById("addOtherEvent");

    if (!canWrite) {
      if (addEntryButton) addEntryButton.style.display = "none";
      if (shiftBtn) shiftBtn.style.display = "none";
      if (addInspectionBtn) addInspectionBtn.style.display = "none";
      if (addOtherBtn) addOtherBtn.style.display = "none";
    } else {
      if (addEntryButton) addEntryButton.style.display = "block";
      if (shiftBtn) shiftBtn.style.display = "block";
      if (addInspectionBtn) addInspectionBtn.style.display = "block";
      if (addOtherBtn) addOtherBtn.style.display = "block";
    }
  }

  // ========== ФОРМАТИРОВАНИЕ ==========
  function formatDateTime(datetime) {
    if (!datetime) return "—";
    const date = new Date(datetime);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getEventTypeBadge(type) {
    switch (type) {
      case EVENT_TYPES.INSPECTION:
        return '<span class="event-type-badge event-type-inspection">Обход</span>';
      case EVENT_TYPES.EMERGENCY:
        return '<span class="event-type-badge event-type-emergency">Авария</span>';
      case EVENT_TYPES.SHIFT:
        return '<span class="event-type-badge event-type-shift">Смена</span>';
      default:
        return '<span class="event-type-badge event-type-other">Прочее</span>';
    }
  }

  function getWordForm(n, one, two, five) {
    n = Math.abs(n) % 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
  }

  function formatInspectionReadings(readings) {
    let result = [];
    if (readings.gasLow || readings.gasMedium || readings.gasHigh) {
      let gasStr = "📊 Давление газа:";
      if (readings.gasLow) gasStr += ` низкое ${readings.gasLow} кПа,`;
      if (readings.gasMedium) gasStr += ` среднее ${readings.gasMedium} кПа,`;
      if (readings.gasHigh) gasStr += ` высокое ${readings.gasHigh} кПа`;
      result.push(gasStr.replace(/,$/, ""));
    }
    if (readings.dguTemp)
      result.push(`🌡️ Температура ОЖ ДГУ: ${readings.dguTemp}°C`);

    let lvsrReadings = [];
    if (readings.lvsr1) lvsrReadings.push(`LVSR1 ${readings.lvsr1}°C`);
    if (readings.lvsr2) lvsrReadings.push(`LVSR2 ${readings.lvsr2}°C`);
    if (readings.lvsr3) lvsrReadings.push(`LVSR3 ${readings.lvsr3}°C`);
    if (readings.lvsr4) lvsrReadings.push(`LVSR4 ${readings.lvsr4}°C`);
    if (readings.lvsr5) lvsrReadings.push(`LVSR5 ${readings.lvsr5}°C`);
    if (readings.debTemp) lvsrReadings.push(`ДЭБ ${readings.debTemp}°C`);
    if (lvsrReadings.length)
      result.push(`🖥️ Температуры: ${lvsrReadings.join(", ")}`);

    let tempReadings = [];
    if (readings.otTemp) tempReadings.push(`ОТ ${readings.otTemp}°C`);
    if (readings.gvsTemp) tempReadings.push(`ГВС ${readings.gvsTemp}°C`);
    if (tempReadings.length)
      result.push(`💧 Температуры систем: ${tempReadings.join(", ")}`);

    let roomTemps = [];
    if (readings.roomTempRU04)
      roomTemps.push(`РУ-04кВ ${readings.roomTempRU04}°C`);
    if (readings.roomTempRU10)
      roomTemps.push(`РУ-10кВ ${readings.roomTempRU10}°C`);
    if (roomTemps.length) result.push(`🏢 Помещения: ${roomTemps.join(", ")}`);

    let gvnReadings = [];
    if (readings.gvn2a) gvnReadings.push(`ГВН №2а ${readings.gvn2a}`);
    if (readings.gvn2b) gvnReadings.push(`ГВН №2б ${readings.gvn2b}`);
    if (readings.gvn3) gvnReadings.push(`ГВН №3 ${readings.gvn3}`);
    if (readings.gvn4) gvnReadings.push(`ГВН №4 ${readings.gvn4}`);
    if (readings.gvn5) gvnReadings.push(`ГВН №5 ${readings.gvn5}`);
    if (readings.gvn6) gvnReadings.push(`ГВН №6 ${readings.gvn6}`);
    if (gvnReadings.length)
      result.push(`🔥 Горелки: ${gvnReadings.join(", ")}`);

    return result.join("\n") || "Осмотр оборудования";
  }

  // ========== ФИЛЬТРАЦИЯ ==========
  function filterEntries(entries) {
    return entries.filter((entry) => {
      // Поиск по тексту
      if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const text = (entry.event_text || "").toLowerCase();
        const staff = (entry.staff_name || "").toLowerCase();
        if (!text.includes(searchLower) && !staff.includes(searchLower)) {
          return false;
        }
      }

      // Фильтр по дате (от)
      if (currentFilters.dateFrom) {
        const entryDate = entry.start_datetime
          ? new Date(entry.start_datetime)
          : new Date(entry.date);
        const fromDate = new Date(currentFilters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (entryDate < fromDate) return false;
      }

      // Фильтр по дате (до)
      if (currentFilters.dateTo) {
        const entryDate = entry.start_datetime
          ? new Date(entry.start_datetime)
          : new Date(entry.date);
        const toDate = new Date(currentFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) return false;
      }

      // Фильтр по типу события
      if (
        currentFilters.eventType !== "all" &&
        entry.event_type !== currentFilters.eventType
      ) {
        return false;
      }

      return true;
    });
  }

  function applyFilters() {
    const searchInput = document.getElementById("searchInput");
    const dateFrom = document.getElementById("dateFrom");
    const dateTo = document.getElementById("dateTo");
    const eventType = document.getElementById("eventTypeFilter");

    currentFilters.search = searchInput ? searchInput.value.trim() : "";
    currentFilters.dateFrom = dateFrom ? dateFrom.value : "";
    currentFilters.dateTo = dateTo ? dateTo.value : "";
    currentFilters.eventType = eventType ? eventType.value : "all";

    renderTable();
  }

  function clearFilters() {
    const searchInput = document.getElementById("searchInput");
    const dateFrom = document.getElementById("dateFrom");
    const dateTo = document.getElementById("dateTo");
    const eventType = document.getElementById("eventTypeFilter");

    if (searchInput) searchInput.value = "";
    if (dateFrom) dateFrom.value = "";
    if (dateTo) dateTo.value = "";
    if (eventType) eventType.value = "all";

    currentFilters = {
      search: "",
      dateFrom: "",
      dateTo: "",
      eventType: "all",
    };

    renderTable();
  }

  // ========== ОТОБРАЖЕНИЕ ==========
  async function renderTable() {
    try {
      const allEntries = await apiGetJournal();
      const filteredEntries = filterEntries(allEntries);

      const tbody = document.getElementById("tableBody");
      const recordsCount = document.getElementById("recordsCount");

      if (!tbody) return;

      if (!filteredEntries || filteredEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-1 d-block mb-3"></i>
                    ${allEntries.length === 0 ? "Нет записей. Добавьте первую запись!" : "По вашему запросу ничего не найдено."}
                    ${canWrite && allEntries.length === 0 ? " Добавьте первую запись!" : ""}</td></tr>`;
        if (recordsCount)
          recordsCount.textContent = `${filteredEntries.length} из ${allEntries.length} записей`;
        return;
      }

      tbody.innerHTML = filteredEntries
        .map((entry, index) => {
          let description = entry.event_text;
          if (
            entry.event_type === EVENT_TYPES.INSPECTION &&
            entry.inspection_readings
          ) {
            try {
              const readings = JSON.parse(entry.inspection_readings);
              description = formatInspectionReadings(readings);
            } catch (e) {}
          }

          // Нумерация: самая новая (вверху) получает наибольший номер
          const entryNumber = filteredEntries.length - index;

          return `<tr>
        <td class="text-center"><span class="entry-number">#${entryNumber}</span></td>
        <td class="text-nowrap">${formatDateTime(entry.start_datetime)}</td>
        <td class="text-nowrap">${formatDateTime(entry.end_datetime)}</td>
        <td>${getEventTypeBadge(entry.event_type)}</td>
        <td>${description}</td>
        <td>${entry.staff_name}</td>
        <td class="text-center">${canWrite ? `<i class="bi bi-trash delete-btn" data-id="${entry.id}" title="Удалить"></i>` : ""}</td>
    </tr>`;
        })
        .join("");

      if (recordsCount) {
        recordsCount.textContent = `${filteredEntries.length} из ${allEntries.length} записей`;
      }

      if (canWrite) {
        document.querySelectorAll(".delete-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id");
            if (confirm("Удалить запись?")) {
              await apiDeleteJournalEntry(id);
              await renderTable();
              window.showNotification("Запись удалена", "danger");
            }
          });
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      window.showNotification("Ошибка загрузки данных", "danger");
    }
  }

  // ========== ДОБАВЛЕНИЕ ЗАПИСЕЙ ==========
  async function addOtherEntry(event) {
    event.preventDefault();
    if (!canWrite) return;
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const startDatetime = document.getElementById("startDatetime").value;
    const endDatetime = document.getElementById("endDatetime").value;
    const eventText = document.getElementById("eventText").value.trim();

    if (!startDatetime || !endDatetime || !eventText) {
      alert("Пожалуйста, заполните все поля");
      return;
    }

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      startDatetime: startDatetime,
      endDatetime: endDatetime,
      eventText: eventText,
      staffName: window.currentStaffName,
      eventType: EVENT_TYPES.OTHER,
      inspectionReadings: null,
      shiftFrom: null,
      shiftTo: null,
    };

    try {
      await apiAddJournalEntry(newEntry);
      document.getElementById("addForm").reset();
      await renderTable();
      const addModal = bootstrap.Modal.getInstance(
        document.getElementById("addEntryModal"),
      );
      if (addModal) addModal.hide();
      window.showNotification("Запись добавлена", "success");
    } catch (error) {
      console.error(error);
      alert("Ошибка при сохранении");
    }
  }

  window.insertTemplate = function (templateNumber) {
    const eventTextArea = document.getElementById("eventText");
    if (!eventTextArea) return;
    const templates = [
      "Проведены плановые регламентные работы. Оборудование работает в штатном режиме.",
      "Выявлены замечания в работе оборудования. Требуется наблюдение.",
      "Смена передана. Оборудование работает в штатном режиме. Замечаний нет.",
    ];
    if (templateNumber >= 1 && templateNumber <= 3) {
      eventTextArea.value = templates[templateNumber - 1];
      window.showNotification("Шаблон вставлен", "info");
    }
  };

  // ========== ОБХОД ОБОРУДОВАНИЯ ==========
  async function addInspectionEntry(event) {
    event.preventDefault();
    if (!canWrite) return;
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const startDatetime = document.getElementById(
      "inspectionStartDatetime",
    ).value;
    const endDatetime = document.getElementById("inspectionEndDatetime").value;

    if (!startDatetime || !endDatetime) {
      alert("Пожалуйста, укажите время начала и окончания осмотра");
      return;
    }

    const inspectionReadings = {
      gasLow: document.getElementById("gasLow").value,
      gasMedium: document.getElementById("gasMedium").value,
      gasHigh: document.getElementById("gasHigh").value,
      dguTemp: document.getElementById("dguTemp").value,
      lvsr1: document.getElementById("lvsr1").value,
      lvsr2: document.getElementById("lvsr2").value,
      lvsr3: document.getElementById("lvsr3").value,
      lvsr4: document.getElementById("lvsr4").value,
      lvsr5: document.getElementById("lvsr5").value,
      debTemp: document.getElementById("debTemp").value,
      otTemp: document.getElementById("otTemp").value,
      gvsTemp: document.getElementById("gvsTemp").value,
      gvn2a: document.getElementById("gvn2a").value,
      gvn2b: document.getElementById("gvn2b").value,
      gvn3: document.getElementById("gvn3").value,
      gvn4: document.getElementById("gvn4").value,
      gvn5: document.getElementById("gvn5").value,
      gvn6: document.getElementById("gvn6").value,
      roomTempRU04: document.getElementById("roomTempRU04").value,
      roomTempRU10: document.getElementById("roomTempRU10").value,
    };

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      startDatetime: startDatetime,
      endDatetime: endDatetime,
      eventText: "Осмотр оборудования",
      staffName: window.currentStaffName,
      eventType: EVENT_TYPES.INSPECTION,
      inspectionReadings: inspectionReadings,
      shiftFrom: null,
      shiftTo: null,
    };

    try {
      await apiAddJournalEntry(newEntry);
      document.getElementById("inspectionForm").reset();
      await renderTable();
      const inspectionModal = bootstrap.Modal.getInstance(
        document.getElementById("inspectionModal"),
      );
      if (inspectionModal) inspectionModal.hide();
      window.showNotification("Показания осмотра сохранены", "success");
    } catch (error) {
      console.error(error);
      alert("Ошибка при сохранении");
    }
  }

  function showInspectionModal() {
    if (!canWrite) return;
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentDatetime = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("inspectionStartDatetime").value = currentDatetime;
    document.getElementById("inspectionEndDatetime").value = currentDatetime;
    new bootstrap.Modal(document.getElementById("inspectionModal")).show();
  }

  // ========== АВАРИЙНЫЕ СОБЫТИЯ ==========
  window.insertEmergencyTemplate = function (templateNumber) {
    const description = document.getElementById("emergencyDescription");
    const typeSelect = document.getElementById("emergencyType");
    if (!description) return;
    switch (templateNumber) {
      case 1:
        typeSelect.value = "power";
        description.value = "Произошло отключение электроэнергии.";
        break;
      case 2:
        typeSelect.value = "water";
        description.value = "Прорыв трубы, подтопление помещения.";
        break;
      case 3:
        typeSelect.value = "fire";
        description.value = "Возникло задымление. Проведена эвакуация.";
        break;
      case 4:
        typeSelect.value = "equipment";
        description.value = "Отказ оборудования.";
        break;
      default:
        return;
    }
    window.showNotification("Шаблон вставлен", "info");
  };

  async function addEmergencyEntry(event) {
    event.preventDefault();
    if (!canWrite) return;
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const startDatetime = document.getElementById(
      "emergencyStartDatetime",
    ).value;
    const endDatetime = document.getElementById("emergencyEndDatetime").value;
    const emergencyType = document.getElementById("emergencyType").value;
    const description = document
      .getElementById("emergencyDescription")
      .value.trim();
    const actions = document.getElementById("emergencyActions").value.trim();
    const services = document.getElementById("emergencyServices").value.trim();

    if (!startDatetime || !endDatetime || !emergencyType || !description) {
      alert("Заполните все обязательные поля");
      return;
    }

    let eventText = `⚠️ АВАРИЯ\nТип: ${getEmergencyTypeName(emergencyType)}\nОписание: ${description}\n`;
    if (actions) eventText += `Меры: ${actions}\n`;
    if (services) eventText += `Службы: ${services}`;

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      startDatetime: startDatetime,
      endDatetime: endDatetime,
      eventText: eventText,
      staffName: window.currentStaffName,
      eventType: EVENT_TYPES.EMERGENCY,
      inspectionReadings: null,
      shiftFrom: null,
      shiftTo: null,
    };

    try {
      await apiAddJournalEntry(newEntry);
      document.getElementById("emergencyForm").reset();
      await renderTable();
      const emergencyModal = bootstrap.Modal.getInstance(
        document.getElementById("emergencyModal"),
      );
      if (emergencyModal) emergencyModal.hide();
      window.showNotification("Авария зарегистрирована", "danger");
    } catch (error) {
      console.error(error);
      alert("Ошибка при сохранении");
    }
  }

  function getEmergencyTypeName(type) {
    const types = {
      equipment: "Отказ оборудования",
      power: "Отключение электроэнергии",
      water: "Авария водоснабжения",
      fire: "Пожар / Задымление",
      gas: "Утечка газа",
    };
    return types[type] || "Прочее";
  }

  function showEmergencyModal() {
    if (!canWrite) return;
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentDatetime = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("emergencyStartDatetime").value = currentDatetime;
    document.getElementById("emergencyEndDatetime").value = currentDatetime;
    document.getElementById("emergencyStaffName").value =
      window.currentStaffName;
    new bootstrap.Modal(document.getElementById("emergencyModal")).show();
  }

  // ========== СМЕНА ==========
  async function createShiftEntry() {
    if (!canWrite) {
      alert("У вас нет прав на передачу смены");
      return;
    }
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const incomingStaff = document.getElementById("incomingStaffSelect").value;
    const shiftDatetime = document.getElementById("shiftDatetime").value;

    if (!incomingStaff) {
      alert("Выберите принимающего смену");
      return;
    }
    if (!shiftDatetime) {
      alert("Укажите дату и время смены");
      return;
    }
    if (incomingStaff === window.currentStaffName) {
      alert("Принимающий не может совпадать с текущим дежурным");
      return;
    }

    const eventText = `${window.currentStaffName} сдал смену. ${incomingStaff} принял смену`;

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      startDatetime: shiftDatetime,
      endDatetime: shiftDatetime,
      eventText: eventText,
      staffName: window.currentStaffName + " → " + incomingStaff,
      eventType: EVENT_TYPES.SHIFT,
      inspectionReadings: null,
      shiftFrom: window.currentStaffName,
      shiftTo: incomingStaff,
    };

    try {
      await apiAddJournalEntry(newEntry);
      window.currentStaffName = incomingStaff;
      localStorage.setItem("globalStaffName", window.currentStaffName);
      if (typeof window.updateStaffDisplay === "function")
        window.updateStaffDisplay();
      updateStaffDisplay();
      await renderTable();
      const shiftModal = bootstrap.Modal.getInstance(
        document.getElementById("shiftModal"),
      );
      if (shiftModal) shiftModal.hide();
      document.getElementById("incomingStaffSelect").value = "";
      document.getElementById("shiftDatetime").value = "";
      window.showNotification("Смена передана", "success");
    } catch (error) {
      console.error(error);
      alert("Ошибка при сохранении смены");
    }
  }

  async function loadUsersForShift() {
    try {
      const response = await fetch("/api/shift-staff");
      if (!response.ok) throw new Error("Ошибка загрузки");
      const shiftStaff = await response.json();
      const select = document.getElementById("incomingStaffSelect");
      if (!select) return;
      select.innerHTML = '<option value="">-- Выберите --</option>';
      shiftStaff.forEach((staff) => {
        if (staff.name !== window.currentStaffName) {
          const option = document.createElement("option");
          option.value = staff.name;
          option.textContent = staff.name;
          select.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    }
  }

  function updateShiftModalStaff() {
    const shiftStaffDisplay = document.getElementById("currentShiftStaff");
    if (shiftStaffDisplay)
      shiftStaffDisplay.textContent = window.currentStaffName || "Не выбран";
  }

  // ========== ОБРАБОТЧИКИ ==========
  function attachEventHandlers() {
    if (!canWrite) return;

    document
      .getElementById("addForm")
      ?.addEventListener("submit", addOtherEntry);
    document
      .getElementById("inspectionForm")
      ?.addEventListener("submit", addInspectionEntry);
    document
      .getElementById("emergencyForm")
      ?.addEventListener("submit", addEmergencyEntry);
    document
      .getElementById("confirmShiftBtn")
      ?.addEventListener("click", createShiftEntry);
    document
      .getElementById("addInspectionEvent")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        showInspectionModal();
      });
    document
      .getElementById("addEmergencyEvent")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        showEmergencyModal();
      });

    document
      .getElementById("shiftModal")
      ?.addEventListener("show.bs.modal", async function () {
        if (!window.currentStaffName) {
          alert("Выберите текущего дежурного");
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("shiftModal"),
          );
          if (modal) modal.hide();
          return;
        }
        await loadUsersForShift();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        document.getElementById("shiftDatetime").value =
          `${year}-${month}-${day}T${hours}:${minutes}`;
        updateShiftModalStaff();
      });

    document
      .getElementById("addEntryModal")
      ?.addEventListener("show.bs.modal", function (event) {
        if (!window.currentStaffName) {
          event.preventDefault();
          alert("Выберите текущего дежурного");
          return false;
        }
        document.getElementById("staffName").value = window.currentStaffName;
      });

    document
      .getElementById("inspectionModal")
      ?.addEventListener("show.bs.modal", function (event) {
        if (!window.currentStaffName) {
          event.preventDefault();
          alert("Выберите текущего дежурного");
          return false;
        }
        document.getElementById("inspectionStaffName").value =
          window.currentStaffName;
      });

    document
      .getElementById("emergencyModal")
      ?.addEventListener("show.bs.modal", function (event) {
        if (!window.currentStaffName) {
          event.preventDefault();
          alert("Выберите текущего дежурного");
          return false;
        }
        document.getElementById("emergencyStaffName").value =
          window.currentStaffName;
      });

    // ========== ОБРАБОТЧИКИ ФИЛЬТРОВ ==========
    const searchInput = document.getElementById("searchInput");
    const dateFrom = document.getElementById("dateFrom");
    const dateTo = document.getElementById("dateTo");
    const eventTypeFilter = document.getElementById("eventTypeFilter");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (dateFrom) dateFrom.addEventListener("change", applyFilters);
    if (dateTo) dateTo.addEventListener("change", applyFilters);
    if (eventTypeFilter)
      eventTypeFilter.addEventListener("change", applyFilters);
    if (clearFiltersBtn)
      clearFiltersBtn.addEventListener("click", clearFilters);
  }

  // ========== ЗАПУСК ==========
  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.getElementById("tableBody")) return;
    await initializePermissions();
  });
})();
