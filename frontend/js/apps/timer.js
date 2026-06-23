class TimerApp extends BaseApp {
    constructor() {
        super("Pomodoro Timer");

        const saved = this.getSavedSettings();
        this.workTime = saved.work;
        this.breakTime = saved.break;
        this.timeLeft = this.workTime * 60;
        this.totalDuration = this.timeLeft;
        this.interval = null;
        this.isBreak = false;
        this.endsAt = null;
    }

    getSavedSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem("pomodoroSettings"));
            return {
                work: this.clampMinutes(saved?.work, 25, 180),
                break: this.clampMinutes(saved?.break, 5, 60)
            };
        } catch (error) {
            return { work: 25, break: 5 };
        }
    }

    clampMinutes(value, fallback, maximum) {
        const minutes = Math.round(Number(value));
        if (!Number.isFinite(minutes)) return fallback;
        return Math.min(Math.max(minutes, 1), maximum);
    }

    render(container) {
        const style = document.createElement("style");
        style.textContent = `
            .pomo-shell {
                --pomo-accent: #8b5cf6;
                --pomo-accent-soft: rgba(139, 92, 246, 0.18);
                width: 100%;
                height: 100%;
                min-height: 0;
                box-sizing: border-box;
                overflow: auto;
                padding: 16px;
                color: #f8fafc;
                background:
                    radial-gradient(circle at 16% 10%, rgba(139, 92, 246, 0.20), transparent 34%),
                    radial-gradient(circle at 92% 88%, rgba(14, 165, 233, 0.12), transparent 36%),
                    #0b1020;
                font-family: 'Inter', system-ui, sans-serif;
            }

            .pomo-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 12px;
            }

            .pomo-eyebrow {
                margin: 0 0 3px;
                color: #a78bfa;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.16em;
                text-transform: uppercase;
            }

            .pomo-title {
                margin: 0;
                font-size: 18px;
                line-height: 1.2;
            }

            .pomo-state {
                flex: 0 0 auto;
                padding: 6px 10px;
                border: 1px solid rgba(167, 139, 250, 0.25);
                border-radius: 999px;
                color: #c4b5fd;
                background: rgba(139, 92, 246, 0.10);
                font-size: 11px;
                font-weight: 700;
            }

            .pomo-dashboard {
                display: grid;
                grid-template-columns: minmax(250px, 1.2fr) minmax(210px, 0.8fr);
                gap: 12px;
                min-height: 270px;
            }

            .pomo-card {
                min-width: 0;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                background: rgba(15, 23, 42, 0.72);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.20);
            }

            .pomo-timer-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 12px;
            }

            .pomo-mode {
                margin-bottom: 6px;
                color: #c4b5fd;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            .pomo-ring {
                position: relative;
                width: 164px;
                height: 164px;
                display: grid;
                place-items: center;
            }

            .pomo-ring svg {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                transform: rotate(-90deg);
            }

            .pomo-ring circle {
                fill: none;
                stroke-width: 9;
            }

            .pomo-ring-track { stroke: rgba(255, 255, 255, 0.07); }

            .pomo-ring-progress {
                stroke: var(--pomo-accent);
                stroke-linecap: round;
                stroke-dasharray: 552.92;
                stroke-dashoffset: 0;
                transition: stroke-dashoffset 0.35s linear, stroke 0.25s ease;
                filter: drop-shadow(0 0 7px rgba(139, 92, 246, 0.45));
            }

            .pomo-time {
                position: relative;
                font-size: 38px;
                font-weight: 750;
                letter-spacing: -0.05em;
                font-variant-numeric: tabular-nums;
            }

            .pomo-time-caption {
                position: absolute;
                margin-top: 54px;
                color: #64748b;
                font-size: 10px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }

            .pomo-actions {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 8px;
            }

            .pomo-button {
                min-height: 38px;
                padding: 0 13px;
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 10px;
                color: #cbd5e1;
                background: rgba(255, 255, 255, 0.04);
                cursor: pointer;
                font: inherit;
                font-size: 12px;
                font-weight: 700;
                transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
            }

            .pomo-button:hover {
                transform: translateY(-1px);
                border-color: rgba(255, 255, 255, 0.18);
                background: rgba(255, 255, 255, 0.08);
            }

            .pomo-button-primary {
                min-width: 84px;
                border-color: transparent;
                color: #fff;
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                box-shadow: 0 8px 22px rgba(124, 58, 237, 0.30);
            }

            .pomo-button-primary:hover { background: linear-gradient(135deg, #9f75ff, #8b5cf6); }

            .pomo-side-card {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 14px;
                overflow: auto;
            }

            .pomo-section-title {
                margin: 0 0 8px;
                color: #e2e8f0;
                font-size: 12px;
                font-weight: 750;
            }

            .pomo-duration-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }

            .pomo-field {
                display: flex;
                flex-direction: column;
                gap: 5px;
                color: #94a3b8;
                font-size: 10px;
                font-weight: 700;
            }

            .pomo-field input {
                width: 100%;
                height: 36px;
                box-sizing: border-box;
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 9px;
                outline: none;
                color: #f8fafc;
                background: rgba(2, 6, 23, 0.60);
                padding: 0 9px;
                font: inherit;
                font-size: 13px;
            }

            .pomo-field input:focus {
                border-color: #8b5cf6;
                box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.13);
            }

            .pomo-apply {
                width: 100%;
                margin-top: 8px;
            }

            .pomo-help {
                margin: 6px 0 0;
                color: #64748b;
                font-size: 9px;
                line-height: 1.4;
            }

            .pomo-history {
                min-height: 0;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.07);
            }

            .pomo-history-items {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .pomo-history-row {
                display: grid;
                grid-template-columns: 1fr auto auto;
                gap: 8px;
                align-items: center;
                color: #64748b;
                font-size: 10px;
            }

            .pomo-history-type {
                color: #c4b5fd;
                font-weight: 700;
                text-transform: capitalize;
            }

            .pomo-empty { color: #64748b; font-size: 10px; }

            @media (max-width: 520px) {
                .pomo-dashboard { grid-template-columns: 1fr; }
                .pomo-ring { width: 150px; height: 150px; }
            }
        `;
        container.appendChild(style);

        this.content = document.createElement("div");
        this.content.className = "pomo-shell";
        this.content.innerHTML = `
            <header class="pomo-header">
                <div>
                    <p class="pomo-eyebrow">Deep work</p>
                    <h2 class="pomo-title">Make this session count.</h2>
                </div>
                <span class="pomo-state" id="pomo-state">Ready</span>
            </header>

            <div class="pomo-dashboard">
                <section class="pomo-card pomo-timer-card" aria-label="Pomodoro timer">
                    <div class="pomo-mode" id="pomo-mode">Focus session</div>
                    <div class="pomo-ring">
                        <svg viewBox="0 0 200 200" aria-hidden="true">
                            <circle class="pomo-ring-track" cx="100" cy="100" r="88"></circle>
                            <circle class="pomo-ring-progress" id="pomo-ring" cx="100" cy="100" r="88"></circle>
                        </svg>
                        <div class="pomo-time" id="pomo-display">${this.formatTime(this.timeLeft)}</div>
                        <div class="pomo-time-caption">minutes left</div>
                    </div>
                    <div class="pomo-actions">
                        <button class="pomo-button" id="pomo-reset" type="button" aria-label="Reset timer">Reset</button>
                        <button class="pomo-button pomo-button-primary" id="pomo-toggle" type="button">Start</button>
                        <button class="pomo-button" id="pomo-skip" type="button" aria-label="Skip session">Skip</button>
                    </div>
                </section>

                <aside class="pomo-card pomo-side-card">
                    <section>
                        <h3 class="pomo-section-title">Session lengths</h3>
                        <div class="pomo-duration-grid">
                            <label class="pomo-field" for="work-set">
                                Focus minutes
                                <input type="number" id="work-set" min="1" max="180" step="1" value="${this.workTime}">
                            </label>
                            <label class="pomo-field" for="break-set">
                                Break minutes
                                <input type="number" id="break-set" min="1" max="60" step="1" value="${this.breakTime}">
                            </label>
                        </div>
                        <button class="pomo-button pomo-apply" id="pomo-apply" type="button">Apply durations</button>
                        <p class="pomo-help">Focus: 1–180 min · Break: 1–60 min. Applying resets the current session.</p>
                    </section>

                    <section class="pomo-history">
                        <h3 class="pomo-section-title">Recent sessions</h3>
                        <div class="pomo-history-items" id="history-items">
                            <div class="pomo-empty">No completed sessions yet.</div>
                        </div>
                    </section>
                </aside>
            </div>
        `;
        container.appendChild(this.content);

        this.display = this.content.querySelector("#pomo-display");
        this.modeLabel = this.content.querySelector("#pomo-mode");
        this.stateLabel = this.content.querySelector("#pomo-state");
        this.ring = this.content.querySelector("#pomo-ring");
        this.toggleBtn = this.content.querySelector("#pomo-toggle");
        this.workInput = this.content.querySelector("#work-set");
        this.breakInput = this.content.querySelector("#break-set");
        this.historyList = this.content.querySelector("#history-items");

        this.toggleBtn.onclick = () => this.toggle();
        this.content.querySelector("#pomo-reset").onclick = () => this.reset();
        this.content.querySelector("#pomo-skip").onclick = () => this.switchMode(false);
        this.content.querySelector("#pomo-apply").onclick = () => this.applySettings();

        [this.workInput, this.breakInput].forEach(input => {
            input.onkeydown = event => {
                if (event.key === "Enter") this.applySettings();
            };
        });

        this.loadHistory();
        this.updateModeUI();
        this.updateDisplay();
    }

    applySettings() {
        this.workTime = this.clampMinutes(this.workInput.value, this.workTime, 180);
        this.breakTime = this.clampMinutes(this.breakInput.value, this.breakTime, 60);
        this.workInput.value = this.workTime;
        this.breakInput.value = this.breakTime;

        localStorage.setItem("pomodoroSettings", JSON.stringify({
            work: this.workTime,
            break: this.breakTime
        }));

        this.pause();
        this.timeLeft = (this.isBreak ? this.breakTime : this.workTime) * 60;
        this.totalDuration = this.timeLeft;
        this.stateLabel.innerText = "Updated";
        this.updateDisplay();
    }

    async logSession() {
        const regNumber = this.getRegNumber();
        if (!regNumber) return;

        try {
            const response = await fetch("/api/pomodoro/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    registration_number: regNumber,
                    type: this.isBreak ? "break" : "focus",
                    duration: this.isBreak ? this.breakTime : this.workTime
                })
            });
            if (!response.ok) throw new Error("Session could not be saved");
            await this.loadHistory();
        } catch (error) {
            console.error("Logging failed", error);
        }
    }

    async loadHistory() {
        const regNumber = this.getRegNumber();
        if (!regNumber) return;

        try {
            const response = await fetch(`/api/pomodoro/history/${regNumber}`);
            const data = await response.json();
            if (!response.ok || !Array.isArray(data)) return;

            if (data.length === 0) {
                this.historyList.innerHTML = '<div class="pomo-empty">No completed sessions yet.</div>';
                return;
            }

            this.historyList.innerHTML = data.slice(0, 4).map(session => `
                <div class="pomo-history-row">
                    <span class="pomo-history-type">${session.type}</span>
                    <span>${session.duration} min</span>
                    <span>${session.timestamp.split(" ")[1].slice(0, 5)}</span>
                </div>
            `).join("");
        } catch (error) {
            console.error("History failed", error);
        }
    }

    toggle() {
        if (this.interval) this.pause();
        else this.start();
    }

    start() {
        if (this.interval || this.timeLeft <= 0) return;

        this.endsAt = Date.now() + this.timeLeft * 1000;
        this.toggleBtn.innerText = "Pause";
        this.stateLabel.innerText = this.isBreak ? "Recharging" : "In focus";

        this.interval = setInterval(() => {
            this.timeLeft = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
            this.updateDisplay();

            if (this.timeLeft === 0) this.finishSession();
        }, 250);
    }

    pause() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.endsAt = null;
        if (this.toggleBtn) this.toggleBtn.innerText = "Start";
        if (this.stateLabel) this.stateLabel.innerText = "Paused";
    }

    reset() {
        this.pause();
        this.timeLeft = (this.isBreak ? this.breakTime : this.workTime) * 60;
        this.totalDuration = this.timeLeft;
        this.stateLabel.innerText = "Ready";
        this.updateDisplay();
    }

    async finishSession() {
        this.pause();
        this.stateLabel.innerText = "Complete";
        await this.logSession();
        this.switchMode(true);
    }

    switchMode(wasCompleted = false) {
        if (!wasCompleted) this.pause();
        this.isBreak = !this.isBreak;
        this.timeLeft = (this.isBreak ? this.breakTime : this.workTime) * 60;
        this.totalDuration = this.timeLeft;
        this.updateModeUI();
        this.stateLabel.innerText = this.isBreak ? "Break ready" : "Focus ready";
        this.updateDisplay();
    }

    updateModeUI() {
        if (!this.content) return;

        if (this.isBreak) {
            this.content.style.setProperty("--pomo-accent", "#14b8a6");
            this.content.style.setProperty("--pomo-accent-soft", "rgba(20, 184, 166, 0.18)");
            this.modeLabel.innerText = "Break session";
            this.modeLabel.style.color = "#5eead4";
            this.ring.style.filter = "drop-shadow(0 0 7px rgba(20, 184, 166, 0.45))";
        } else {
            this.content.style.setProperty("--pomo-accent", "#8b5cf6");
            this.content.style.setProperty("--pomo-accent-soft", "rgba(139, 92, 246, 0.18)");
            this.modeLabel.innerText = "Focus session";
            this.modeLabel.style.color = "#c4b5fd";
            this.ring.style.filter = "drop-shadow(0 0 7px rgba(139, 92, 246, 0.45))";
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
        const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
        return `${minutes}:${remainingSeconds}`;
    }

    updateDisplay() {
        if (!this.display || !this.ring) return;

        this.display.innerText = this.formatTime(this.timeLeft);
        const progress = this.totalDuration > 0 ? this.timeLeft / this.totalDuration : 0;
        this.ring.style.strokeDashoffset = 552.92 * (1 - progress);
    }

    close() {
        this.pause();
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='timer']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new TimerApp());
    }
});
