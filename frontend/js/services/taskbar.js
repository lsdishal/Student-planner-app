const appIcons = {
    "Browser": "🌐",
    "Attendance": "📊",
    "Study Hub": "📚",
    "Timetable": "📅",
    "Student Mail": "📧",
    "Notes": "📝",
    "Calculator": "🧮",
    "Terminal": "💻"
};

EventBus.on("PROCESS_STARTED", (data) => {
    const customTaskbar = document.getElementById("taskbar-items");
    if (!customTaskbar) return;

    // Handle both old (pid only) and new ({pid, name}) formats for robustness
    let pid, appName;
    if (typeof data === 'object') {
        pid = data.pid;
        appName = data.name;
    } else {
        pid = data;
        appName = "Unknown";
    }

    const btn = document.createElement("button");
    btn.className = "taskbar-item active";
    btn.dataset.pid = pid;

    // Set icon based on app name
    const icon = appIcons[appName] || "⚙️";
    btn.innerHTML = icon;
    btn.title = `${appName} (PID: ${pid})`;

    btn.onclick = () => {
        EventBus.emit("REQUEST_FOCUS", pid);
        const win = document.querySelector(`.window[data-pid='${pid}']`);
        if (win) {
            if (win.style.display === "none") {
                win.classList.add("restoring");
                win.style.display = "flex"; // Restore
                setTimeout(() => {
                    win.classList.remove("restoring");
                }, 400);
                EventBus.emit("WINDOW_RESTORED", pid);
            }
            // If checking strict visibility or z-index could proceed here
            // Removing 'closing' class if it was about to close? No, that's dangerous.

            // Bring to front
            // Try standard focus logic
            const mdown = new MouseEvent('mousedown', { bubbles: true });
            win.dispatchEvent(mdown);
        }
    };

    customTaskbar.appendChild(btn);
});

EventBus.on("PROCESS_KILLED", pid => {
    const btn = document.querySelector(`.taskbar-item[data-pid='${pid}']`);
    if (btn) btn.remove();
});

// Start Menu & Pinned App Logic
document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-button");
    const startMenu = document.getElementById("start-menu");
    const desktop = document.getElementById("desktop");

    // Toggle Start Menu
    startBtn.onclick = (e) => {
        e.stopPropagation();
        startMenu.classList.toggle("hidden");
        startBtn.classList.toggle("active");
    };

    // Close Start Menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!startMenu.contains(e.target) && e.target !== startBtn) {
            startMenu.classList.add("hidden");
            startBtn.classList.remove("active");
        }
    });

    // Handle Pinned App Clicks (Taskbar)
    document.querySelectorAll(".taskbar-item.pinned").forEach(btn => {
        btn.onclick = () => {
            const appName = btn.dataset.app;
            launchApp(appName);
        };
    });

    // Handle Start Menu App Clicks
    document.querySelectorAll(".start-item").forEach(item => {
        item.onclick = () => {
            const appName = item.dataset.app;
            launchApp(appName);
            startMenu.classList.add("hidden");
        };
    });

    function launchApp(appName) {
        // Find the app launcher in desktop grid and trigger it
        // Or better yet, we can instantiate directly if we map names to classes.
        // But for consistency with existing "desktop.js" or "index.html" logic which binds click handlers:
        // The existing logic binds clicks on .app-icon to WindowManager.
        // We can simulate a click on the desktop icon if strictly needed, OR we can instantiate directly.
        // Since we don't have global access to App classes here easily (they are in separate files), 
        // triggering the desktop icon click is a safe hack.

        const desktopIcon = document.querySelector(`.app-icon[data-app='${appName}']`);
        if (desktopIcon) {
            desktopIcon.click(); // Trigger the click handler attached in individual app js files
        } else {
            console.warn(`App ${appName} not found on desktop`);
        }
    }
});
