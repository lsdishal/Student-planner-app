const DesktopManager = (() => {
    /* ══════════════════════════════════════════
       DESKTOP ICON FREE DRAG
    ══════════════════════════════════════════ */

    const ICON_W = 80, ICON_H = 90, ICON_GAP = 15, ICON_PAD = 20;

    function getIconPosKey() {
        const reg = localStorage.getItem('regNumber') || 'default';
        return `webos_icon_positions_${reg}`;
    }

    function loadPositions() {
        const key = getIconPosKey();
        try { return JSON.parse(localStorage.getItem(key) || "{}"); }
        catch { return {}; }
    }

    function savePositions(pos) {
        const key = getIconPosKey();
        localStorage.setItem(key, JSON.stringify(pos));
    }

    /* Default grid layout — column-first, dynamically wrapping columns depending on desktop height */
    function defaultPosition(index) {
        const dh = document.getElementById("desktop")?.offsetHeight || window.innerHeight - 52;
        const maxRows = Math.max(1, Math.floor((dh - ICON_PAD * 2) / (ICON_H + ICON_GAP)));
        const col = Math.floor(index / maxRows);
        const row = index % maxRows;
        return {
            x: ICON_PAD + col * (ICON_W + ICON_GAP),
            y: ICON_PAD + row * (ICON_H + ICON_GAP)
        };
    }

    function clampToDesktop(x, y) {
        const dw = document.getElementById("desktop")?.offsetWidth  || window.innerWidth;
        const dh = document.getElementById("desktop")?.offsetHeight || window.innerHeight - 52;
        return {
            x: Math.max(0, Math.min(x, dw - ICON_W)),
            y: Math.max(0, Math.min(y, dh - ICON_H))
        };
    }

    function initDesktopIcons() {
        const icons = Array.from(document.querySelectorAll(".app-icon"));
        const saved = loadPositions();

        icons.forEach((icon, index) => {
            const key = icon.dataset.app;
            const pos = saved[key] || defaultPosition(index);
            const clamped = clampToDesktop(pos.x, pos.y);

            icon.style.left = clamped.x + "px";
            icon.style.top  = clamped.y + "px";

            makeIconDraggable(icon);
        });
    }

    function makeIconDraggable(icon) {
        const key = icon.dataset.app;
        let startX, startY, startLeft, startTop;
        let isDragging = false;
        let hasMoved = false;
        const DRAG_THRESHOLD = 5;

        icon.addEventListener("mousedown", e => {
            if (e.button !== 0) return;         // left-click only
            if (e.target.closest(".tb-ctx-menu")) return;

            startX    = e.clientX;
            startY    = e.clientY;
            startLeft = parseInt(icon.style.left) || 0;
            startTop  = parseInt(icon.style.top)  || 0;
            isDragging = true;
            hasMoved   = false;

            e.preventDefault();
        });

        document.addEventListener("mousemove", e => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Only enter "drag mode" after moving past threshold
            if (!hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            hasMoved = true;

            icon.classList.add("dragging");

            const clamped = clampToDesktop(startLeft + dx, startTop + dy);
            icon.style.left = clamped.x + "px";
            icon.style.top  = clamped.y + "px";
        });

        document.addEventListener("mouseup", e => {
            if (!isDragging) return;
            isDragging = false;

            if (hasMoved) {
                icon.classList.remove("dragging");

                // Save new position
                const positions = loadPositions();
                positions[key] = {
                    x: parseInt(icon.style.left),
                    y: parseInt(icon.style.top)
                };
                savePositions(positions);
            }
            // If not moved → it's a click, let it propagate normally
        });

        // Prevent click when drag occurred
        icon.addEventListener("click", e => {
            if (hasMoved) e.stopImmediatePropagation();
        }, true);
    }

    /* ══════════════════════════════════════════
       TASKBAR PINNED ICON DRAG-TO-REORDER
    ══════════════════════════════════════════ */

    let tbDragSrc = null;    // the button being dragged

    function initTaskbarDrag() {
        // Observe for new pinned items (taskbar.js re-renders them)
        const observer = new MutationObserver(() => attachTaskbarDrag());
        const bar = document.getElementById("taskbar-items");
        if (bar) observer.observe(bar, { childList: true });
        attachTaskbarDrag();
    }

    function attachTaskbarDrag() {
        document.querySelectorAll(".taskbar-item.pinned").forEach(btn => {
            if (btn.dataset.tbDrag) return;   // already attached
            btn.dataset.tbDrag = "1";

            btn.setAttribute("draggable", "true");

            btn.addEventListener("dragstart", e => {
                tbDragSrc = btn;
                btn.classList.add("tb-dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", btn.dataset.app);
            });

            btn.addEventListener("dragend", () => {
                tbDragSrc = null;
                clearTbDropIndicators();
                btn.classList.remove("tb-dragging");
            });

            btn.addEventListener("dragover", e => {
                e.preventDefault();
                if (!tbDragSrc || tbDragSrc === btn) return;
                e.dataTransfer.dropEffect = "move";
                clearTbDropIndicators();
                // Show indicator on left or right based on cursor position
                const rect = btn.getBoundingClientRect();
                const mid  = rect.left + rect.width / 2;
                btn.classList.add(e.clientX < mid ? "tb-drag-over-left" : "tb-drag-over-right");
            });

            btn.addEventListener("dragleave", () => {
                clearTbDropIndicators();
            });

            btn.addEventListener("drop", e => {
                e.preventDefault();
                if (!tbDragSrc || tbDragSrc === btn) return;

                const bar = document.getElementById("taskbar-items");
                const pinnedBtns = [...bar.querySelectorAll(".taskbar-item.pinned")];
                const srcIdx  = pinnedBtns.indexOf(tbDragSrc);
                const dstIdx  = pinnedBtns.indexOf(btn);

                // Determine insert before or after
                const rect = btn.getBoundingClientRect();
                const insertBefore = e.clientX < rect.left + rect.width / 2;

                // Reorder the DOM
                if (insertBefore) {
                    bar.insertBefore(tbDragSrc, btn);
                } else {
                    btn.after(tbDragSrc);
                }

                // Persist new order
                const newOrder = [...bar.querySelectorAll(".taskbar-item.pinned")]
                    .map(b => b.dataset.app)
                    .filter(Boolean);
                localStorage.setItem("webos_pinned_apps", JSON.stringify(newOrder));

                clearTbDropIndicators();
            });
        });
    }

    function clearTbDropIndicators() {
        document.querySelectorAll(".tb-drag-over-left, .tb-drag-over-right").forEach(el => {
            el.classList.remove("tb-drag-over-left", "tb-drag-over-right");
        });
    }

    /* ══════════════════════════════════════════
       BOOT
    ══════════════════════════════════════════ */
    document.addEventListener("DOMContentLoaded", () => {
        initDesktopIcons();
        initTaskbarDrag();
    });

    // Re-init icons if more are added later (future-proof)
    return {
        refreshIcons: initDesktopIcons,
        resetIconPositions() {
            const key = getIconPosKey();
            localStorage.removeItem(key);
            initDesktopIcons();
        }
    };
})();
