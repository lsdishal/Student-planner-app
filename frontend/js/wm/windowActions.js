// windowActions.js
// Provides reusable window action helpers (focus, restore, etc.)
// Currently window actions are handled inside windowManager.js
// This stub exists for future extraction of action logic.

const WindowActions = (() => {

    function restoreWindow(pid) {
        const win = document.querySelector(`.window[data-pid='${pid}']`);
        if (!win) return;
        if (win.style.display === "none") {
            win.classList.add("restoring");
            win.style.display = "flex";
            setTimeout(() => win.classList.remove("restoring"), 400);
            EventBus.emit("WINDOW_RESTORED", pid);
        }
    }

    function bringToFront(pid) {
        const win = document.querySelector(`.window[data-pid='${pid}']`);
        if (!win) return;
        const mdown = new MouseEvent('mousedown', { bubbles: true });
        win.dispatchEvent(mdown);
    }

    return { restoreWindow, bringToFront };
})();
