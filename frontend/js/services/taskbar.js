/* ══════════════════════════════════════════════════════════════
   TASKBAR SERVICE — with dynamic pin / unpin support
   ══════════════════════════════════════════════════════════════ */

const TaskbarService = (() => {

    /* ── All known apps (data-app key → display info) ── */
    const ALL_APPS = {
        editor:     { icon: "📝", label: "Code Editor" },
        planner:    { icon: "📋", label: "Planner" },
        timer:      { icon: "⏲️", label: "Pomodoro" },
        terminal:   { icon: "💻", label: "Terminal" },
        browser:    { icon: "🌐", label: "Browser" },
        calculator: { icon: "🧮", label: "Calculator" },
        attendance: { icon: "📊", label: "Attendance" },
        study:      { icon: "📚", label: "Study Hub" },
        schedule:   { icon: "📅", label: "Timetable" },
        marks:      { icon: "🎯", label: "Marks" },
        fees:       { icon: "💳", label: "Fees Tracker" },
        grades:     { icon: "🏅", label: "Grades" },
        curriculum: { icon: "📚", label: "Curriculum" },
        od:         { icon: "🎟️", label: "OD Tracker" },
        profile:    { icon: "🧑‍🎓", label: "My Profile" },
        timetable:  { icon: "🗓️", label: "Timetable" },
        campus:     { icon: "🏠", label: "Campus Life" },
        messenger:  { icon: "💬", label: "Messenger" },
    };

    /* App name → icon map (used by running-app taskbar items) */
    const appIcons = {
        "Browser":          "🌐",
        "Attendance":       "📊",
        "Study Hub":        "📚",
        "Timetable":        "🗓️",
        "Student Mail":     "📧",
        "Notes":            "📝",
        "Calculator":       "🧮",
        "Terminal":         "💻",
        "Planner":          "📋",
        "Student Planner":  "📋",
        "Pomodoro":         "⏲️",
        "Pomodoro Timer":   "⏲️",
        "Code Editor":      "📝",
        "Marks":            "🎯",
        "Fees Tracker":     "💳",
        "Grades":           "🏅",
        "Curriculum":       "📚",
        "OD Tracker":       "🎟️",
        "My Profile":       "🧑‍🎓",
        "Campus Life":      "🏠",
        "Messenger":        "💬",
    };

    const STORAGE_KEY = "webos_pinned_apps";
    const DEFAULT_PINNED = ["browser", "terminal", "editor"];

    /* ── Context menu element ── */
    let ctxMenu = null;

    /* ─────────────────────────────────────────
       Persistence
    ───────────────────────────────────────── */
    function loadPinned() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [...DEFAULT_PINNED];
        } catch { return [...DEFAULT_PINNED]; }
    }

    function savePinned(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    /* ─────────────────────────────────────────
       Render pinned apps in the taskbar
    ───────────────────────────────────────── */
    function renderPinned() {
        const bar = document.getElementById("taskbar-items");
        if (!bar) return;

        // Remove all existing pinned buttons + separator
        bar.querySelectorAll(".taskbar-item.pinned, .separator").forEach(el => el.remove());

        const pinned = loadPinned();

        // Rebuild pinned buttons
        const frag = document.createDocumentFragment();

        pinned.forEach(appKey => {
            const info = ALL_APPS[appKey];
            if (!info) return;

            const btn = document.createElement("button");
            btn.className = "taskbar-item pinned";
            btn.dataset.app = appKey;
            btn.title = info.label;
            btn.innerHTML = `<span class="tb-pin-icon">${info.icon}</span>`;

            // Left click → launch
            btn.addEventListener("click", () => launchApp(appKey));

            // Right click → context menu
            btn.addEventListener("contextmenu", e => {
                e.preventDefault();
                showPinnedCtx(e, appKey, btn);
            });

            frag.appendChild(btn);
        });

        // Separator between pinned and running
        const sep = document.createElement("div");
        sep.className = "separator";
        frag.appendChild(sep);

        bar.prepend(frag);
    }

    /* ─────────────────────────────────────────
       Context menus
    ───────────────────────────────────────── */
    function createCtxMenu(items) {
        closeCtxMenu();
        ctxMenu = document.createElement("div");
        ctxMenu.className = "tb-ctx-menu";

        items.forEach(item => {
            if (item === "sep") {
                const d = document.createElement("div");
                d.className = "tb-ctx-sep";
                ctxMenu.appendChild(d);
                return;
            }
            const el = document.createElement("div");
            el.className = "tb-ctx-item" + (item.danger ? " danger" : "");
            el.innerHTML = `<span class="tb-ctx-icon">${item.icon}</span>${item.label}`;
            el.addEventListener("click", () => { closeCtxMenu(); item.action(); });
            ctxMenu.appendChild(el);
        });

        document.body.appendChild(ctxMenu);
        return ctxMenu;
    }

    function positionCtxMenu(e) {
        if (!ctxMenu) return;
        const menuW = 210, menuH = ctxMenu.offsetHeight || 160;
        let x = e.clientX, y = e.clientY - menuH - 10;
        if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
        if (y < 0) y = e.clientY + 10;
        ctxMenu.style.left = x + "px";
        ctxMenu.style.top  = y + "px";
    }

    function closeCtxMenu() {
        if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
    }

    /* Right-click on a PINNED taskbar button */
    function showPinnedCtx(e, appKey, btn) {
        const info = ALL_APPS[appKey] || { label: appKey, icon: "⚙️" };
        const menu = createCtxMenu([
            { icon: "🚀", label: `Open ${info.label}`,   action: () => launchApp(appKey) },
            "sep",
            { icon: "📌", label: "Unpin from Taskbar",   action: () => unpinApp(appKey), danger: false },
        ]);
        document.body.appendChild(menu);
        requestAnimationFrame(() => positionCtxMenu(e));
    }

    /* Right-click on a DESKTOP / START-MENU icon */
    function showAppCtx(e, appKey) {
        const info = ALL_APPS[appKey] || { label: appKey, icon: "⚙️" };
        const pinned = loadPinned();
        const isPinned = pinned.includes(appKey);

        const menu = createCtxMenu([
            { icon: "🚀", label: `Open ${info.label}`, action: () => launchApp(appKey) },
            "sep",
            isPinned
                ? { icon: "📌", label: "Unpin from Taskbar", action: () => unpinApp(appKey) }
                : { icon: "📌", label: "Pin to Taskbar",     action: () => pinApp(appKey) },
        ]);
        document.body.appendChild(menu);
        requestAnimationFrame(() => positionCtxMenu(e));
    }

    /* ─────────────────────────────────────────
       Pin / Unpin
    ───────────────────────────────────────── */
    function pinApp(appKey) {
        const list = loadPinned();
        if (!list.includes(appKey)) {
            list.push(appKey);
            savePinned(list);
            renderPinned();
            showToast(`📌 ${ALL_APPS[appKey]?.label || appKey} pinned to taskbar`);
        }
    }

    function unpinApp(appKey) {
        const list = loadPinned().filter(k => k !== appKey);
        savePinned(list);
        renderPinned();
        showToast(`🗑 ${ALL_APPS[appKey]?.label || appKey} unpinned`);
    }

    /* ─────────────────────────────────────────
       App launcher (same logic as before)
    ───────────────────────────────────────── */
    function launchApp(appKey) {
        const icon = document.querySelector(`.app-icon[data-app='${appKey}']`);
        if (icon) { icon.click(); return; }
        console.warn(`App '${appKey}' not found on desktop`);
    }

    /* ─────────────────────────────────────────
       Toast notification
    ───────────────────────────────────────── */
    function showToast(msg) {
        const t = document.createElement("div");
        t.className = "tb-toast";
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add("show"));
        setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 350); }, 2200);
    }

    /* ─────────────────────────────────────────
       Running-app taskbar events (existing logic)
    ───────────────────────────────────────── */
    EventBus.on("PROCESS_STARTED", (data) => {
        const bar = document.getElementById("taskbar-items");
        if (!bar) return;

        let pid, appName;
        if (typeof data === "object") { pid = data.pid; appName = data.name; }
        else { pid = data; appName = "Unknown"; }

        const btn = document.createElement("button");
        btn.className = "taskbar-item active";
        btn.dataset.pid = pid;
        btn.innerHTML = appIcons[appName] || "⚙️";
        btn.title = `${appName} (PID: ${pid})`;

        btn.addEventListener("click", () => {
            EventBus.emit("REQUEST_FOCUS", pid);
            const win = document.querySelector(`.window[data-pid='${pid}']`);
            if (win) {
                if (win.style.display === "none") {
                    win.classList.add("restoring");
                    win.style.display = "flex";
                    setTimeout(() => win.classList.remove("restoring"), 400);
                    EventBus.emit("WINDOW_RESTORED", pid);
                }
                win.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            }
        });

        bar.appendChild(btn);
    });

    EventBus.on("PROCESS_KILLED", pid => {
        const btn = document.querySelector(`.taskbar-item[data-pid='${pid}']`);
        if (btn) btn.remove();
    });

    /* ─────────────────────────────────────────
       Boot
    ───────────────────────────────────────── */
    document.addEventListener("DOMContentLoaded", () => {
        // Initial pin render
        renderPinned();

        // Start Menu toggle
        const startBtn  = document.getElementById("start-button");
        const startMenu = document.getElementById("start-menu");

        startBtn?.addEventListener("click", e => {
            e.stopPropagation();
            startMenu?.classList.toggle("hidden");
            startBtn.classList.toggle("active");
        });

        document.addEventListener("click", e => {
            if (!startMenu?.contains(e.target) && e.target !== startBtn) {
                startMenu?.classList.add("hidden");
                startBtn?.classList.remove("active");
            }
            // Close context menu on any click outside
            if (ctxMenu && !ctxMenu.contains(e.target)) closeCtxMenu();
        });

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") closeCtxMenu();
        });

        // Start Menu item: left-click = launch, right-click = pin ctx
        document.querySelectorAll(".start-item").forEach(item => {
            const key = item.dataset.app;
            item.addEventListener("click", () => {
                launchApp(key);
                startMenu?.classList.add("hidden");
                startBtn?.classList.remove("active");
            });
            item.addEventListener("contextmenu", e => {
                e.preventDefault();
                startMenu?.classList.add("hidden");
                startBtn?.classList.remove("active");
                showAppCtx(e, key);
            });
        });

        // Desktop icon: left-click handled by individual app files, right-click = pin ctx
        document.querySelectorAll(".app-icon").forEach(icon => {
            const key = icon.dataset.app;
            icon.addEventListener("contextmenu", e => {
                e.preventDefault();
                showAppCtx(e, key);
            });
        });

        // ── Power button → logout ──
        document.querySelector(".power-btn")?.addEventListener("click", () => {
            // Close start menu first
            startMenu?.classList.add("hidden");
            startBtn?.classList.remove("active");

            // Fade-out overlay
            const overlay = document.createElement("div");
            overlay.style.cssText =
                "position:fixed;inset:0;background:#000;opacity:0;" +
                "z-index:999999;transition:opacity 0.5s;pointer-events:all;";
            document.body.appendChild(overlay);

            requestAnimationFrame(() => { overlay.style.opacity = "1"; });

            setTimeout(() => {
                localStorage.removeItem("regNumber");
                window.location.href = "login.html";
            }, 520);
        });
    });

    return { pinApp, unpinApp, renderPinned };
})();
