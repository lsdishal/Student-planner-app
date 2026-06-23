class GradesApp extends BaseApp {
    constructor() {
        super("Grades");
        this.STORAGE_KEY = "webos_marks_data";
        this.MAX = { CAT1: 50, CAT2: 50, FAT: 100 };
        this.activeSem = "all"; // "all" or a specific semester key
        this.container = null;
    }

    /* ─── Persistence (read-only from Marks app) ─── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }

    /* ─── Calculations (mirrored from MarksApp) ─── */
    _total(sub) {
        const c1 = sub.cat1 ?? 0, c2 = sub.cat2 ?? 0, fat = sub.fat ?? 0;
        if (sub.cat1 === null && sub.cat2 === null && sub.fat === null) return null;
        return c1 + c2 + fat;
    }
    _pct(sub) {
        const t = this._total(sub);
        if (t === null) return 0;
        return (t / (this.MAX.CAT1 + this.MAX.CAT2 + this.MAX.FAT)) * 100;
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
    _calcSemGPA(subjects) {
        const filled = subjects.filter(s => this._total(s) !== null);
        if (!filled.length) return { gpa: 0, letter: "—", count: 0 };
        const totalPts = filled.reduce((acc, s) => acc + this._grade(this._pct(s), s).points, 0);
        const gpa = totalPts / filled.length;
        const avgPct = filled.reduce((acc, s) => acc + this._pct(s), 0) / filled.length;
        return { gpa, letter: this._grade(avgPct, filled[0]).letter, count: filled.length };
    }
    _overallCGPA(data) {
        const sems = Object.keys(data);
        const gpas = sems.map(s => this._calcSemGPA(data[s])).filter(r => r.count > 0);
        if (!gpas.length) return null;
        return gpas.reduce((a, b) => a + b.gpa, 0) / gpas.length;
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
    _cgpaColor(cgpa) {
        if (cgpa === null) return "#555";
        if (cgpa >= 9)   return "#55efc4";
        if (cgpa >= 8)   return "#74b9ff";
        if (cgpa >= 7)   return "#a29bfe";
        if (cgpa >= 6)   return "#fdcb6e";
        if (cgpa >= 5)   return "#ff9f0a";
        return "#ff7675";
    }

    /* ─── Render ─── */
    render(container) {
        this.container = container;
        container.classList.add("grades-container");
        this._renderAll();
    }

    _renderAll() {
        const data = this._load();
        const sems = Object.keys(data);
        const cgpa = this._overallCGPA(data);
        const container = this.container;

        if (sems.length === 0) {
            container.innerHTML = `
                <div class="grades-empty">
                    <div class="grades-empty-icon">🎓</div>
                    <h2>No Grades Yet</h2>
                    <p>Add semesters and subjects in the <strong>Marks</strong> app first.</p>
                    <button class="grades-open-marks-btn" id="openMarksBtn">Open Marks App</button>
                </div>
            `;
            container.querySelector("#openMarksBtn").addEventListener("click", () => {
                WindowManager.createWindow(new MarksApp());
            });
            return;
        }

        // Build all-subjects flat list for "All Semesters" view
        const allSubjects = [];
        sems.forEach(sem => {
            (data[sem] || []).forEach(sub => {
                allSubjects.push({ ...sub, _sem: sem });
            });
        });

        container.innerHTML = `
            <div class="grades-layout">
                <!-- Top hero bar -->
                <div class="grades-hero">
                    <div class="grades-hero-left">
                        <div class="grades-hero-label">Overall CGPA</div>
                        <div class="grades-cgpa-ring-wrap">
                            <svg class="grades-ring" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" class="grades-ring-bg"/>
                                <circle cx="60" cy="60" r="52" class="grades-ring-fill" id="gradesRingFill"
                                    style="stroke: ${this._cgpaColor(cgpa)};"/>
                            </svg>
                            <div class="grades-ring-inner">
                                <span class="grades-cgpa-val" style="color:${this._cgpaColor(cgpa)}">${cgpa !== null ? cgpa.toFixed(2) : "—"}</span>
                                <span class="grades-cgpa-sub">/ 10.0</span>
                            </div>
                        </div>
                    </div>
                    <div class="grades-hero-stats">
                        ${this._renderHeroStats(data, sems, allSubjects, cgpa)}
                    </div>
                </div>

                <!-- Semester tabs -->
                <div class="grades-tabs" id="gradesTabs">
                    <button class="grades-tab ${this.activeSem === 'all' ? 'active' : ''}" data-sem="all">All Semesters</button>
                    ${sems.map(s => `
                        <button class="grades-tab ${this.activeSem === s ? 'active' : ''}" data-sem="${s}">${s}</button>
                    `).join("")}
                </div>

                <!-- Content -->
                <div class="grades-content" id="gradesContent">
                    ${this._renderContent(data, sems)}
                </div>
            </div>
        `;

        // Animate ring
        requestAnimationFrame(() => {
            const fill = container.querySelector("#gradesRingFill");
            if (fill && cgpa !== null) {
                const circ = 2 * Math.PI * 52; // ~326.7
                const pct = cgpa / 10;
                fill.style.strokeDasharray = `${circ * pct} ${circ * (1 - pct)}`;
            }
        });

        // Tab switching
        container.querySelector("#gradesTabs").addEventListener("click", e => {
            const btn = e.target.closest(".grades-tab");
            if (!btn) return;
            this.activeSem = btn.dataset.sem;
            this._renderAll();
        });
    }

    _renderHeroStats(data, sems, allSubjects, cgpa) {
        const filled = allSubjects.filter(s => this._total(s) !== null);
        const best = filled.slice().sort((a, b) => this._pct(b) - this._pct(a))[0];
        const worst = filled.slice().sort((a, b) => this._pct(a) - this._pct(b))[0];
        const gradeDistribution = { "O": 0, "A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0, "F": 0 };
        filled.forEach(s => {
            const g = this._grade(this._pct(s), s).letter;
            if (gradeDistribution[g] !== undefined) gradeDistribution[g]++;
        });

        return `
            <div class="grades-stat-grid">
                <div class="grades-stat-card">
                    <div class="grades-stat-icon">📚</div>
                    <div class="grades-stat-val">${sems.length}</div>
                    <div class="grades-stat-label">Semesters</div>
                </div>
                <div class="grades-stat-card">
                    <div class="grades-stat-icon">📋</div>
                    <div class="grades-stat-val">${allSubjects.length}</div>
                    <div class="grades-stat-label">Total Subjects</div>
                </div>
                <div class="grades-stat-card">
                    <div class="grades-stat-icon">🏆</div>
                    <div class="grades-stat-val ${best ? this._pctClass(this._pct(best)) : ''}">${best ? this._pct(best).toFixed(1) + "%" : "—"}</div>
                    <div class="grades-stat-label">${best ? best.name : "Best Subject"}</div>
                </div>
                <div class="grades-stat-card">
                    <div class="grades-stat-icon">📊</div>
                    <div class="grades-stat-val">${filled.length ? (filled.reduce((a, b) => a + this._pct(b), 0) / filled.length).toFixed(1) + "%" : "—"}</div>
                    <div class="grades-stat-label">Avg Score</div>
                </div>
            </div>
            <div class="grades-distribution">
                <div class="grades-dist-label">Grade Distribution</div>
                <div class="grades-dist-bars">
                    ${Object.entries(gradeDistribution).map(([g, count]) => `
                        <div class="grades-dist-item">
                            <span class="grades-dist-grade ${this._gradeClass(g)}">${g}</span>
                            <div class="grades-dist-bar-wrap">
                                <div class="grades-dist-bar ${this._gradeClass(g)}" style="width:${filled.length ? Math.round((count / filled.length) * 100) : 0}%"></div>
                            </div>
                            <span class="grades-dist-count">${count}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    _renderContent(data, sems) {
        if (this.activeSem === "all") {
            return this._renderAllSems(data, sems);
        } else {
            return this._renderSemDetail(data, this.activeSem);
        }
    }

    _renderAllSems(data, sems) {
        return `
            <div class="grades-sem-cards">
                ${sems.map(sem => {
                    const subjects = data[sem] || [];
                    const result = this._calcSemGPA(subjects);
                    const filled = subjects.filter(s => this._total(s) !== null);
                    const avgPct = filled.length
                        ? filled.reduce((a, s) => a + this._pct(s), 0) / filled.length
                        : 0;
                    return `
                        <div class="grades-sem-card" data-sem="${sem}">
                            <div class="grades-sem-card-head">
                                <div>
                                    <div class="grades-sem-card-title">${sem}</div>
                                    <div class="grades-sem-card-meta">${subjects.length} subject${subjects.length !== 1 ? "s" : ""} · ${filled.length} graded</div>
                                </div>
                                <div class="grades-sem-card-gpa">
                                    <span class="marks-grade-badge ${this._gradeClass(result.letter)}">${result.letter}</span>
                                    <span class="grades-sem-gpa-num" style="color:${this._cgpaColor(result.gpa)}">${result.gpa > 0 ? result.gpa.toFixed(2) : "—"}</span>
                                </div>
                            </div>
                            <div class="grades-sem-progress-wrap">
                                <div class="grades-sem-progress-bar" style="width:${avgPct.toFixed(1)}%; background:${this._cgpaColor(result.gpa)}"></div>
                            </div>
                            <div class="grades-sem-subjects-mini">
                                ${subjects.slice(0, 5).map(s => {
                                    const pct = this._pct(s);
                                    const g = this._grade(pct, s);
                                    return `<span class="grades-mini-chip ${this._gradeClass(g.letter)}" title="${s.name}">${g.letter}</span>`;
                                }).join("")}
                                ${subjects.length > 5 ? `<span class="grades-mini-more">+${subjects.length - 5}</span>` : ""}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    _renderSemDetail(data, sem) {
        const subjects = data[sem] || [];
        const result = this._calcSemGPA(subjects);
        const filled = subjects.filter(s => this._total(s) !== null);

        if (subjects.length === 0) {
            return `<div class="grades-no-subs"><p>No subjects in ${sem} yet. Add them via the <strong>Marks</strong> app.</p></div>`;
        }

        return `
            <div class="grades-detail-wrap">
                <div class="grades-detail-summary">
                    <div class="grades-detail-stat">
                        <span class="grades-detail-stat-val" style="color:${this._cgpaColor(result.gpa)}">${result.gpa > 0 ? result.gpa.toFixed(2) : "—"}</span>
                        <span class="grades-detail-stat-label">Semester GPA</span>
                    </div>
                    <div class="grades-detail-stat">
                        <span class="grades-detail-stat-val">${subjects.length}</span>
                        <span class="grades-detail-stat-label">Subjects</span>
                    </div>
                    <div class="grades-detail-stat">
                        <span class="grades-detail-stat-val ${filled.length ? this._pctClass(filled.reduce((a, s) => a + this._pct(s), 0) / filled.length) : ''}">
                            ${filled.length ? (filled.reduce((a, s) => a + this._pct(s), 0) / filled.length).toFixed(1) + "%" : "—"}
                        </span>
                        <span class="grades-detail-stat-label">Average Score</span>
                    </div>
                    <div class="grades-detail-stat">
                        <span class="grades-detail-stat-val">${filled.filter(s => this._grade(this._pct(s), s).letter === "O" || this._grade(this._pct(s), s).letter === "A+" || this._grade(this._pct(s), s).letter === "A").length}</span>
                        <span class="grades-detail-stat-label">Distinctions</span>
                    </div>
                </div>
                <div class="grades-subject-table-wrap">
                    <table class="grades-subject-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>CAT 1 <span class="col-max">/50</span></th>
                                <th>CAT 2 <span class="col-max">/50</span></th>
                                <th>FAT <span class="col-max">/100</span></th>
                                <th>Total <span class="col-max">/200</span></th>
                                <th>Score</th>
                                <th>Grade</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map(sub => {
                                const pct = this._pct(sub);
                                const g = this._grade(pct, sub);
                                const total = this._total(sub);
                                return `
                                    <tr class="grades-sub-row">
                                        <td class="grades-sub-name-cell">
                                            <div class="grades-sub-name">${sub.name}</div>
                                            ${sub.code ? `<div class="grades-sub-code">${sub.code}</div>` : ""}
                                        </td>
                                        <td class="grades-marks-cell">${sub.cat1 !== null ? sub.cat1 : '<span class="grades-dash">—</span>'}</td>
                                        <td class="grades-marks-cell">${sub.cat2 !== null ? sub.cat2 : '<span class="grades-dash">—</span>'}</td>
                                        <td class="grades-marks-cell">${sub.fat !== null ? sub.fat : '<span class="grades-dash">—</span>'}</td>
                                        <td class="grades-marks-cell grades-total-cell">${total !== null ? total : '<span class="grades-dash">—</span>'}</td>
                                        <td class="grades-pct-cell ${this._pctClass(pct)}">${pct > 0 ? pct.toFixed(1) + "%" : '<span class="grades-dash">—</span>'}</td>
                                        <td><span class="marks-grade-badge ${this._gradeClass(g.letter)}">${g.letter}</span></td>
                                        <td class="grades-pts-cell">${g.points > 0 ? g.points + ".0" : (total !== null ? "0.0" : "—")}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='grades']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new GradesApp());
    }
});
