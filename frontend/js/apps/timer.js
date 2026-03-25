class TimerApp extends BaseApp {
    constructor() {
        super("Pomodoro Timer");
        this.workTime = 25;
        this.breakTime = 5;
        this.timeLeft = this.workTime * 60;
        this.interval = null;
        this.isBreak = false;
        this.totalDuration = this.workTime * 60;
    }

    render(container) {
        const style = document.createElement("style");
        style.textContent = `
            .pomodoro-wrapper {
                height: 100%;
                background: #0f0f1b;
                color: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Inter', sans-serif;
                overflow: hidden;
            }
            .timer-circle {
                position: relative;
                width: 260px;
                height: 260px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 30px;
            }
            .timer-circle svg {
                transform: rotate(-90deg);
                width: 100%;
                height: 100%;
            }
            .timer-circle circle {
                fill: none;
                stroke-width: 8;
                stroke-linecap: round;
            }
            .track { stroke: #1e1e2e; }
            .progress {
                stroke: #af40ff;
                stroke-dasharray: 785; /* 2 * PI * 125 */
                stroke-dashoffset: 0;
                transition: stroke-dashoffset 1s linear, stroke 0.5s;
                filter: drop-shadow(0 0 8px rgba(175, 64, 255, 0.6));
            }
            .time-text {
                position: absolute;
                font-size: 3.5rem;
                font-weight: 700;
                letter-spacing: -2px;
                font-variant-numeric: tabular-nums;
            }
            .timer-mode {
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 3px;
                color: #888;
                margin-bottom: 5px;
            }
            .timer-controls {
                display: flex;
                gap: 20px;
                z-index: 10;
            }
            .pomo-btn {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: #fff;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .pomo-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.1); }
            .pomo-btn.primary { background: #af40ff; border: none; box-shadow: 0 4px 15px rgba(175, 64, 255, 0.4); }
            .pomo-btn.primary:hover { background: #c269ff; }
            
            .pomo-settings {
                margin-top: 40px;
                display: flex;
                gap: 15px;
                font-size: 0.8rem;
                color: #666;
                align-items: center;
            }
            .pomo-settings input {
                width: 40px;
                background: #1e1e2e;
                border: 1px solid #333;
                color: #fff;
                padding: 4px;
                border-radius: 4px;
                text-align: center;
            }
        `;
        container.appendChild(style);

        const content = document.createElement("div");
        content.className = "pomodoro-wrapper";
        content.innerHTML = `
            <div class="timer-mode" id="pomo-mode">Focus Session</div>
            <div class="timer-circle">
                <svg>
                    <circle class="track" cx="130" cy="130" r="125"></circle>
                    <circle class="progress" id="pomo-ring" cx="130" cy="130" r="125"></circle>
                </svg>
                <div class="time-text" id="pomo-display">25:00</div>
            </div>
            <div class="timer-controls">
                <button class="pomo-btn" id="pomo-reset" title="Reset">🔄</button>
                <button class="pomo-btn primary" id="pomo-toggle" title="Start">▶</button>
                <button class="pomo-btn" id="pomo-skip" title="Skip Session">⏭</button>
            </div>
            <div class="pomo-settings">
                <div>Work <input type="number" id="work-set" value="${this.workTime}"></div>
                <div>Break <input type="number" id="break-set" value="${this.breakTime}"></div>
            </div>
            <div id="pomo-history" style="margin-top: 20px; font-size: 0.75rem; color: #555; width: 100%; max-width: 200px;">
                <div style="border-top: 1px solid #222; padding-top: 10px; margin-bottom: 5px; text-align: center; color: #888;">Recent Sessions</div>
                <div id="history-items"></div>
            </div>
        `;
        container.appendChild(content);

        this.display = content.querySelector("#pomo-display");
        this.modeLabel = content.querySelector("#pomo-mode");
        this.ring = content.querySelector("#pomo-ring");
        this.toggleBtn = content.querySelector("#pomo-toggle");
        this.historyList = content.querySelector("#history-items");

        const workInput = content.querySelector("#work-set");
        const breakInput = content.querySelector("#break-set");

        content.querySelector("#pomo-toggle").onclick = () => this.toggle();
        content.querySelector("#pomo-reset").onclick = () => this.reset();
        content.querySelector("#pomo-skip").onclick = () => this.complete();

        const updateTimes = () => {
            this.workTime = parseInt(workInput.value) || 25;
            this.breakTime = parseInt(breakInput.value) || 5;
            if (!this.interval) this.reset();
        };

        workInput.onchange = updateTimes;
        breakInput.onchange = updateTimes;

        this.loadHistory();
        this.updateDisplay();
    }

    async logSession() {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            await fetch("http://localhost:5000/api/pomodoro/save", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_number: regNumber,
                    type: this.isBreak ? "break" : "focus",
                    duration: this.isBreak ? this.breakTime : this.workTime
                })
            });
            this.loadHistory();
        } catch (err) { console.error("Logging failed", err); }
    }

    async loadHistory() {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            const res = await fetch(`http://localhost:5000/api/pomodoro/history/${regNumber}`);
            const data = await res.json();
            this.historyList.innerHTML = data.slice(0, 5).map(s => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: ${s.type === 'focus' ? '#af40ff' : '#00e0b0'}">${s.type}</span>
                    <span>${s.duration}m</span>
                    <span style="color: #444">${s.timestamp.split(' ')[1]}</span>
                </div>
            `).join('');
        } catch (err) { }
    }

    toggle() {
        if (this.interval) {
            this.pause();
        } else {
            this.start();
        }
    }

    start() {
        if (this.interval) return;
        this.toggleBtn.innerText = "⏸";
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            if (this.timeLeft <= 0) this.complete();
        }, 1000);
    }

    pause() {
        clearInterval(this.interval);
        this.interval = null;
        this.toggleBtn.innerText = "▶";
    }

    reset() {
        this.pause();
        this.isBreak = false;
        this.timeLeft = this.workTime * 60;
        this.totalDuration = this.timeLeft;
        this.modeLabel.innerText = "Focus Session";
        this.modeLabel.style.color = "#888";
        this.ring.style.stroke = "#af40ff";
        this.ring.style.filter = "drop-shadow(0 0 8px rgba(175, 64, 255, 0.6))";
        this.updateDisplay();
    }

    async complete() {
        await this.logSession();
        this.pause();
        this.isBreak = !this.isBreak;
        if (this.isBreak) {
            this.timeLeft = this.breakTime * 60;
            this.modeLabel.innerText = "Break Time ☕";
            this.modeLabel.style.color = "#00e0b0";
            this.ring.style.stroke = "#00e0b0";
            this.ring.style.filter = "drop-shadow(0 0 8px rgba(0, 224, 176, 0.6))";
        } else {
            this.timeLeft = this.workTime * 60;
            this.modeLabel.innerText = "Focus Session";
            this.modeLabel.style.color = "#888";
            this.ring.style.stroke = "#af40ff";
            this.ring.style.filter = "drop-shadow(0 0 8px rgba(175, 64, 255, 0.6))";
        }
        this.totalDuration = this.timeLeft;
        this.updateDisplay();
        alert(this.isBreak ? "Time for a break!" : "Back to focus!");
    }

    updateDisplay() {
        const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
        const s = (this.timeLeft % 60).toString().padStart(2, '0');
        this.display.innerText = `${m}:${s}`;

        // Circular Progress calc
        const offset = 785 - (this.timeLeft / this.totalDuration) * 785;
        this.ring.style.strokeDashoffset = offset;
    }

    close() { this.pause(); }
}

// Register
EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='timer']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new TimerApp());
    }
});
