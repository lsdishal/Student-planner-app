const WindowManager = (() => {

    let zIndex = 100;
    let windows = new Map();
    // Cascading variables
    let startX = 50;
    let startY = 50;
    let offsetX = 50;
    let offsetY = 50;
    let step = 30;

    function createWindow(app) {
        const pid = SystemState.createProcess(app.name);

        const win = document.createElement("div");
        win.className = "window";
        win.dataset.pid = pid;
        win.style.zIndex = ++zIndex;

        // Cascade logic
        win.style.left = `${offsetX}px`;
        win.style.top = `${offsetY}px`;

        offsetX += step;
        offsetY += step;

        // Reset if offscreen roughly (screen width approx 1000ish usually)
        if (offsetX > 600 || offsetY > 400) {
            offsetX = startX;
            offsetY = startY;
        }

        // Added proper HTML structure for titlebar and content
        win.innerHTML = `
      <div class="titlebar">
        <span>${app.name}</span>
        <div class="controls">
          <button data-action="minimize">—</button>
          <button data-action="maximize">▢</button>
          <button data-action="close">✖</button>
        </div>
      </div>
      <div class="content"></div>
      <div class="resize-handle"></div>
    `;

        document.body.appendChild(win);
        windows.set(pid, win);

        app.render(win.querySelector(".content"));
        attachEvents(win);

        EventBus.emit("PROCESS_STARTED", { pid, name: app.name });
        return pid;
    }

    function attachEvents(win) {
        // Parse PID as integer because dataset stores it as string, 
        // but our Map 'windows' uses integer keys.
        const pid = parseInt(win.dataset.pid, 10);

        win.addEventListener("mousedown", () => {
            focusWindow(pid);
        });

        // Only select control buttons, not app content buttons
        win.querySelectorAll(".controls button").forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction(pid, btn.dataset.action);
            };
        });

        makeDraggable(win);
        makeResizable(win);
    }

    function handleAction(pid, action) {
        const win = windows.get(pid);
        if (!win) {
            console.error(`Window not found for PID: ${pid}`);
            return;
        }

        switch (action) {
            case "close":
                // Animation logic
                win.classList.add("closing");
                // Wait for animation frame or timeout
                setTimeout(() => {
                    win.remove();
                    windows.delete(pid);
                    SystemState.killProcess(pid);
                    EventBus.emit("PROCESS_KILLED", pid);
                }, 200); // Match CSS animation duration
                break;

            case "minimize":
                // Animate minimize using CSS class
                win.classList.add("minimizing");
                setTimeout(() => {
                    win.style.display = "none";
                    win.classList.remove("minimizing");
                }, 400); // Match CSS animation duration (0.4s)
                EventBus.emit("WINDOW_MINIMIZED", pid);
                break;

            case "maximize":
                win.style.transition = "all 0.3s ease";
                win.classList.toggle("maximized");
                // Remove transition after it's done so dragging isn't laggy
                setTimeout(() => { win.style.transition = ""; }, 300);
                break;
        }
    }

    function focusWindow(pid) {
        const win = windows.get(pid);
        if (!win) return;

        // Don't focus if minimizing or closing
        if (win.classList.contains("closing")) return;

        win.style.zIndex = ++zIndex;
        SystemState.focusProcess(pid);
    }

    function makeDraggable(win) {
        const bar = win.querySelector(".titlebar");
        let dx = 0, dy = 0, dragging = false;

        bar.onmousedown = e => {
            dragging = true;
            dx = e.clientX - win.offsetLeft;
            dy = e.clientY - win.offsetTop;
            win.style.transition = "none"; // Disable transition during drag
        };

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            e.preventDefault(); // Stop selection

            let newX = e.clientX - dx;
            let newY = e.clientY - dy;

            // Simple boundary to keep titlebar roughly on screen
            if (newY < 0) newY = 0;

            win.style.left = newX + "px";
            win.style.top = newY + "px";
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    function makeResizable(win) {
        const handle = win.querySelector(".resize-handle");
        let isResizing = false;
        let originalWidth, originalHeight, originalX, originalY;
        let minWidth = 300, minHeight = 200;

        handle.onmousedown = e => {
            e.stopPropagation();
            isResizing = true;
            originalWidth = parseFloat(getComputedStyle(win).width);
            originalHeight = parseFloat(getComputedStyle(win).height);
            originalX = e.clientX;
            originalY = e.clientY;
            win.style.transition = "none";
        };

        const onMouseMove = e => {
            if (!isResizing) return;
            e.preventDefault();

            const width = originalWidth + (e.clientX - originalX);
            const height = originalHeight + (e.clientY - originalY);

            if (width > minWidth) {
                win.style.width = width + "px";
            }
            if (height > minHeight) {
                win.style.height = height + "px";
            }
        };

        const onMouseUp = () => {
            isResizing = false;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    return { createWindow };

})();
