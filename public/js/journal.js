// journal.js - журнал дежурств
(function () {

setInterval(() => {
    const addEntryDropdown = document.querySelector('#eventTypeDropdown');
    const addEntryButton = addEntryDropdown?.closest('.dropdown');
    console.log('Проверка кнопки:', {
        canWrite: canWrite,
        buttonExists: !!addEntryButton,
        buttonDisplay: addEntryButton?.style.display,
        currentUser: window.auth?.user
    });
}, 3000);

  const EVENT_TYPES = {
    INSPECTION: "inspection",
    EMERGENCY: "emergency",
    OTHER: "other",
    SHIFT: "shift",
  };

  let canWrite = false;
  let currentUser = null;

async function initializePermissions() {
    let waitCount = 0;
    while (!window.auth?.user && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    currentUser = window.auth?.user;
    canWrite = currentUser?.role === 'operator';
    
    console.log('journal.js: currentUser =', currentUser);
    console.log('journal.js: canWrite =', canWrite);
    
    if (window.currentStaffName) {
        updateStaffDisplay();
    }
    
    // ВАЖНО: сначала обновляем видимость кнопок
    updateButtonsVisibility();
    
    // Затем загружаем таблицу
    await renderTable();
    
    // Затем навешиваем обработчики
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
    const addEntryDropdown = document.querySelector('#eventTypeDropdown');
    const addEntryButton = addEntryDropdown?.closest('.dropdown');
    const shiftBtn = document.getElementById('shiftBtn');
    const addInspectionBtn = document.getElementById('addInspectionEvent');
    const addOtherBtn = document.getElementById('addOtherEvent');
    
    console.log('updateButtonsVisibility: canWrite =', canWrite);
    
    if (!canWrite) {
        // Скрываем всё для не-операторов
        if (addEntryButton) addEntryButton.style.display = 'none';
        if (shiftBtn) shiftBtn.style.display = 'none';
        if (addInspectionBtn) addInspectionBtn.style.display = 'none';
        if (addOtherBtn) addOtherBtn.style.display = 'none';
    } else {
        // Показываем всё для операторов
        if (addEntryButton) addEntryButton.style.display = 'block';
        if (shiftBtn) shiftBtn.style.display = 'block';
        if (addInspectionBtn) addInspectionBtn.style.display = 'block';
        if (addOtherBtn) addOtherBtn.style.display = 'block';
    }
}

  async function renderTable() {
    try {
      const entries = await apiGetJournal();
      const tbody = document.getElementById("tableBody");
      const recordsCount = document.getElementById("recordsCount");

      if (!tbody) return;

      if (!entries || entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-1 d-block mb-3"></i>Нет записей.${canWrite ? " Добавьте первую запись!" : ""}</td></tr>`;
        if (recordsCount) recordsCount.textContent = "0 записей";
        return;
      }

      tbody.innerHTML = entries
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

          return `<tr>
                    <td class="text-center"><span class="entry-number">#${index + 1}</span></td>
                    <td>${entry.date}</td>
                    <td>${entry.start_time} - ${entry.end_time}</td>
                    <td>${getEventTypeBadge(entry.event_type)}</td>
                    <td>${description}</td>
                    <td>${entry.staff_name}</td>
                    <td class="text-center">${canWrite ? `<i class="bi bi-trash delete-btn" data-id="${entry.id}" title="Удалить"></i>` : ""}</td>
                </tr>`;
        })
        .join("");

      if (recordsCount) {
        recordsCount.textContent = `${entries.length} ${getWordForm(entries.length, "запись", "записи", "записей")}`;
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

  function formatInspectionReadings(readings) {
    let result = [];
    if (readings.gasLow || readings.gasMedium || readings.gasHigh) {
      let gasStr = "ГАЗ показания:";
      if (readings.gasLow) gasStr += ` Котельная - ${readings.gasLow} м3,`;
      if (readings.gasMedium) gasStr += ` Высокое - ${readings.gasMedium} м3,`;
      if (readings.gasHigh) gasStr += ` Среднее - ${readings.gasHigh} м3`;
      result.push(gasStr.replace(/,$/, ""));
    }
    if (readings.dguTemp)
      result.push(`Температура ОЖ ДГУ: ${readings.dguTemp}°C`);

    let lvsrReadings = [];
    if (readings.lvsr1) lvsrReadings.push(`LVSR1 - ${readings.lvsr1}°C`);
    if (readings.lvsr2) lvsrReadings.push(`LVSR2 - ${readings.lvsr2}°C`);
    if (readings.lvsr3) lvsrReadings.push(`LVSR3 - ${readings.lvsr3}°C`);
    if (readings.lvsr4) lvsrReadings.push(`LVSR4 - ${readings.lvsr4}°C`);
    if (readings.debTemp) result.push(`🏭 ДЭП: ${readings.debTemp}°C`);
    if (readings.lvsr5) lvsrReadings.push(`LVSR5 - ${readings.lvsr5}°C`);
    if (lvsrReadings.length)
      result.push(`Температуры LVSR: ${lvsrReadings.join(", ")}`);

    let tempReadings = [];
    if (readings.otTemp) tempReadings.push(`ОТ - ${readings.otTemp}°C`);
    if (readings.gvsTemp) tempReadings.push(`ГВС - ${readings.gvsTemp}°C`);
    if (tempReadings.length)
      result.push(`Температуры: ${tempReadings.join(", ")}`);

    let gvnReadings = [];
    if (readings.gvn2a) gvnReadings.push(`ГВН №2а - ${readings.gvn2a}`);
    if (readings.gvn2b) gvnReadings.push(`ГВН №2б - ${readings.gvn2b}`);
    if (readings.gvn3) gvnReadings.push(`ГВН №3 - ${readings.gvn3}`);
    if (readings.gvn4) gvnReadings.push(`ГВН №4 - ${readings.gvn4}`);
    if (readings.gvn5) gvnReadings.push(`ГВН №5 - ${readings.gvn5}`);
    if (readings.gvn6) gvnReadings.push(`ГВН №6 - ${readings.gvn6}`);
    if (gvnReadings.length) result.push(`Горелки: ${gvnReadings.join(", ")}`);

        let roomTemps = [];
    if (readings.roomTempRU04) roomTemps.push(`РУ-04кВ - ${readings.roomTempRU04}°C`);
    if (readings.roomTempRU10) roomTemps.push(`РУ-10кВ - ${readings.roomTempRU10}°C`);
    if (roomTemps.length) result.push(`Температуры в РУ: ${roomTemps.join(', ')}`);

    return result.join("\n") || "Осмотр оборудования";
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

  // ========== ПРОЧИЕ СОБЫТИЯ ==========

  async function addOtherEntry(event) {
    event.preventDefault();
    if (!canWrite) return;

    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const eventText = document.getElementById("eventText").value.trim();

    if (!startTime || !endTime || !eventText) {
      alert("Пожалуйста, заполните все поля");
      return;
    }

    const today = new Date();
    const currentDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      date: currentDate,
      startTime: startTime,
      endTime: endTime,
      eventText: eventText,
      staffName: window.currentStaffName,
      eventType: EVENT_TYPES.OTHER,
      timestamp: Date.now(),
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

      window.showNotification("Запись успешно добавлена!", "success");
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

    const startTime = document.getElementById("inspectionStartTime").value;
    const endTime = document.getElementById("inspectionEndTime").value;

    if (!startTime || !endTime) {
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
      debTemp: document.getElementById('debTemp').value,
      lvsr5: document.getElementById("lvsr5").value,
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

    const today = new Date();
    const currentDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      date: currentDate,
      startTime: startTime,
      endTime: endTime,
      eventText: "Осмотр оборудования",
      staffName: window.currentStaffName,
      eventType: EVENT_TYPES.INSPECTION,
      timestamp: Date.now(),
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

      window.showNotification("Показания осмотра сохранены!", "success");
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
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    document.getElementById("inspectionStartTime").value = currentTime;
    document.getElementById("inspectionEndTime").value = currentTime;

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
        description.value =
          "Произошло отключение электроэнергии. Оборудование остановлено. Ведутся работы по восстановлению.";
        break;
      case 2:
        typeSelect.value = "water";
        description.value =
          "Прорыв трубы, подтопление помещения. Приняты меры по локализации.";
        break;
      case 3:
        typeSelect.value = "fire";
        description.value =
          "Возникло задымление. Проведена эвакуация. Вызваны экстренные службы.";
        break;
      case 4:
        typeSelect.value = "equipment";
        description.value =
          "Отказ оборудования. Временно выведено из работы. Требуется ремонт.";
        break;
      default:
        return;
    }

    window.showNotification("Шаблон вставлен", "info");
  };

  async function addEmergencyEntry(event) {
    event.preventDefault();

    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const startTime = document.getElementById("emergencyStartTime").value;
    const endTime = document.getElementById("emergencyEndTime").value;
    const emergencyType = document.getElementById("emergencyType").value;
    const description = document
      .getElementById("emergencyDescription")
      .value.trim();
    const actions = document.getElementById("emergencyActions").value.trim();
    const services = document.getElementById("emergencyServices").value.trim();

    if (!startTime || !endTime || !emergencyType || !description) {
      alert("Пожалуйста, заполните все обязательные поля");
      return;
    }

    const today = new Date();
    const currentDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

    let eventText = `⚠️ АВАРИЙНОЕ СОБЫТИЕ\n`;
    eventText += `Тип: ${getEmergencyTypeName(emergencyType)}\n`;
    eventText += `Описание: ${description}\n`;
    if (actions) eventText += `Принятые меры: ${actions}\n`;
    if (services) eventText += `Привлечённые службы: ${services}`;

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      date: currentDate,
      startTime: startTime,
      endTime: endTime,
      eventText: eventText,
      staffName: window.currentStaffName,
      eventType: EVENT_TYPES.EMERGENCY,
      timestamp: Date.now(),
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

      window.showNotification("Аварийное событие зарегистрировано!", "danger");
    } catch (error) {
      console.error(error);
      alert("Ошибка при сохранении");
    }
  }

  function getEmergencyTypeName(type) {
    switch (type) {
      case "equipment":
        return "Отказ оборудования";
      case "power":
        return "Отключение электроэнергии";
      case "water":
        return "Авария водоснабжения";
      case "fire":
        return "Пожар / Задымление";
      case "gas":
        return "Утечка газа";
      default:
        return "Прочее";
    }
  }

  function showEmergencyModal() {
    if (!canWrite) return;
    if (!window.currentStaffName) {
      alert("Пожалуйста, выберите текущего дежурного");
      return;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    document.getElementById("emergencyStartTime").value = currentTime;
    document.getElementById("emergencyEndTime").value = currentTime;
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
    const shiftTime = document.getElementById("shiftTime").value;

    if (!incomingStaff) {
      alert("Пожалуйста, выберите персонал, принимающий смену");
      return;
    }

    if (!shiftTime) {
      alert("Пожалуйста, укажите время смены");
      return;
    }

    if (incomingStaff === window.currentStaffName) {
      alert("Принимающий персонал не может совпадать с текущим дежурным");
      return;
    }

    const today = new Date();
    const currentDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
    const eventText = `${window.currentStaffName} сдал смену. ${incomingStaff} принял смену`;

    const newEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      date: currentDate,
      startTime: shiftTime,
      endTime: shiftTime,
      eventText: eventText,
      staffName: window.currentStaffName + " → " + incomingStaff,
      eventType: EVENT_TYPES.SHIFT,
      timestamp: Date.now(),
      inspectionReadings: null,
      shiftFrom: window.currentStaffName,
      shiftTo: incomingStaff,
    };

    try {
      await apiAddJournalEntry(newEntry);

      window.currentStaffName = incomingStaff;
      localStorage.setItem("globalStaffName", window.currentStaffName);
      if (typeof window.updateStaffDisplay === "function") {
        window.updateStaffDisplay();
      }
      updateStaffDisplay();

      await renderTable();

      const shiftModal = bootstrap.Modal.getInstance(
        document.getElementById("shiftModal"),
      );
      if (shiftModal) shiftModal.hide();

      document.getElementById("incomingStaffSelect").value = "";
      document.getElementById("shiftTime").value = "";

      window.showNotification("Смена успешно передана", "success");
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

      select.innerHTML = '<option value="">-- Выберите сотрудника --</option>';

      shiftStaff.forEach((staff) => {
        if (staff.name !== window.currentStaffName) {
          const option = document.createElement("option");
          option.value = staff.name;
          option.textContent = staff.name;
          select.appendChild(option);
        }
      });

      if (select.options.length === 1) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "-- Нет других сотрудников --";
        option.disabled = true;
        select.appendChild(option);
      }
    } catch (error) {
      console.error("Ошибка загрузки сменного персонала:", error);
      const select = document.getElementById("incomingStaffSelect");
      if (select) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
      }
    }
  }

  function updateShiftModalStaff() {
    const shiftStaffDisplay = document.getElementById("currentShiftStaff");
    if (shiftStaffDisplay) {
      shiftStaffDisplay.textContent = window.currentStaffName || "Не выбран";
    }
  }

  // ========== ИНИЦИАЛИЗАЦИЯ ==========

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
          alert("Сначала выберите текущего дежурного");
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("shiftModal"),
          );
          if (modal) modal.hide();
          return;
        }
        await loadUsersForShift();
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        document.getElementById("shiftTime").value = currentTime;
        updateShiftModalStaff();
      });

    document
      .getElementById("addEntryModal")
      ?.addEventListener("show.bs.modal", function (event) {
        if (!window.currentStaffName) {
          event.preventDefault();
          alert("Сначала выберите текущего дежурного");
          return false;
        }
        document.getElementById("staffName").value = window.currentStaffName;
      });

    document
      .getElementById("inspectionModal")
      ?.addEventListener("show.bs.modal", function (event) {
        if (!window.currentStaffName) {
          event.preventDefault();
          alert("Сначала выберите текущего дежурного");
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
          alert("Сначала выберите текущего дежурного");
          return false;
        }
        document.getElementById("emergencyStaffName").value =
          window.currentStaffName;
      });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.getElementById("tableBody")) return;
    await initializePermissions();
  });
})();
