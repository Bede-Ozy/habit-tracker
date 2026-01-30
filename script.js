document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const STATE_KEY = 'challenge_tracker_data';
    // const DEFAULT_ACTIVITIES = []; // Removed defaults

    let currentDate = new Date();
    // We'll track data by 'YYYY-MM-DD' keys inside an activity object
    // Structure: { activityName: { '2026-01-01': { completed: true, hours: 2, notes: '' } } }
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
    const modalHours = document.getElementById('modal-hours');
    const modalNotes = document.getElementById('modal-notes');
    const saveLogBtn = document.getElementById('save-log-btn');

    // Add Activity Elements
    const newActivityInput = document.getElementById('new-activity-input');
    const addActivityBtn = document.getElementById('add-activity-btn');

    // Export Element
    const exportBtn = document.getElementById('export-btn');

    // Install Prompt Elements
    const installToast = document.getElementById('install-toast');
    const installBtn = document.getElementById('install-btn');
    const dismissInstallBtn = document.getElementById('dismiss-install');
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

    window.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
        if (e.target === calendarModal) {
            calendarModal.classList.remove('active');
            setTimeout(() => calendarModal.classList.add('hidden'), 300);
        }
    });

    saveLogBtn.addEventListener('click', saveModalData);

    addActivityBtn.addEventListener('click', addNewActivity);
    newActivityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewActivity();
    });

    exportBtn.addEventListener('click', exportToCSV);

    // --- PWA Install Logic ---
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        showInstallPromotion();
    });

    installBtn.addEventListener('click', async () => {
        hideInstallPromotion();
        // Show the install prompt
        if (deferredPrompt) {
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, discard it
            deferredPrompt = null;
        }
    });

    dismissInstallBtn.addEventListener('click', () => {
        hideInstallPromotion();
    });

    window.addEventListener('appinstalled', () => {
        // Hide the app-provided install promotion
        hideInstallPromotion();
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        console.log('PWA was installed');
    });

    function showInstallPromotion() {
        if (installToast) installToast.classList.remove('hidden');
    }

    function hideInstallPromotion() {
        if (installToast) installToast.classList.add('hidden');
    }

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
                // Only trigger on mobile (check window width or just always allow opening calendar view? 
                // Let's allow it always as a nice detail view, but it's essential for mobile.
                // We must avoid triggering if delete button was clicked (handled by stopPropagation there)
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

        // Load existing data if any
        const data = trackerData[activity][dateKey] || {};
        modalCompleted.checked = data.completed || false;
        modalHours.value = data.hours || '';
        modalNotes.value = data.notes || '';

        const modalContent = modal.querySelector('.modal-content');
        if (useGrowAnimation) {
            modalContent.classList.add('grow-out');
        } else {
            modalContent.classList.remove('grow-out');
        }

        modal.classList.remove('hidden');
        // Small timeout to allow CSS transition to capture opacity change
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    }

    function hideModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); // Match transition duration
    }

    function openActivityCalendar(activity) {
        currentMobileActivity = activity;
        calendarModalTitle.textContent = activity;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(currentDate);

        calendarGrid.innerHTML = '';

        // Simple grid of just dates 1..N
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
                // Close the calendar modal first
                calendarModal.classList.remove('active');
                setTimeout(() => {
                    calendarModal.classList.add('hidden');
                    // Open logging modal with animation AFTER calendar starts closing
                    openModal(activity, dateKey, true);
                }, 100); // Slight delay for smoother transition
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
        // Headers: Date, Activity, Status, Hours, Notes
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Activity,Status,Hours,Notes\n";

        const activities = Object.keys(trackerData);
        // We iterate specifically through the current displayed month or ALL data?
        // User asked for "monthly tracking sheet", usually implies the view.
        // Let's dump ALL data but sorted by date is better. 
        // Actually, easiest is iterating all our data structure.

        // Let's flatten the data
        let rows = [];

        activities.forEach(activity => {
            const dateKeys = Object.keys(trackerData[activity]).sort();
            dateKeys.forEach(date => {
                const entry = trackerData[activity][date];
                const status = entry.completed ? "Completed" : "In Progress";
                // Escape quotes in notes
                const notes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : "";

                rows.push(`${date},"${activity}",${status},${entry.hours},${notes}`);
            });
        });

        // Sort rows by date
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
