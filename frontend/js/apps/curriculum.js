class CurriculumApp extends BaseApp {
    constructor() {
        super("Curriculum");
        this.STORAGE_KEY = "webos_curriculum_data";
        // data shape: { [semName]: { [subjectName]: { name, size, type, b64, uploadedAt } } }
        this.data = this._load();
        this.activeSem = Object.keys(this.data)[0] || null;
        this.activeSub = null;
        this.viewerObjectURL = null;
        this.container = null;
        this.dragOver = false;
    }

    /* ─── Persistence ─── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }
    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            // localStorage quota exceeded (PDFs can be large)
            alert("Storage full! Please delete some files to free up space.");
        }
    }

    /* ─── Render entry ─── */
    render(container) {
        this.container = container;
        container.classList.add("curr-container");
        this._renderShell();
    }

    _renderShell() {
        this.container.innerHTML = `
            <div class="curr-layout">
                <!-- Left: Semester + Subject sidebar -->
                <aside class="curr-sidebar">
                    <div class="curr-sidebar-top">
                        <div class="curr-brand">
                            <span class="curr-brand-icon">📖</span>
                            <span class="curr-brand-name">Curriculum</span>
                        </div>
                        <button class="curr-add-sem-btn" id="currAddSemBtn" title="Add Semester">＋ Semester</button>
                    </div>

                    <div class="curr-sem-tree" id="currSemTree"></div>
                </aside>

                <!-- Right: main panel -->
                <main class="curr-main" id="currMain">
                    <div class="curr-welcome" id="currWelcome">
                        <div class="curr-welcome-icon">📚</div>
                        <h2>Your Curriculum</h2>
                        <p>Add a semester, then upload PDF syllabi for each subject.</p>
                        <button class="curr-btn curr-btn-primary" id="currWelcomeAddSem">＋ Add First Semester</button>
                    </div>
                </main>
            </div>

            <!-- Modals -->
            <div class="curr-modal-overlay" id="currModalOverlay" style="display:none;">
                <div class="curr-modal" id="currModalBox"></div>
            </div>
        `;

        this.container.querySelector("#currAddSemBtn").addEventListener("click", () => this._promptAddSem());
        this.container.querySelector("#currWelcomeAddSem").addEventListener("click", () => this._promptAddSem());
        this.container.querySelector("#currModalOverlay").addEventListener("click", e => {
            if (e.target.id === "currModalOverlay") this._closeModal();
        });

        this._renderTree();
        if (this.activeSem && this.activeSub) {
            this._showSubjectPanel(this.activeSem, this.activeSub);
        } else if (this.activeSem) {
            this._showSemPanel(this.activeSem);
        }
    }

    /* ─── Sidebar Tree ─── */
    _renderTree() {
        const tree = this.container.querySelector("#currSemTree");
        if (!tree) return;
        const sems = Object.keys(this.data);
        if (!sems.length) { tree.innerHTML = ""; return; }

        tree.innerHTML = sems.map(sem => {
            const subjects = Object.keys(this.data[sem] || {});
            const isOpen = sem === this.activeSem;
            return `
                <div class="curr-sem-node ${isOpen ? "open" : ""}" data-sem="${sem}">
                    <div class="curr-sem-row" data-sem="${sem}">
                        <span class="curr-sem-arrow">${isOpen ? "▾" : "▸"}</span>
                        <span class="curr-sem-label">${sem}</span>
                        <span class="curr-sem-count">${subjects.length}</span>
                        <button class="curr-sem-del" data-sem="${sem}" title="Delete semester">✕</button>
                    </div>
                    <div class="curr-sub-list ${isOpen ? "open" : ""}">
                        ${subjects.map(sub => {
                            const doc = this.data[sem][sub];
                            const isActive = sem === this.activeSem && sub === this.activeSub;
                            return `
                                <div class="curr-sub-item ${isActive ? "active" : ""}" data-sem="${sem}" data-sub="${sub}">
                                    <span class="curr-sub-icon">📄</span>
                                    <span class="curr-sub-label" title="${sub}">${sub}</span>
                                    ${doc ? '<span class="curr-sub-has-pdf" title="PDF uploaded">●</span>' : ""}
                                </div>
                            `;
                        }).join("")}
                        <div class="curr-add-sub-row" data-sem="${sem}">
                            <button class="curr-add-sub-btn" data-sem="${sem}">＋ Add Subject</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        // Sem row click → toggle / open sem panel
        tree.querySelectorAll(".curr-sem-row").forEach(row => {
            row.addEventListener("click", e => {
                if (e.target.classList.contains("curr-sem-del")) return;
                const sem = row.dataset.sem;
                if (this.activeSem === sem) {
                    // Toggle collapse
                    this.activeSem = null;
                    this.activeSub = null;
                } else {
                    this.activeSem = sem;
                    this.activeSub = null;
                }
                this._renderTree();
                if (this.activeSem) this._showSemPanel(this.activeSem);
                else this._showWelcome();
            });
        });

        // Subject item click
        tree.querySelectorAll(".curr-sub-item").forEach(item => {
            item.addEventListener("click", () => {
                this.activeSem = item.dataset.sem;
                this.activeSub = item.dataset.sub;
                this._renderTree();
                this._showSubjectPanel(this.activeSem, this.activeSub);
            });
        });

        // Delete semester
        tree.querySelectorAll(".curr-sem-del").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                this._confirmDeleteSem(btn.dataset.sem);
            });
        });

        // Add subject buttons
        tree.querySelectorAll(".curr-add-sub-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                this._promptAddSubject(btn.dataset.sem);
            });
        });
    }

    /* ─── Main Panel Views ─── */
    _showWelcome() {
        const main = this.container.querySelector("#currMain");
        main.innerHTML = `
            <div class="curr-welcome" id="currWelcome">
                <div class="curr-welcome-icon">📚</div>
                <h2>Your Curriculum</h2>
                <p>Add a semester, then upload PDF syllabi for each subject.</p>
                <button class="curr-btn curr-btn-primary" id="currWelcomeAddSem">＋ Add First Semester</button>
            </div>
        `;
        main.querySelector("#currWelcomeAddSem").addEventListener("click", () => this._promptAddSem());
    }

    _showSemPanel(sem) {
        const main = this.container.querySelector("#currMain");
        const subjects = Object.keys(this.data[sem] || {});
        const uploadedCount = subjects.filter(s => !!this.data[sem][s]).length;

        main.innerHTML = `
            <div class="curr-sem-panel">
                <div class="curr-sem-header">
                    <div class="curr-sem-header-info">
                        <h2>📖 ${sem}</h2>
                        <div class="curr-sem-header-meta">
                            <span>${subjects.length} subject${subjects.length !== 1 ? "s" : ""}</span>
                            <span class="curr-sep">·</span>
                            <span class="${uploadedCount > 0 ? "curr-uploaded-count" : "curr-missing-count"}">${uploadedCount} PDF${uploadedCount !== 1 ? "s" : ""} uploaded</span>
                        </div>
                    </div>
                    <button class="curr-btn curr-btn-primary" id="currAddSubBtn">＋ Add Subject</button>
                </div>

                <div class="curr-subject-grid" id="currSubjectGrid">
                    ${subjects.length === 0 ? `
                        <div class="curr-grid-empty">
                            <div style="font-size:40px;margin-bottom:12px">📂</div>
                            <p>No subjects yet.<br>Click <strong>＋ Add Subject</strong> to start.</p>
                        </div>
                    ` : subjects.map(sub => {
                        const doc = this.data[sem][sub];
                        return `
                            <div class="curr-subject-card ${doc ? "has-pdf" : "no-pdf"}" data-sem="${sem}" data-sub="${sub}">
                                <div class="curr-card-icon">${doc ? "📄" : "📭"}</div>
                                <div class="curr-card-name">${sub}</div>
                                ${doc ? `
                                    <div class="curr-card-filename">${doc.name}</div>
                                    <div class="curr-card-size">${this._fmtSize(doc.size)}</div>
                                    <div class="curr-card-actions">
                                        <button class="curr-card-btn curr-view-btn" data-sem="${sem}" data-sub="${sub}">👁 View</button>
                                        <button class="curr-card-btn curr-replace-btn" data-sem="${sem}" data-sub="${sub}">🔄 Replace</button>
                                    </div>
                                ` : `
                                    <div class="curr-card-upload-hint">No PDF yet</div>
                                    <button class="curr-card-btn curr-upload-btn" data-sem="${sem}" data-sub="${sub}">⬆ Upload PDF</button>
                                `}
                                <button class="curr-card-del-sub" data-sem="${sem}" data-sub="${sub}" title="Delete subject">✕</button>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;

        main.querySelector("#currAddSubBtn").addEventListener("click", () => this._promptAddSubject(sem));

        main.querySelectorAll(".curr-view-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                this.activeSub = btn.dataset.sub;
                this._renderTree();
                this._showSubjectPanel(btn.dataset.sem, btn.dataset.sub);
            });
        });
        main.querySelectorAll(".curr-replace-btn, .curr-upload-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                this._triggerFileUpload(btn.dataset.sem, btn.dataset.sub);
            });
        });
        main.querySelectorAll(".curr-card-del-sub").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                this._confirmDeleteSubject(btn.dataset.sem, btn.dataset.sub);
            });
        });

        // Card click → open viewer
        main.querySelectorAll(".curr-subject-card.has-pdf").forEach(card => {
            card.addEventListener("click", e => {
                if (e.target.closest("button")) return;
                this.activeSub = card.dataset.sub;
                this._renderTree();
                this._showSubjectPanel(card.dataset.sem, card.dataset.sub);
            });
        });
    }

    _showSubjectPanel(sem, sub) {
        const main = this.container.querySelector("#currMain");
        const doc = this.data[sem]?.[sub];

        // Revoke old blob URL
        if (this.viewerObjectURL) {
            URL.revokeObjectURL(this.viewerObjectURL);
            this.viewerObjectURL = null;
        }

        main.innerHTML = `
            <div class="curr-viewer-panel">
                <div class="curr-viewer-topbar">
                    <button class="curr-back-btn" id="currBackBtn">← ${sem}</button>
                    <div class="curr-viewer-title">
                        <span class="curr-viewer-sub-name">${sub}</span>
                        ${doc ? `<span class="curr-viewer-doc-name">${doc.name} · ${this._fmtSize(doc.size)}</span>` : ""}
                    </div>
                    <div class="curr-viewer-actions">
                        ${doc ? `
                            <button class="curr-btn curr-btn-ghost" id="currDownloadBtn">⬇ Download</button>
                            <button class="curr-btn curr-btn-secondary" id="currReplaceBtn">🔄 Replace PDF</button>
                        ` : ""}
                        <button class="curr-btn curr-btn-primary" id="currUploadBtn">${doc ? "" : "⬆ Upload PDF"}</button>
                        <button class="curr-card-del-sub-inline" id="currDelSubBtn" title="Delete subject">🗑</button>
                    </div>
                </div>

                <!-- Upload zone / PDF viewer -->
                <div class="curr-viewer-body" id="currViewerBody">
                    ${doc ? this._buildViewerHTML() : this._buildUploadZoneHTML()}
                </div>
            </div>
        `;

        // Back button
        main.querySelector("#currBackBtn").addEventListener("click", () => {
            this.activeSub = null;
            this._renderTree();
            this._showSemPanel(sem);
        });

        // Upload btn
        const uploadBtn = main.querySelector("#currUploadBtn");
        if (uploadBtn && !doc) uploadBtn.textContent = "⬆ Upload PDF";
        if (uploadBtn) uploadBtn.addEventListener("click", () => this._triggerFileUpload(sem, sub));

        // Replace btn
        const replaceBtn = main.querySelector("#currReplaceBtn");
        if (replaceBtn) replaceBtn.addEventListener("click", () => this._triggerFileUpload(sem, sub));

        // Download btn
        const downloadBtn = main.querySelector("#currDownloadBtn");
        if (downloadBtn && doc) {
            downloadBtn.addEventListener("click", () => this._downloadPDF(doc));
        }

        // Delete subject
        main.querySelector("#currDelSubBtn").addEventListener("click", () => {
            this._confirmDeleteSubject(sem, sub);
        });

        // If we have a PDF, show it
        if (doc) {
            this._embedPDF(doc);
        } else {
            this._attachUploadZoneEvents(sem, sub);
        }
    }

    _buildViewerHTML() {
        return `
            <div class="curr-pdf-viewer-wrap">
                <iframe class="curr-pdf-iframe" id="currPDFFrame" src="about:blank" title="PDF Viewer"></iframe>
                <div class="curr-pdf-loading" id="currPDFLoading">
                    <div class="curr-pdf-spinner"></div>
                    <span>Loading PDF…</span>
                </div>
            </div>
        `;
    }

    _buildUploadZoneHTML() {
        return `
            <div class="curr-upload-zone" id="currUploadZone">
                <div class="curr-upload-icon">📋</div>
                <div class="curr-upload-title">Drop PDF here</div>
                <div class="curr-upload-sub">or click to browse</div>
                <div class="curr-upload-hint">Only PDF files · Stored locally in your browser</div>
            </div>
        `;
    }

    _attachUploadZoneEvents(sem, sub) {
        const zone = this.container.querySelector("#currUploadZone");
        if (!zone) return;

        zone.addEventListener("click", () => this._triggerFileUpload(sem, sub));

        zone.addEventListener("dragover", e => {
            e.preventDefault();
            zone.classList.add("drag-active");
        });
        zone.addEventListener("dragleave", () => zone.classList.remove("drag-active"));
        zone.addEventListener("drop", e => {
            e.preventDefault();
            zone.classList.remove("drag-active");
            const file = e.dataTransfer.files[0];
            if (file) this._processFile(sem, sub, file);
        });
    }

    _embedPDF(doc) {
        const body = this.container.querySelector("#currViewerBody");
        const loading = this.container.querySelector("#currPDFLoading");
        const frame = this.container.querySelector("#currPDFFrame");
        if (!frame) return;

        // Convert base64 → Blob → object URL
        try {
            const byteChars = atob(doc.b64);
            const byteArr = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArr], { type: "application/pdf" });
            this.viewerObjectURL = URL.createObjectURL(blob);
            frame.src = this.viewerObjectURL;
            frame.onload = () => {
                if (loading) loading.style.display = "none";
                frame.style.opacity = "1";
            };
        } catch (err) {
            if (body) body.innerHTML = `<div class="curr-pdf-error">❌ Could not load PDF. The file may be corrupted.<br><small>${err.message}</small></div>`;
        }
    }

    /* ─── File Upload ─── */
    _triggerFileUpload(sem, sub) {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "application/pdf";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.addEventListener("change", () => {
            const file = inp.files[0];
            if (file) this._processFile(sem, sub, file);
            inp.remove();
        });
        inp.click();
    }

    _processFile(sem, sub, file) {
        if (file.type !== "application/pdf") {
            alert("Only PDF files are supported.");
            return;
        }

        // Warn if file is very large (>10 MB)
        if (file.size > 10 * 1024 * 1024) {
            if (!confirm(`This PDF is ${this._fmtSize(file.size)}. Large files may fill up browser storage quickly. Continue?`)) return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            // Strip data URL prefix (data:application/pdf;base64,)
            const b64 = e.target.result.split(",")[1];
            this.data[sem][sub] = {
                name: file.name,
                size: file.size,
                type: file.type,
                b64,
                uploadedAt: new Date().toISOString()
            };
            this._save();
            this.activeSem = sem;
            this.activeSub = sub;
            this._renderTree();
            this._showSubjectPanel(sem, sub);
        };
        reader.onerror = () => alert("Failed to read file.");
        reader.readAsDataURL(file);
    }

    _downloadPDF(doc) {
        try {
            const byteChars = atob(doc.b64);
            const byteArr = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArr], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = doc.name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch { alert("Download failed."); }
    }

    /* ─── Modals ─── */
    _promptAddSem() {
        const existing = Object.keys(this.data);
        const nextNum = existing.length + 1;
        this._openModal(`
            <div class="curr-modal-header">
                <span class="curr-modal-icon">📚</span>
                <h3>Add Semester</h3>
            </div>
            <div class="curr-modal-field">
                <label>Semester Name</label>
                <input id="currSemInput" class="curr-modal-input" type="text"
                       value="Semester ${nextNum}" placeholder="e.g. Semester 1">
            </div>
            <div class="curr-modal-actions">
                <button class="curr-btn curr-btn-ghost" id="currModalCancel">Cancel</button>
                <button class="curr-btn curr-btn-primary" id="currModalConfirm">Add Semester</button>
            </div>
        `);
        const inp = this.container.querySelector("#currSemInput");
        inp.focus(); inp.select();
        this.container.querySelector("#currModalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#currModalConfirm").addEventListener("click", () => {
            const name = inp.value.trim();
            if (!name) return;
            if (this.data[name]) { alert("Semester already exists!"); return; }
            this.data[name] = {};
            this._save();
            this.activeSem = name;
            this.activeSub = null;
            this._closeModal();
            this._renderTree();
            this._showSemPanel(name);
        });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#currModalConfirm").click(); });
    }

    _promptAddSubject(sem) {
        this._openModal(`
            <div class="curr-modal-header">
                <span class="curr-modal-icon">📄</span>
                <h3>Add Subject</h3>
                <p class="curr-modal-sub">to ${sem}</p>
            </div>
            <div class="curr-modal-field">
                <label>Subject Name</label>
                <input id="currSubInput" class="curr-modal-input" type="text" placeholder="e.g. Data Structures">
            </div>
            <div class="curr-modal-actions">
                <button class="curr-btn curr-btn-ghost" id="currModalCancel">Cancel</button>
                <button class="curr-btn curr-btn-primary" id="currModalConfirm">Add Subject</button>
            </div>
        `);
        const inp = this.container.querySelector("#currSubInput");
        inp.focus();
        this.container.querySelector("#currModalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#currModalConfirm").addEventListener("click", () => {
            const name = inp.value.trim();
            if (!name) { inp.style.borderColor = "#ff7675"; return; }
            if (this.data[sem][name] !== undefined) { alert("Subject already exists!"); return; }
            this.data[sem][name] = null; // null = no PDF yet
            this._save();
            this.activeSem = sem;
            this.activeSub = name;
            this._closeModal();
            this._renderTree();
            this._showSubjectPanel(sem, name);
        });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#currModalConfirm").click(); });
    }

    _confirmDeleteSem(sem) {
        if (!confirm(`Delete "${sem}" and ALL its subjects/PDFs? This cannot be undone.`)) return;
        delete this.data[sem];
        this._save();
        const remaining = Object.keys(this.data);
        this.activeSem = remaining[0] || null;
        this.activeSub = null;
        this._renderTree();
        if (this.activeSem) this._showSemPanel(this.activeSem);
        else this._showWelcome();
    }

    _confirmDeleteSubject(sem, sub) {
        if (!confirm(`Delete subject "${sub}"${this.data[sem][sub] ? " and its uploaded PDF" : ""}?`)) return;
        delete this.data[sem][sub];
        this._save();
        this.activeSub = null;
        this._renderTree();
        this._showSemPanel(sem);
    }

    _openModal(html) {
        const overlay = this.container.querySelector("#currModalOverlay");
        const box = this.container.querySelector("#currModalBox");
        box.innerHTML = html;
        overlay.style.display = "flex";
    }
    _closeModal() {
        const overlay = this.container.querySelector("#currModalOverlay");
        if (overlay) overlay.style.display = "none";
    }

    /* ─── Helpers ─── */
    _fmtSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='curriculum']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new CurriculumApp());
    }
});
