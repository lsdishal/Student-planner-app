class ODApp extends BaseApp {
    constructor() {
        super("OD Tracker");
        this.STORAGE_KEY = "webos_od_data";
        this.MAX_HOURS = 40;
        this.CLASS_MINS = 50;
        // data: { [semName]: { entries: [{id, date, reason, hours}] } }
        this.data = this._load();
        this.activeSem = Object.keys(this.data)[0] || null;
        this.container = null;
    }

    /* ─── Persistence ─── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }
    _save() { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data)); }

    /* ─── Calculations ─── */
    _usedHours(sem) {
        return (this.data[sem]?.entries || []).reduce((a, e) => a + (parseFloat(e.hours) || 0), 0);
    }
    _remaining(sem) {
        return Math.max(0, this.MAX_HOURS - this._usedHours(sem));
    }
    _classesLeft(sem) {
        const remMins = this._remaining(sem) * 60;
        return Math.floor(remMins / this.CLASS_MINS);
    }
    _pct(sem) {
        return Math.min(100, (this._usedHours(sem) / this.MAX_HOURS) * 100);
    }
    _statusColor(pct) {
        if (pct >= 90) return "#ff7675";
        if (pct >= 70) return "#fdcb6e";
        if (pct >= 40) return "#74b9ff";
        return "#55efc4";
    }
    _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    _fmtDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    /* ─── Render ─── */
    render(container) {
        this.container = container;
        container.classList.add("od-container");
        this._renderShell();
    }

    _renderShell() {
        this.container.innerHTML = `
            <div class="od-layout">
                <!-- Sidebar -->
                <aside class="od-sidebar">
                    <div class="od-sidebar-top">
                        <div class="od-brand">
                            <span class="od-brand-icon">🎟️</span>
                            <span class="od-brand-name">OD Tracker</span>
                        </div>
                        <button class="od-add-sem-btn" id="odAddSemBtn" title="Add Semester">＋</button>
                    </div>
                    <div class="od-sem-list" id="odSemList"></div>
                    <div class="od-sidebar-info">
                        <div class="od-info-row">⏱ 1 class = ${this.CLASS_MINS} min</div>
                        <div class="od-info-row">🎯 Max = ${this.MAX_HOURS} hrs / sem</div>
                    </div>
                </aside>

                <!-- Main -->
                <main class="od-main" id="odMain">
                    <div class="od-welcome" id="odWelcome">
                        <div class="od-welcome-icon">🎟️</div>
                        <h2>OD Hour Tracker</h2>
                        <p>Track on-duty hours per semester.<br>Max <strong>${this.MAX_HOURS} hours</strong> · Each class is <strong>${this.CLASS_MINS} min</strong>.</p>
                        <button class="od-btn od-btn-primary" id="odWelcomeAdd">＋ Add First Semester</button>
                    </div>
                </main>
            </div>

            <!-- Modal -->
            <div class="od-modal-overlay" id="odModalOverlay" style="display:none;">
                <div class="od-modal" id="odModalBox"></div>
            </div>
        `;

        this.container.querySelector("#odAddSemBtn").addEventListener("click", () => this._promptAddSem());
        this.container.querySelector("#odWelcomeAdd").addEventListener("click", () => this._promptAddSem());
        this.container.querySelector("#odModalOverlay").addEventListener("click", e => {
            if (e.target.id === "odModalOverlay") this._closeModal();
        });

        this._renderSidebar();
        if (this.activeSem) this._renderSemPanel(this.activeSem);
    }

    /* ─── Sidebar ─── */
    _renderSidebar() {
        const list = this.container.querySelector("#odSemList");
        if (!list) return;
        const sems = Object.keys(this.data);
        list.innerHTML = sems.map(sem => {
            const pct = this._pct(sem);
            const color = this._statusColor(pct);
            const used = this._usedHours(sem);
            const isActive = sem === this.activeSem;
            return `
                <div class="od-sem-item ${isActive ? "active" : ""}" data-sem="${sem}">
                    <div class="od-sem-item-top">
                        <span class="od-sem-name">${sem}</span>
                        <button class="od-sem-del" data-sem="${sem}" title="Delete">✕</button>
                    </div>
                    <div class="od-sem-mini-bar-wrap">
                        <div class="od-sem-mini-bar" style="width:${pct.toFixed(1)}%;background:${color}"></div>
                    </div>
                    <div class="od-sem-item-meta">
                        <span style="color:${color}">${used.toFixed(1)}h used</span>
                        <span class="od-sem-item-max">/ ${this.MAX_HOURS}h</span>
                    </div>
                </div>
            `;
        }).join("");

        list.querySelectorAll(".od-sem-item").forEach(item => {
            item.addEventListener("click", e => {
                if (e.target.classList.contains("od-sem-del")) return;
                this.activeSem = item.dataset.sem;
                this._renderSidebar();
                this._renderSemPanel(this.activeSem);
            });
        });
        list.querySelectorAll(".od-sem-del").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                this._confirmDeleteSem(btn.dataset.sem);
            });
        });
    }

    /* ─── Main Panel ─── */
    _renderSemPanel(sem) {
        const main = this.container.querySelector("#odMain");
        const entries = this.data[sem]?.entries || [];
        const used = this._usedHours(sem);
        const remaining = this._remaining(sem);
        const classesLeft = this._classesLeft(sem);
        const pct = this._pct(sem);
        const color = this._statusColor(pct);

        main.innerHTML = `
            <div class="od-panel">
                <!-- Header -->
                <div class="od-panel-header">
                    <div class="od-panel-title">
                        <h2>${sem}</h2>
                        <span class="od-panel-subtitle">${entries.length} entr${entries.length !== 1 ? "ies" : "y"}</span>
                    </div>
                    <button class="od-btn od-btn-primary" id="odAddEntryBtn">＋ Log OD Hours</button>
                </div>

                <!-- Stats Row -->
                <div class="od-stats-row">
                    <div class="od-stat-card od-stat-used">
                        <div class="od-stat-label">Hours Used</div>
                        <div class="od-stat-value" style="color:${color}">${used.toFixed(2)}</div>
                        <div class="od-stat-unit">/ ${this.MAX_HOURS} hrs</div>
                    </div>
                    <div class="od-stat-card od-stat-remaining">
                        <div class="od-stat-label">Hours Remaining</div>
                        <div class="od-stat-value" style="color:${remaining > 0 ? '#55efc4' : '#ff7675'}">${remaining.toFixed(2)}</div>
                        <div class="od-stat-unit">hrs left</div>
                    </div>
                    <div class="od-stat-card od-stat-classes">
                        <div class="od-stat-label">Classes Claimable</div>
                        <div class="od-stat-value" style="color:#a29bfe">${classesLeft}</div>
                        <div class="od-stat-unit">${this.CLASS_MINS}-min classes</div>
                    </div>
                    <div class="od-stat-card od-stat-pct">
                        <div class="od-stat-label">Utilisation</div>
                        <div class="od-stat-value" style="color:${color}">${pct.toFixed(1)}%</div>
                        <div class="od-stat-unit">of quota</div>
                    </div>
                </div>

                <!-- Progress bar -->
                <div class="od-progress-section">
                    <div class="od-progress-labels">
                        <span>0h</span>
                        <span style="color:${color};font-weight:700">${used.toFixed(2)}h used · ${remaining.toFixed(2)}h left · ${classesLeft} class${classesLeft !== 1 ? "es" : ""} claimable</span>
                        <span>${this.MAX_HOURS}h</span>
                    </div>
                    <div class="od-progress-track">
                        <div class="od-progress-fill" id="odProgressFill"
                             style="width:0%;background:linear-gradient(90deg,${color}99,${color})">
                        </div>
                        <div class="od-progress-marker" style="left:${Math.min(100, (this.MAX_HOURS - this.CLASS_MINS / 60 * Math.ceil(remaining / (this.CLASS_MINS / 60))) / this.MAX_HOURS * 100).toFixed(1)}%"></div>
                    </div>
                    <div class="od-progress-ticks">
                        ${[0, 10, 20, 30, 40].map(v => `<span class="${used >= v ? "tick-done" : ""}">${v}</span>`).join("")}
                    </div>
                </div>

                <!-- Calculator card -->
                <div class="od-calc-card">
                    <div class="od-calc-icon">🧮</div>
                    <div class="od-calc-body">
                        <div class="od-calc-title">OD Class Calculator</div>
                        <div class="od-calc-desc">With <strong>${remaining.toFixed(2)} hours</strong> remaining, you can claim up to:</div>
                        <div class="od-calc-result">
                            <span class="od-calc-num">${classesLeft}</span>
                            <span class="od-calc-lbl">more class${classesLeft !== 1 ? "es" : ""}</span>
                            <span class="od-calc-eq">= ${classesLeft} × ${this.CLASS_MINS} min = ${(classesLeft * this.CLASS_MINS / 60).toFixed(2)} hrs</span>
                        </div>
                        ${remaining > 0 ? `
                        <div class="od-calc-leftover">
                            Leftover after claiming: <strong>${(remaining - classesLeft * this.CLASS_MINS / 60).toFixed(2)} hrs</strong>
                            (${((remaining - classesLeft * this.CLASS_MINS / 60) * 60).toFixed(0)} min — not enough for 1 more class)
                        </div>` : `<div class="od-calc-exhausted">⚠️ OD quota fully utilised for this semester.</div>`}
                    </div>
                    <div class="od-calc-custom">
                        <label>Custom class length (min)</label>
                        <div class="od-calc-custom-row">
                            <input type="number" class="od-calc-custom-inp" id="odCustomMin" value="${this.CLASS_MINS}" min="1" max="180">
                            <span class="od-calc-custom-result" id="odCustomResult">${classesLeft} classes</span>
                        </div>
                    </div>
                </div>

                <!-- Entry list -->
                <div class="od-entries-section">
                    <div class="od-entries-header">
                        <h3>OD Log</h3>
                        ${entries.length > 0 ? `<span class="od-entries-total">${used.toFixed(2)} hrs total</span>` : ""}
                    </div>
                    ${entries.length === 0 ? `
                        <div class="od-entries-empty">
                            <div style="font-size:36px;margin-bottom:10px">📋</div>
                            <p>No OD hours logged yet.<br>Click <strong>＋ Log OD Hours</strong> to add one.</p>
                        </div>
                    ` : `
                        <div class="od-entry-list" id="odEntryList">
                            ${entries.slice().reverse().map((entry, revIdx) => {
                                const idx = entries.length - 1 - revIdx;
                                return `
                                    <div class="od-entry-row" data-id="${entry.id}">
                                        <div class="od-entry-date">${this._fmtDate(entry.date)}</div>
                                        <div class="od-entry-reason">${entry.reason || "—"}</div>
                                        <div class="od-entry-hours">
                                            <span class="od-entry-hrs-val">${parseFloat(entry.hours).toFixed(2)}</span>
                                            <span class="od-entry-hrs-lbl">hrs</span>
                                        </div>
                                        <div class="od-entry-classes-eq">${Math.floor(parseFloat(entry.hours) * 60 / this.CLASS_MINS)} class${Math.floor(parseFloat(entry.hours) * 60 / this.CLASS_MINS) !== 1 ? "es" : ""}</div>
                                        <button class="od-entry-del" data-sem="${sem}" data-idx="${idx}" title="Delete entry">🗑</button>
                                    </div>
                                `;
                            }).join("")}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Animate progress bar
        requestAnimationFrame(() => {
            const fill = main.querySelector("#odProgressFill");
            if (fill) fill.style.width = pct.toFixed(1) + "%";
        });

        // Add entry button
        main.querySelector("#odAddEntryBtn").addEventListener("click", () => this._promptAddEntry(sem));

        // Delete entry buttons
        main.querySelectorAll(".od-entry-del").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.idx);
                if (confirm("Delete this OD entry?")) {
                    this.data[sem].entries.splice(idx, 1);
                    this._save();
                    this._renderSidebar();
                    this._renderSemPanel(sem);
                }
            });
        });

        // Custom calculator
        const customInp = main.querySelector("#odCustomMin");
        const customResult = main.querySelector("#odCustomResult");
        if (customInp && customResult) {
            customInp.addEventListener("input", () => {
                const mins = parseInt(customInp.value) || 50;
                const classes = Math.floor(remaining * 60 / mins);
                customResult.textContent = `${classes} class${classes !== 1 ? "es" : ""}`;
            });
        }
    }

    /* ─── Modals ─── */
    _promptAddSem() {
        const existing = Object.keys(this.data);
        const nextNum = existing.length + 1;
        this._openModal(`
            <div class="od-modal-header">
                <span>📚</span><h3>Add Semester</h3>
            </div>
            <div class="od-modal-field">
                <label>Semester Name</label>
                <input id="odSemInp" class="od-modal-input" type="text"
                       value="Semester ${nextNum}" placeholder="e.g. Semester 3">
            </div>
            <div class="od-modal-actions">
                <button class="od-btn od-btn-ghost" id="odModalCancel">Cancel</button>
                <button class="od-btn od-btn-primary" id="odModalConfirm">Add</button>
            </div>
        `);
        const inp = this.container.querySelector("#odSemInp");
        inp.focus(); inp.select();
        this.container.querySelector("#odModalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#odModalConfirm").addEventListener("click", () => {
            const name = inp.value.trim();
            if (!name) return;
            if (this.data[name]) { alert("Semester already exists!"); return; }
            this.data[name] = { entries: [] };
            this._save();
            this.activeSem = name;
            this._closeModal();
            this._renderSidebar();
            this._renderSemPanel(name);
        });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#odModalConfirm").click(); });
    }

    _promptAddEntry(sem) {
        const today = new Date().toISOString().split("T")[0];
        const used = this._usedHours(sem);
        const remaining = this._remaining(sem);

        this._openModal(`
            <div class="od-modal-header">
                <span>🎟️</span><h3>Log OD Hours</h3>
                <span class="od-modal-sem-tag">${sem}</span>
            </div>
            <div class="od-modal-remaining-hint">
                <span class="od-hint-label">Remaining quota</span>
                <span class="od-hint-value">${remaining.toFixed(2)} hrs</span>
            </div>
            <div class="od-modal-field">
                <label>Date</label>
                <input id="odEntryDate" class="od-modal-input" type="date" value="${today}">
            </div>
            <div class="od-modal-field">
                <label>Event / Reason</label>
                <input id="odEntryReason" class="od-modal-input" type="text"
                       placeholder="e.g. Tech fest, Sports meet, Workshop">
            </div>
            <div class="od-modal-field">
                <label>OD Hours</label>
                <div class="od-modal-hours-row">
                    <input id="odEntryHours" class="od-modal-input od-hours-input" type="number"
                           min="0.1" max="${remaining}" step="0.25" placeholder="e.g. 4">
                    <span class="od-modal-hours-suffix">hrs</span>
                </div>
                <div class="od-modal-hours-hint" id="odHoursHint">
                    Enter hours to see equivalent classes
                </div>
                <div class="od-quick-hours">
                    ${[1, 2, 3, 4, 5, 6, 8].map(h => `<button class="od-quick-btn" data-h="${h}">${h}h</button>`).join("")}
                </div>
            </div>
            <div class="od-modal-actions">
                <button class="od-btn od-btn-ghost" id="odModalCancel">Cancel</button>
                <button class="od-btn od-btn-primary" id="odModalConfirm">Log Entry</button>
            </div>
        `);

        const dateInp  = this.container.querySelector("#odEntryDate");
        const reasonInp = this.container.querySelector("#odEntryReason");
        const hoursInp  = this.container.querySelector("#odEntryHours");
        const hint      = this.container.querySelector("#odHoursHint");

        // Live hint
        const updateHint = () => {
            const h = parseFloat(hoursInp.value);
            if (!h || h <= 0) { hint.innerHTML = "Enter hours to see equivalent classes"; hint.className = "od-modal-hours-hint"; return; }
            if (h > remaining) { hint.innerHTML = `⚠ Exceeds remaining quota (${remaining.toFixed(2)} hrs)`; hint.className = "od-modal-hours-hint od-hint-warn"; return; }
            const classes = Math.floor(h * 60 / this.CLASS_MINS);
            const leftMins = (h * 60) % this.CLASS_MINS;
            hint.innerHTML = `≈ ${classes} class${classes !== 1 ? "es" : ""} of ${this.CLASS_MINS} min${leftMins > 0 ? ` + ${leftMins.toFixed(0)} extra min` : ""}`;
            hint.className = "od-modal-hours-hint od-hint-ok";
        };
        hoursInp.addEventListener("input", updateHint);

        // Quick buttons
        this.container.querySelectorAll(".od-quick-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                hoursInp.value = btn.dataset.h;
                updateHint();
                this.container.querySelectorAll(".od-quick-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });

        this.container.querySelector("#odModalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#odModalConfirm").addEventListener("click", () => {
            const hours = parseFloat(hoursInp.value);
            if (!hours || hours <= 0) { hoursInp.style.borderColor = "#ff7675"; return; }
            if (hours > remaining + 0.001) {
                if (!confirm(`This (${hours}h) exceeds remaining quota (${remaining.toFixed(2)}h). Log anyway?`)) return;
            }
            this.data[sem].entries.push({
                id: this._uid(),
                date: dateInp.value,
                reason: reasonInp.value.trim() || "OD",
                hours
            });
            this._save();
            this._closeModal();
            this._renderSidebar();
            this._renderSemPanel(sem);
        });
        reasonInp.addEventListener("keydown", e => { if (e.key === "Enter") hoursInp.focus(); });
        hoursInp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#odModalConfirm").click(); });
        reasonInp.focus();
    }

    _confirmDeleteSem(sem) {
        if (!confirm(`Delete "${sem}" and all its OD logs? This cannot be undone.`)) return;
        delete this.data[sem];
        this._save();
        const remaining = Object.keys(this.data);
        this.activeSem = remaining[0] || null;
        this._renderSidebar();
        if (this.activeSem) this._renderSemPanel(this.activeSem);
        else {
            const main = this.container.querySelector("#odMain");
            main.innerHTML = `
                <div class="od-welcome">
                    <div class="od-welcome-icon">🎟️</div>
                    <h2>OD Hour Tracker</h2>
                    <p>No semesters yet. Add one to start tracking.</p>
                    <button class="od-btn od-btn-primary" id="odWelcomeAdd2">＋ Add Semester</button>
                </div>
            `;
            main.querySelector("#odWelcomeAdd2").addEventListener("click", () => this._promptAddSem());
        }
    }

    _openModal(html) {
        const overlay = this.container.querySelector("#odModalOverlay");
        const box = this.container.querySelector("#odModalBox");
        box.innerHTML = html;
        overlay.style.display = "flex";
    }
    _closeModal() {
        const overlay = this.container.querySelector("#odModalOverlay");
        if (overlay) overlay.style.display = "none";
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='od']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new ODApp());
    }
});
