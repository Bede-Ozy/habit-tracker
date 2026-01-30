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

    // Current selection for modal
    let selectedCell = { activity: null, dateStr: null };

    // --- Initialization ---
    renderTracker();

    // --- Event Listeners ---
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    closeModalBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    saveLogBtn.addEventListener('click', saveModalData);

    addActivityBtn.addEventListener('click', addNewActivity);
    newActivityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewActivity();
    });

    exportBtn.addEventListener('click', exportToCSV);

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

    function openModal(activity, dateKey) {
        selectedCell = { activity, dateKey };

        modalActivityTitle.textContent = activity;
        modalDateDisplay.textContent = new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Load existing data if any
        const data = trackerData[activity][dateKey] || {};
        modalCompleted.checked = data.completed || false;
        modalHours.value = data.hours || '';
        modalNotes.value = data.notes || '';

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

    function saveModalData() {
        const { activity, dateKey } = selectedCell;
        if (!activity || !dateKey) return;

        const completed = modalCompleted.checked;
        const hours = parseFloat(modalHours.value) || 0;
        const notes = modalNotes.value.trim();

        // If empty, user might be clearing it. 
        // We'll save if there's any data, otherwise delete the key to keep clean? 
        // For simplicity, just save.

        if (!completed && hours === 0 && !notes) {
            delete trackerData[activity][dateKey];
        } else {
            trackerData[activity][dateKey] = {
                completed,
                hours,
                notes
            };
        }

        saveData();
        renderTracker();
        hideModal();
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
