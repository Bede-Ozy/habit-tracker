document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const STATE_KEY = 'challenge_tracker_data';

    let currentDate = new Date();
    // We'll track data by 'YYYY-MM-DD' keys inside an activity object
    let trackerData = loadData();

    // --- DOM Elements ---
    const gridContainer = document.getElementById('tracker-body');
    const datesHeader = document.getElementById('dates-header');
    const currentMonthDisplay = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    // Modal Elements
    const modal = document.getElementById('log-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalActivityTitle = document.getElementById('modal-activity-title');
    const modalDateDisplay = document.getElementById('modal-date-display');
    const modalCompleted = document.getElementById('modal-completed');

    // Duration Elements
    const modalDurationValue = document.getElementById('modal-duration-value');
    const modalDurationUnit = document.getElementById('modal-duration-unit');

    const modalNotes = document.getElementById('modal-notes');
    const saveLogBtn = document.getElementById('save-log-btn');

    // Add Activity Elements
    const newActivityInput = document.getElementById('new-activity-input');
    const addActivityBtn = document.getElementById('add-activity-btn');

    // Export Element
    const exportBtn = document.getElementById('export-btn');

    // User Guide / Install Elements
    const userGuideModal = document.getElementById('user-guide-modal');
    const closeGuideModalBtn = document.getElementById('close-guide-modal');
    const guideActionBtn = document.getElementById('guide-action-btn');
    let deferredPrompt;

    // Current selection for modal
    let selectedCell = { activity: null, dateStr: null };
    let currentMobileActivity = null;

    // Calendar Modal Elements
    const calendarModal = document.getElementById('activity-calendar-modal');
    const closeCalendarModalBtn = document.getElementById('close-calendar-modal');
    const calendarModalTitle = document.getElementById('calendar-modal-title');
    const calendarGrid = document.getElementById('calendar-grid');

    // --- Initialization ---
    renderTracker();

    // --- Event Listeners ---
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    closeModalBtn.addEventListener('click', hideModal);

    closeCalendarModalBtn.addEventListener('click', () => {
        calendarModal.classList.remove('active');
        setTimeout(() => calendarModal.classList.add('hidden'), 300);
    });

    if (closeGuideModalBtn) {
        closeGuideModalBtn.addEventListener('click', () => {
            closeGuide();
        });
    }

    if (guideActionBtn) {
        guideActionBtn.addEventListener('click', handleGuideAction);
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
        if (e.target === calendarModal) {
            calendarModal.classList.remove('active');
            setTimeout(() => calendarModal.classList.add('hidden'), 300);
        }
        if (e.target === userGuideModal) {
            closeGuide();
        }
    });

    saveLogBtn.addEventListener('click', saveModalData);

    addActivityBtn.addEventListener('click', addNewActivity);
    newActivityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewActivity();
    });

    exportBtn.addEventListener('click', exportToCSV);

    // --- PWA Install / Guide Logic ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        updateGuideCTA();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        console.log('PWA was installed');
        closeGuide();
    });

    // Check if app is installed to update CTA
    async function checkInstalledRelatedApps() {
        if ('getInstalledRelatedApps' in navigator) {
            try {
                const relatedApps = await navigator.getInstalledRelatedApps();
                if (relatedApps.length > 0) {
                    return true;
                }
            } catch (error) {
                console.error('Error checking installed apps:', error);
            }
        }
        return false;
    }

    async function updateGuideCTA() {
        // Default state
        let actionText = "Start Using App";
        let actionConfig = "close";

        // Check installation status
        const isInstalled = await checkInstalledRelatedApps();
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (isStandalone) {
            // Already open in app, button should just close guide
            actionText = "Continue";
            actionConfig = "close";
        } else if (isInstalled) {
            actionText = "Open App";
            actionConfig = "open";
        } else if (deferredPrompt) {
            actionText = "Install App";
            actionConfig = "install";
        }

        guideActionBtn.textContent = actionText;
        guideActionBtn.dataset.action = actionConfig;
    }

    async function handleGuideAction() {
        const action = guideActionBtn.dataset.action;

        if (action === 'install' && deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            closeGuide();
        } else if (action === 'open') {
            alert("Please open the 'Challenge Tracker' app from your home screen.");
            closeGuide();
        } else {
            closeGuide();
        }
    }

    function closeGuide() {
        userGuideModal.classList.remove('active');
        setTimeout(() => userGuideModal.classList.add('hidden'), 300);
        localStorage.setItem('guideSeen', 'true');
    }

    // Show guide on load if not seen (or always for this request context?)
    setTimeout(() => {
        // if (!localStorage.getItem('guideSeen')) { 
        userGuideModal.classList.remove('hidden');
        requestAnimationFrame(() => userGuideModal.classList.add('active'));
        updateGuideCTA();
        // }
    }, 500);

    // --- Functions ---

    function loadData() {
        const stored = localStorage.getItem(STATE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return {};
    }

    function saveData() {
        localStorage.setItem(STATE_KEY, JSON.stringify(trackerData));
    }

    function changeMonth(delta) {
        currentDate.setMonth(currentDate.getMonth() + delta);
        renderTracker();
    }

    function getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    function formatDateKey(year, month, day) {
        // month is 0-indexed, but we want 01-12
        const m = (month + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        return `${year}-${m}-${d}`;
    }

    function renderTracker() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(currentDate);

        // Update Header Month Display
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        currentMonthDisplay.textContent = `${monthName} ${year}`;

        // Render Dates Header
        datesHeader.innerHTML = '';
        for (let i = 1; i <= daysInMonth; i++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'date-cell';
            dateCell.textContent = i;
            datesHeader.appendChild(dateCell);
        }

        // Render Grid Body
        gridContainer.innerHTML = '';
        const activities = Object.keys(trackerData);

        activities.forEach(activity => {
            const row = document.createElement('div');
            row.className = 'activity-row';

            // Label Container
            const labelContainer = document.createElement('div');
            labelContainer.className = 'activity-label-container';

            const labelKey = document.createElement('span');
            labelKey.className = 'activity-name';
            labelKey.textContent = activity;
            labelKey.title = activity;

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
            deleteBtn.title = 'Delete Activity';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent row click or tooltip interference
                deleteActivity(activity);
            };

            labelContainer.appendChild(labelKey);
            labelContainer.appendChild(deleteBtn);

            // We append the container to the sticky label wrapper
            const stickyWrapper = document.createElement('div');
            stickyWrapper.className = 'activity-label';
            stickyWrapper.appendChild(labelContainer);

            // Add click listener for mobile drill-down
            stickyWrapper.addEventListener('click', (e) => {
                openActivityCalendar(activity);
            });

            row.appendChild(stickyWrapper);

            // Grid Cells
            const cellsContainer = document.createElement('div');
            cellsContainer.className = 'dates-row';

            for (let i = 1; i <= daysInMonth; i++) {
                const dateKey = formatDateKey(year, month, i);
                const cellData = trackerData[activity][dateKey];

                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                if (cellData) {
                    if (cellData.completed) {
                        cell.classList.add('completed');
                        cell.innerHTML = '<i class="ri-check-line"></i>';
                    } else if (cellData.hours > 0) {
                        cell.classList.add('logged-some');
                        cell.textContent = cellData.hours;
                        cell.classList.add('has-hours');
                    }
                }

                cell.addEventListener('click', () => openModal(activity, dateKey));
                cellsContainer.appendChild(cell);
            }

            row.appendChild(cellsContainer);
            gridContainer.appendChild(row);
        });

        // Refresh mobile calendar if open
        if (typeof calendarModal !== 'undefined' && calendarModal.classList.contains('active') && currentMobileActivity) {
            openActivityCalendar(currentMobileActivity);
        }
    }

    function addNewActivity() {
        const name = newActivityInput.value.trim();
        if (!name) return;

        if (trackerData[name]) {
            alert('Activity already exists!');
            return;
        }

        trackerData[name] = {};
        saveData();
        renderTracker();
        newActivityInput.value = '';
    }

    function deleteActivity(name) {
        if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            delete trackerData[name];
            saveData();
            renderTracker();
        }
    }

    // --- Modal Logic ---

    function openModal(activity, dateKey, useGrowAnimation = false) {
        selectedCell = { activity, dateKey };

        modalActivityTitle.textContent = activity;
        modalDateDisplay.textContent = new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const data = trackerData[activity][dateKey] || {};
        modalCompleted.checked = data.completed || false;

        // Handle duration display
        let totalHours = data.hours || 0;

        // Logic: 
        // If totalHours is 0, default to Hours 0
        // If totalHours < 1 (e.g. 0.5), show Minutes (30)
        // If totalHours >= 1, show Hours (e.g. 1.5)
        // This is a heuristic.

        if (totalHours > 0 && totalHours < 1) {
            modalDurationUnit.value = 'minutes';
            // Round to nearest minute just in case of float errors
            modalDurationValue.value = Math.round(totalHours * 60);
        } else {
            modalDurationUnit.value = 'hours';
            modalDurationValue.value = totalHours;
        }

        modalNotes.value = data.notes || '';

        const modalContent = modal.querySelector('.modal-content');
        if (useGrowAnimation) {
            modalContent.classList.add('grow-out');
        } else {
            modalContent.classList.remove('grow-out');
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    }

    function hideModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    function saveModalData() {
        const { activity, dateKey } = selectedCell;
        if (!activity || !dateKey) return;

        const completed = modalCompleted.checked;

        // Parse Duration
        let val = parseFloat(modalDurationValue.value);
        if (isNaN(val) || val < 0) val = 0;

        const unit = modalDurationUnit.value;
        let finalHours = 0;

        // Convert everything to hours for storage
        if (unit === 'minutes') {
            finalHours = val / 60;
        } else {
            finalHours = val;
        }

        const notes = modalNotes.value.trim();

        if (!completed && finalHours === 0 && !notes) {
            delete trackerData[activity][dateKey];
        } else {
            trackerData[activity][dateKey] = {
                completed,
                hours: finalHours,
                notes
            };
        }

        saveData();
        renderTracker();

        if (typeof calendarModal !== 'undefined' && calendarModal.classList.contains('active') && currentMobileActivity) {
            openActivityCalendar(currentMobileActivity);
        }

        hideModal();
    }

    function openActivityCalendar(activity) {
        currentMobileActivity = activity;
        calendarModalTitle.textContent = activity;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(currentDate);

        calendarGrid.innerHTML = '';

        for (let i = 1; i <= daysInMonth; i++) {
            const dateKey = formatDateKey(year, month, i);
            const cellData = trackerData[activity][dateKey];

            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.textContent = i;

            if (cellData) {
                dayCell.classList.add('has-data');
                if (cellData.completed) {
                    dayCell.classList.add('completed');
                    dayCell.innerHTML = `<span>${i}</span><i class="ri-check-line" style="position:absolute; bottom:2px; right:2px; font-size:10px;"></i>`;
                } else if (cellData.hours > 0) {
                    dayCell.classList.add('some-hours');
                }
            }

            dayCell.addEventListener('click', () => {
                // Zoom Out Animation for Calendar
                const calendarContent = calendarModal.querySelector('.calendar-modal-content');
                calendarContent.classList.add('zoom-out');

                // Wait for animation then switch
                setTimeout(() => {
                    calendarModal.classList.remove('active');
                    calendarModal.classList.add('hidden');
                    calendarContent.classList.remove('zoom-out'); // Reset

                    // Open logging modal
                    openModal(activity, dateKey, true);
                }, 300);
            });

            calendarGrid.appendChild(dayCell);
        }

        calendarModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            calendarModal.classList.add('active');
        });
    }

    // --- CSV Export ---
    function exportToCSV() {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Activity,Status,Hours,Notes\n";

        const activities = Object.keys(trackerData);
        let rows = [];

        activities.forEach(activity => {
            const dateKeys = Object.keys(trackerData[activity]).sort();
            dateKeys.forEach(date => {
                const entry = trackerData[activity][date];
                const status = entry.completed ? "Completed" : "In Progress";
                const notes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : "";

                rows.push(`${date},"${activity}",${status},${entry.hours},${notes}`);
            });
        });

        rows.sort();
        csvContent += rows.join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const filename = `tracker_export_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
