class MarksApp extends BaseApp {
    constructor() {
        super("Marks");
        this.STORAGE_KEY = "webos_marks_data";
        this.data = this._load();
        this.activeSem = Object.keys(this.data)[0] || null;
        this.container = null;

        // VIT-style max marks
        this.MAX = { CAT1: 50, CAT2: 50, FAT: 100 };
    }

    /* ─── Persistence ─── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }
    _save() { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data)); }

    /* ─── Render ─── */
    render(container) {
        this.container = container;
        container.classList.add("marks-container");
        container.innerHTML = `
            <div class="marks-layout">
                <!-- Sidebar: Semesters -->
                <aside class="marks-sidebar">
                    <div class="marks-sidebar-header">
                        <span>Semesters</span>
                        <button class="marks-add-sem-btn" id="addSemBtn" title="Add Semester">＋</button>
                    </div>
                    <div class="marks-sem-list" id="semList"></div>
                    <div class="marks-sidebar-footer" id="overallGpa"></div>
                </aside>

                <!-- Main Panel -->
                <main class="marks-main" id="marksMain">
                    <div class="marks-empty-state" id="marksEmptyState">
                        <div class="marks-empty-icon">📊</div>
                        <h2>No Semesters Yet</h2>
                        <p>Click <strong>＋</strong> to add your first semester</p>
                    </div>
                    <div class="marks-sem-panel" id="marksSemPanel" style="display:none;"></div>
                </main>
            </div>

            <!-- Modal -->
            <div class="marks-modal-overlay" id="marksModal" style="display:none;">
                <div class="marks-modal" id="marksModalBox"></div>
            </div>
        `;

        container.querySelector("#addSemBtn").addEventListener("click", () => this._promptAddSem());
        container.querySelector("#marksModal").addEventListener("click", e => {
            if (e.target.id === "marksModal") this._closeModal();
        });

        this._renderSidebar();
        if (this.activeSem) this._renderSemPanel(this.activeSem);
    }

    /* ─── Sidebar ─── */
    _renderSidebar() {
        const list = this.container.querySelector("#semList");
        list.innerHTML = "";
        const sems = Object.keys(this.data);

        sems.forEach(sem => {
            const gpa = this._calcSemGPA(sem);
            const el = document.createElement("div");
            el.className = "marks-sem-item" + (sem === this.activeSem ? " active" : "");
            el.innerHTML = `
                <div class="marks-sem-item-info">
                    <span class="marks-sem-item-name">${sem}</span>
                    <span class="marks-sem-item-gpa ${this._gradeClass(gpa.letter)}">${gpa.letter}</span>
                </div>
                <div class="marks-sem-item-sub">${this.data[sem].length} subject${this.data[sem].length !== 1 ? "s" : ""}</div>
            `;
            el.addEventListener("click", () => {
                this.activeSem = sem;
                this._renderSidebar();
                this._renderSemPanel(sem);
            });
            list.appendChild(el);
        });

        // Overall GPA
        const footer = this.container.querySelector("#overallGpa");
        if (sems.length > 0) {
            const total = sems.map(s => this._calcSemGPA(s).gpa).filter(g => g > 0);
            const avg = total.length ? (total.reduce((a, b) => a + b, 0) / total.length).toFixed(2) : "—";
            footer.innerHTML = `<span>Overall CGPA</span><strong>${avg}</strong>`;
        } else {
            footer.innerHTML = "";
        }
    }

    /* ─── Semester Panel ─── */
    _renderSemPanel(sem) {
        const main = this.container.querySelector("#marksMain");
        main.querySelector("#marksEmptyState").style.display = "none";
        const panel = main.querySelector("#marksSemPanel");
        panel.style.display = "flex";

        const subjects = this.data[sem] || [];
        const semGPA = this._calcSemGPA(sem);

        panel.innerHTML = `
            <div class="marks-sem-topbar">
                <div class="marks-sem-title">
                    <h2>${sem}</h2>
                    <span class="marks-sem-gpa-badge ${this._gradeClass(semGPA.letter)}">${semGPA.letter} · ${semGPA.gpa > 0 ? semGPA.gpa.toFixed(2) : "—"} GPA</span>
                </div>
                <div class="marks-sem-actions">
                    <button class="marks-btn marks-btn-primary" id="addSubjectBtn">＋ Add Subject</button>
                    <button class="marks-btn marks-btn-danger" id="delSemBtn">🗑 Delete Semester</button>
                </div>
            </div>

            <!-- Summary cards -->
            <div class="marks-summary-row" id="marksSummaryRow"></div>

            <!-- Subject table -->
            <div class="marks-table-wrap">
                ${subjects.length === 0 ? `
                    <div class="marks-no-subjects">
                        <p>No subjects yet. Click <strong>＋ Add Subject</strong> to begin.</p>
                    </div>
                ` : `
                    <table class="marks-table">
                        <thead>
                            <tr>
                                <th class="col-subject">Subject</th>
                                <th class="col-marks">CAT 1 <span class="col-max">/ ${this.MAX.CAT1}</span></th>
                                <th class="col-marks">CAT 2 <span class="col-max">/ ${this.MAX.CAT2}</span></th>
                                <th class="col-marks">FAT <span class="col-max">/ ${this.MAX.FAT}</span></th>
                                <th class="col-marks">Total <span class="col-max">/ 200</span></th>
                                <th class="col-pct">%</th>
                                <th class="col-grade">Grade</th>
                                <th class="col-actions"></th>
                            </tr>
                        </thead>
                        <tbody id="marksTableBody"></tbody>
                    </table>
                `}
            </div>
        `;

        panel.querySelector("#addSubjectBtn").addEventListener("click", () => this._promptAddSubject(sem));
        panel.querySelector("#delSemBtn").addEventListener("click", () => this._confirmDeleteSem(sem));

        this._renderSummary(sem);
        if (subjects.length > 0) this._renderTableBody(sem);
    }

    _renderSummary(sem) {
        const row = this.container.querySelector("#marksSummaryRow");
        if (!row) return;
        const subjects = this.data[sem] || [];
        if (subjects.length === 0) { row.innerHTML = ""; return; }

        const filled = subjects.filter(s => s.cat1 !== null || s.cat2 !== null || s.fat !== null);
        const avgPct = filled.length
            ? (filled.reduce((acc, s) => acc + this._pct(s), 0) / filled.length).toFixed(1)
            : null;
        const best = filled.sort((a, b) => this._pct(b) - this._pct(a))[0];
        const worst = filled.sort((a, b) => this._pct(a) - this._pct(b))[0];

        row.innerHTML = `
            <div class="marks-summary-card">
                <div class="marks-sc-label">Subjects</div>
                <div class="marks-sc-value">${subjects.length}</div>
            </div>
            <div class="marks-summary-card">
                <div class="marks-sc-label">Average</div>
                <div class="marks-sc-value ${avgPct !== null ? this._pctClass(parseFloat(avgPct)) : ""}">${avgPct !== null ? avgPct + "%" : "—"}</div>
            </div>
            <div class="marks-summary-card">
                <div class="marks-sc-label">Best Subject</div>
                <div class="marks-sc-value">${best ? `<span class="marks-sc-sub">${best.name}</span><span class="${this._pctClass(this._pct(best))}">${this._pct(best).toFixed(1)}%</span>` : "—"}</div>
            </div>
            <div class="marks-summary-card">
                <div class="marks-sc-label">Needs Work</div>
                <div class="marks-sc-value">${worst && this._pct(worst) < 60 ? `<span class="marks-sc-sub">${worst.name}</span><span class="${this._pctClass(this._pct(worst))}">${this._pct(worst).toFixed(1)}%</span>` : '<span style="color:#55efc4">All Good 🎉</span>'}</div>
            </div>
        `;
    }

    _renderTableBody(sem) {
        const tbody = this.container.querySelector("#marksTableBody");
        if (!tbody) return;
        const subjects = this.data[sem];
        tbody.innerHTML = "";

        subjects.forEach((sub, idx) => {
            const pct = this._pct(sub);
            const grade = this._grade(pct, sub);
            const tr = document.createElement("tr");
            tr.className = "marks-row";
            tr.innerHTML = `
                <td class="col-subject">
                    <div class="marks-sub-name">${sub.name}</div>
                    <div class="marks-sub-code">${sub.code || ""}</div>
                </td>
                <td class="col-marks">
                    <input class="marks-input" type="number" min="0" max="${this.MAX.CAT1}"
                           value="${sub.cat1 ?? ""}" placeholder="—"
                           data-idx="${idx}" data-field="cat1">
                </td>
                <td class="col-marks">
                    <input class="marks-input" type="number" min="0" max="${this.MAX.CAT2}"
                           value="${sub.cat2 ?? ""}" placeholder="—"
                           data-idx="${idx}" data-field="cat2">
                </td>
                <td class="col-marks">
                    <input class="marks-input" type="number" min="0" max="${this.MAX.FAT}"
                           value="${sub.fat ?? ""}" placeholder="—"
                           data-idx="${idx}" data-field="fat">
                </td>
                <td class="col-marks marks-total">${this._total(sub) ?? "—"}</td>
                <td class="col-pct ${this._pctClass(pct)}">${pct > 0 ? pct.toFixed(1) + "%" : "—"}</td>
                <td class="col-grade">
                    <span class="marks-grade-badge ${this._gradeClass(grade.letter)}">${grade.letter}</span>
                </td>
                <td class="col-actions">
                    <button class="marks-row-del" data-idx="${idx}" title="Delete subject">✕</button>
                </td>
            `;

            // Inline edit listeners
            tr.querySelectorAll(".marks-input").forEach(inp => {
                inp.addEventListener("change", () => {
                    const i = parseInt(inp.dataset.idx);
                    const field = inp.dataset.field;
                    const val = inp.value === "" ? null : Math.min(parseFloat(inp.value), this.MAX[field.toUpperCase()]);
                    this.data[sem][i][field] = val;
                    if (val !== null) inp.value = val; // clamp display
                    this._save();
                    this._renderSemPanel(sem);
                    this._renderSidebar();
                });
                inp.addEventListener("focus", () => inp.select());
            });

            tr.querySelector(".marks-row-del").addEventListener("click", () => {
                if (confirm(`Delete "${sub.name}"?`)) {
                    this.data[sem].splice(idx, 1);
                    this._save();
                    this._renderSemPanel(sem);
                    this._renderSidebar();
                }
            });

            tbody.appendChild(tr);
        });
    }

    /* ─── Modals ─── */
    _promptAddSem() {
        const existing = Object.keys(this.data);
        const nextNum = existing.length + 1;
        this._openModal(`
            <h3>Add Semester</h3>
            <div class="marks-modal-field">
                <label>Semester Name</label>
                <input id="semNameInput" class="marks-modal-input" type="text"
                       value="Semester ${nextNum}" placeholder="e.g. Semester 1">
            </div>
            <div class="marks-modal-actions">
                <button class="marks-btn marks-btn-ghost" id="modalCancel">Cancel</button>
                <button class="marks-btn marks-btn-primary" id="modalConfirm">Add</button>
            </div>
        `);
        const inp = this.container.querySelector("#semNameInput");
        inp.focus(); inp.select();
        this.container.querySelector("#modalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#modalConfirm").addEventListener("click", () => {
            const name = inp.value.trim();
            if (!name) return;
            if (this.data[name]) { alert("Semester already exists!"); return; }
            this.data[name] = [];
            this._save();
            this.activeSem = name;
            this._closeModal();
            this._renderSidebar();
            this._renderSemPanel(name);
        });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#modalConfirm").click(); });
    }

    _promptAddSubject(sem) {
        this._openModal(`
            <h3>Add Subject</h3>
            <div class="marks-modal-field">
                <label>Subject Name</label>
                <input id="subNameInput" class="marks-modal-input" type="text" placeholder="e.g. Data Structures">
            </div>
            <div class="marks-modal-field">
                <label>Subject Code <span style="opacity:0.5">(optional)</span></label>
                <input id="subCodeInput" class="marks-modal-input" type="text" placeholder="e.g. CSE2001">
            </div>
            <div class="marks-modal-actions">
                <button class="marks-btn marks-btn-ghost" id="modalCancel">Cancel</button>
                <button class="marks-btn marks-btn-primary" id="modalConfirm">Add Subject</button>
            </div>
        `);
        const nameInp = this.container.querySelector("#subNameInput");
        const codeInp = this.container.querySelector("#subCodeInput");
        nameInp.focus();
        this.container.querySelector("#modalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#modalConfirm").addEventListener("click", () => {
            const name = nameInp.value.trim();
            if (!name) { nameInp.style.borderColor = "#ff7675"; return; }
            this.data[sem].push({ name, code: codeInp.value.trim(), cat1: null, cat2: null, fat: null });
            this._save();
            this._closeModal();
            this._renderSemPanel(sem);
            this._renderSidebar();
        });
        nameInp.addEventListener("keydown", e => { if (e.key === "Enter") codeInp.focus(); });
        codeInp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#modalConfirm").click(); });
    }

    _confirmDeleteSem(sem) {
        if (!confirm(`Delete "${sem}" and ALL its data? This cannot be undone.`)) return;
        delete this.data[sem];
        this._save();
        const remaining = Object.keys(this.data);
        this.activeSem = remaining[0] || null;
        this._renderSidebar();
        const panel = this.container.querySelector("#marksSemPanel");
        const empty = this.container.querySelector("#marksEmptyState");
        if (this.activeSem) {
            this._renderSemPanel(this.activeSem);
        } else {
            panel.style.display = "none";
            empty.style.display = "flex";
        }
    }

    _openModal(html) {
        const overlay = this.container.querySelector("#marksModal");
        const box = this.container.querySelector("#marksModalBox");
        box.innerHTML = html;
        overlay.style.display = "flex";
    }
    _closeModal() {
        this.container.querySelector("#marksModal").style.display = "none";
    }

    /* ─── Calculations ─── */
    _total(sub) {
        const c1 = sub.cat1 ?? 0, c2 = sub.cat2 ?? 0, fat = sub.fat ?? 0;
        if (sub.cat1 === null && sub.cat2 === null && sub.fat === null) return null;
        return c1 + c2 + fat;
    }
    _pct(sub) {
        const t = this._total(sub);
        if (t === null) return 0;
        const maxTotal = this.MAX.CAT1 + this.MAX.CAT2 + this.MAX.FAT; // 200
        return (t / maxTotal) * 100;
    }
    _grade(pct, sub) {
        if (this._total(sub) === null) return { letter: "—", points: 0 };
        if (pct >= 91) return { letter: "O",  points: 10 };
        if (pct >= 81) return { letter: "A+", points: 9 };
        if (pct >= 71) return { letter: "A",  points: 8 };
        if (pct >= 61) return { letter: "B+", points: 7 };
        if (pct >= 51) return { letter: "B",  points: 6 };
        if (pct >= 45) return { letter: "C",  points: 5 };
        return { letter: "F", points: 0 };
    }
    _calcSemGPA(sem) {
        const subs = (this.data[sem] || []).filter(s => this._total(s) !== null);
        if (!subs.length) return { gpa: 0, letter: "—" };
        const totalPts = subs.reduce((acc, s) => acc + this._grade(this._pct(s), s).points, 0);
        const gpa = totalPts / subs.length;
        const avg = subs.reduce((acc, s) => acc + this._pct(s), 0) / subs.length;
        return { gpa, letter: this._grade(avg, subs[0]).letter };
    }
    _gradeClass(letter) {
        const map = { "O":"grade-o","A+":"grade-aplus","A":"grade-a","B+":"grade-bplus","B":"grade-b","C":"grade-c","F":"grade-f" };
        return map[letter] || "";
    }
    _pctClass(pct) {
        if (pct >= 75) return "pct-high";
        if (pct >= 50) return "pct-mid";
        return "pct-low";
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='marks']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new MarksApp());
    }
});
