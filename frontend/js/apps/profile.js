class ProfileApp extends BaseApp {
    constructor() {
        super("My Profile");
        this.STORAGE_KEY = "webos_student_profile";
        this.profile = this._load();
        this.isEditing = false;
        this.container = null;
        this.avatarColors = [
            ["#6c5ce7","#a29bfe"], ["#00b894","#55efc4"], ["#0984e3","#74b9ff"],
            ["#e17055","#fab1a0"], ["#fdcb6e","#ffeaa7"], ["#fd79a8","#fdcb6e"],
            ["#6c5ce7","#fd79a8"], ["#00cec9","#55efc4"]
        ];
    }

    /* ── Persistence ── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }
    _save(data) {
        this.profile = data;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    /* ── Helpers ── */
    _initials(name) {
        if (!name) return "?";
        return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    }
    _avatarGradient(name) {
        const idx = (name || "").charCodeAt(0) % this.avatarColors.length;
        const [c1, c2] = this.avatarColors[idx] || ["#6c5ce7", "#a29bfe"];
        return `linear-gradient(135deg, ${c1}, ${c2})`;
    }
    _schoolColor(school) {
        const map = {
            "SCOPE": "#6c5ce7", "SENSE": "#00b894", "SMEC": "#e17055",
            "SCALE": "#0984e3", "SITE": "#fd79a8", "VITBS": "#fdcb6e",
            "VISTAS": "#a29bfe", "SSL": "#55efc4", "SMBS": "#fab1a0"
        };
        return map[school] || "#555";
    }
    _genderIcon(g) {
        return g === "Male" ? "♂" : g === "Female" ? "♀" : g === "Non-binary" ? "⚧" : "○";
    }
    _yearLabel(y) {
        const map = { "1": "1st Year", "2": "2nd Year", "3": "3rd Year", "4": "4th Year" };
        return map[y] || y;
    }
    _isEmpty() {
        return !this.profile.name && !this.profile.regNo;
    }

    /* ── Render entry ── */
    render(container) {
        this.container = container;
        container.classList.add("profile-container");
        this._renderAll();
    }

    _renderAll() {
        if (this._isEmpty() || this.isEditing) {
            this._renderEditView();
        } else {
            this._renderProfileView();
        }
    }

    /* ── Profile View ── */
    _renderProfileView() {
        const p = this.profile;
        const initials = this._initials(p.name);
        const grad = this._avatarGradient(p.name);
        const schoolColor = this._schoolColor(p.school);

        this.container.innerHTML = `
            <div class="pf-view">
                <!-- Header Banner -->
                <div class="pf-banner" style="--school-color: ${schoolColor}">
                    <div class="pf-banner-bg"></div>
                    <div class="pf-banner-content">
                        <div class="pf-avatar" style="background: ${grad}">
                            ${p.avatarEmoji || initials}
                        </div>
                        <div class="pf-banner-info">
                            <h1 class="pf-name">${p.name || "—"}</h1>
                            <div class="pf-reg">${p.regNo || ""}</div>
                            <div class="pf-tags">
                                ${p.school ? `<span class="pf-tag pf-tag-school" style="background:${schoolColor}22;color:${schoolColor};border-color:${schoolColor}44">${p.school}</span>` : ""}
                                ${p.year ? `<span class="pf-tag">${this._yearLabel(p.year)}</span>` : ""}
                                ${p.gender ? `<span class="pf-tag">${this._genderIcon(p.gender)} ${p.gender}</span>` : ""}
                                ${p.resType ? `<span class="pf-tag pf-tag-res">${p.resType === "Hosteller" ? "🏠 Hosteller" : "🏡 Day Scholar"}</span>` : ""}
                            </div>
                        </div>
                        <button class="pf-edit-btn" id="pfEditBtn">✏️ Edit Profile</button>
                    </div>
                </div>

                <!-- Info Cards Grid -->
                <div class="pf-cards-grid">
                    <!-- Academic Info -->
                    <div class="pf-card">
                        <div class="pf-card-header">
                            <span class="pf-card-icon">🎓</span>
                            <span class="pf-card-title">Academic Info</span>
                        </div>
                        <div class="pf-card-rows">
                            ${this._row("Registration No.", p.regNo)}
                            ${this._row("Branch", p.branch)}
                            ${this._row("Department", p.department)}
                            ${this._row("School", p.school, `color:${schoolColor};font-weight:700`)}
                            ${this._row("Programme", p.programme)}
                            ${this._row("Year", this._yearLabel(p.year))}
                            ${this._row("Specialisation", p.specialisation)}
                        </div>
                    </div>

                    <!-- Personal Info -->
                    <div class="pf-card">
                        <div class="pf-card-header">
                            <span class="pf-card-icon">👤</span>
                            <span class="pf-card-title">Personal Info</span>
                        </div>
                        <div class="pf-card-rows">
                            ${this._row("Full Name", p.name)}
                            ${this._row("Gender", p.gender)}
                            ${this._row("Date of Birth", p.dob ? new Date(p.dob).toLocaleDateString("en-IN", {day:"2-digit",month:"long",year:"numeric"}) : "")}
                            ${this._row("Blood Group", p.bloodGroup, "color:#ff7675;font-weight:700")}
                            ${this._row("Nationality", p.nationality)}
                            ${this._row("Residence", p.resType)}
                        </div>
                    </div>

                    <!-- Contact Info -->
                    <div class="pf-card">
                        <div class="pf-card-header">
                            <span class="pf-card-icon">📬</span>
                            <span class="pf-card-title">Contact Info</span>
                        </div>
                        <div class="pf-card-rows">
                            ${this._row("Email", p.email, "color:#74b9ff")}
                            ${this._row("Phone", p.phone)}
                            ${this._row("Parent/Guardian", p.guardian)}
                            ${this._row("Emergency Contact", p.emergencyPhone)}
                        </div>
                    </div>

                    <!-- About -->
                    ${p.bio ? `
                    <div class="pf-card pf-card-wide">
                        <div class="pf-card-header">
                            <span class="pf-card-icon">📝</span>
                            <span class="pf-card-title">About Me</span>
                        </div>
                        <div class="pf-bio">${p.bio}</div>
                    </div>` : ""}
                </div>
            </div>
        `;

        this.container.querySelector("#pfEditBtn").addEventListener("click", () => {
            this.isEditing = true;
            this._renderAll();
        });
    }

    _row(label, value, style = "") {
        if (!value) return "";
        return `
            <div class="pf-row">
                <span class="pf-row-label">${label}</span>
                <span class="pf-row-value" ${style ? `style="${style}"` : ""}>${value}</span>
            </div>
        `;
    }

    /* ── Edit View ── */
    _renderEditView() {
        const p = this.profile;
        const isNew = this._isEmpty();

        this.container.innerHTML = `
            <div class="pf-edit-view">
                <div class="pf-edit-topbar">
                    <div class="pf-edit-title">
                        <span class="pf-edit-icon">✏️</span>
                        <h2>${isNew ? "Set Up Your Profile" : "Edit Profile"}</h2>
                    </div>
                    ${!isNew ? `<button class="pf-btn pf-btn-ghost" id="pfCancelBtn">Cancel</button>` : ""}
                </div>

                <!-- Avatar Picker -->
                <div class="pf-avatar-picker-section">
                    <div class="pf-avatar pf-avatar-lg" id="pfAvatarPreview"
                         style="background:${this._avatarGradient(p.name)}">
                        ${p.avatarEmoji || this._initials(p.name) || "?"}
                    </div>
                    <div class="pf-avatar-emojis">
                        ${["🎓","🧑‍💻","👩‍💻","🧑‍🔬","👩‍🔬","🧑‍🎨","👩‍🎨","🦊","🐼","🦁","🐯","🐺","🦋","🌟","🔥","⚡"].map(e =>
                            `<button class="pf-emoji-pick ${p.avatarEmoji === e ? "active" : ""}" data-emoji="${e}">${e}</button>`
                        ).join("")}
                        <button class="pf-emoji-pick pf-emoji-clear" data-emoji="">✕</button>
                    </div>
                </div>

                <form class="pf-form" id="pfForm" novalidate>
                    <!-- Section: Academic -->
                    <div class="pf-section-title">🎓 Academic Information</div>
                    <div class="pf-form-grid">
                        ${this._field("Full Name", "name", "text", p.name, "e.g. Dishal Kumar", true)}
                        ${this._field("Registration Number", "regNo", "text", p.regNo, "e.g. 22BCE1234", true)}
                        ${this._selectField("School", "school", [
                            "SCOPE","SENSE","SMEC","SCALE","SITE","VITBS","VISTAS","SSL","SMBS","Other"
                        ], p.school)}
                        ${this._selectField("Programme", "programme", [
                            "B.Tech", "M.Tech", "MBA", "MCA", "BCA", "BSc", "MSc", "PhD", "Integrated M.Tech"
                        ], p.programme)}
                        ${this._field("Branch", "branch", "text", p.branch, "e.g. Computer Science & Engineering")}
                        ${this._field("Department", "department", "text", p.department, "e.g. CSE (IoT)")}
                        ${this._field("Specialisation", "specialisation", "text", p.specialisation, "e.g. Cyber Physical Systems")}
                        ${this._selectField("Year of Study", "year", ["1","2","3","4"], p.year, ["1st Year","2nd Year","3rd Year","4th Year"])}
                    </div>

                    <!-- Section: Personal -->
                    <div class="pf-section-title">👤 Personal Information</div>
                    <div class="pf-form-grid">
                        ${this._selectField("Gender", "gender", [
                            "Male","Female","Non-binary","Prefer not to say"
                        ], p.gender)}
                        ${this._field("Date of Birth", "dob", "date", p.dob, "")}
                        ${this._selectField("Blood Group", "bloodGroup", [
                            "A+","A−","B+","B−","AB+","AB−","O+","O−"
                        ], p.bloodGroup)}
                        ${this._field("Nationality", "nationality", "text", p.nationality || "Indian", "e.g. Indian")}
                        ${this._selectField("Residence Type", "resType", [
                            "Hosteller","Day Scholar"
                        ], p.resType)}
                    </div>

                    <!-- Section: Contact -->
                    <div class="pf-section-title">📬 Contact Information</div>
                    <div class="pf-form-grid">
                        ${this._field("Email", "email", "email", p.email, "e.g. student@vitc.ac.in")}
                        ${this._field("Phone Number", "phone", "tel", p.phone, "e.g. 9876543210")}
                        ${this._field("Parent / Guardian Name", "guardian", "text", p.guardian, "e.g. Rajesh Kumar")}
                        ${this._field("Emergency Contact", "emergencyPhone", "tel", p.emergencyPhone, "Parent/Guardian phone")}
                    </div>

                    <!-- Bio -->
                    <div class="pf-section-title">📝 About Me <span class="pf-optional">(optional)</span></div>
                    <textarea class="pf-textarea" name="bio" placeholder="A short description about yourself, interests, goals…" rows="3">${p.bio || ""}</textarea>

                    <div class="pf-form-actions">
                        ${!isNew ? `<button type="button" class="pf-btn pf-btn-danger" id="pfResetBtn">🗑 Clear All Data</button>` : ""}
                        <button type="submit" class="pf-btn pf-btn-primary" id="pfSaveBtn">💾 Save Profile</button>
                    </div>
                </form>
            </div>
        `;

        // Cancel
        const cancelBtn = this.container.querySelector("#pfCancelBtn");
        if (cancelBtn) cancelBtn.addEventListener("click", () => { this.isEditing = false; this._renderAll(); });

        // Reset
        const resetBtn = this.container.querySelector("#pfResetBtn");
        if (resetBtn) resetBtn.addEventListener("click", () => {
            if (confirm("Clear ALL profile data? This cannot be undone.")) {
                this._save({});
                this.isEditing = false;
                this._renderAll();
            }
        });

        // Avatar emoji picker
        const avatarPreview = this.container.querySelector("#pfAvatarPreview");
        let currentEmoji = p.avatarEmoji || "";

        this.container.querySelectorAll(".pf-emoji-pick").forEach(btn => {
            btn.addEventListener("click", () => {
                currentEmoji = btn.dataset.emoji;
                this.container.querySelectorAll(".pf-emoji-pick").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                avatarPreview.textContent = currentEmoji || this._initials(this.container.querySelector("[name='name']")?.value || "");
            });
        });

        // Live name → initials update
        const nameInp = this.container.querySelector("[name='name']");
        if (nameInp) {
            nameInp.addEventListener("input", () => {
                if (!currentEmoji) {
                    avatarPreview.textContent = this._initials(nameInp.value) || "?";
                    avatarPreview.style.background = this._avatarGradient(nameInp.value);
                }
            });
        }

        // Form submit
        this.container.querySelector("#pfForm").addEventListener("submit", e => {
            e.preventDefault();
            const form = e.target;
            const fd = new FormData(form);
            const data = {};
            fd.forEach((v, k) => { data[k] = v.trim(); });
            data.avatarEmoji = currentEmoji;

            if (!data.name) { this._shake(form.querySelector("[name='name']")); return; }
            if (!data.regNo) { this._shake(form.querySelector("[name='regNo']")); return; }

            this._save(data);
            this.isEditing = false;
            this._renderAll();
        });
    }

    _field(label, name, type, value, placeholder, required = false) {
        return `
            <div class="pf-field">
                <label class="pf-label">${label}${required ? ' <span class="pf-req">*</span>' : ""}</label>
                <input class="pf-input" type="${type}" name="${name}"
                       value="${value || ""}" placeholder="${placeholder || ""}"
                       ${required ? "required" : ""}>
            </div>
        `;
    }

    _selectField(label, name, options, value, labels = null) {
        return `
            <div class="pf-field">
                <label class="pf-label">${label}</label>
                <select class="pf-input pf-select" name="${name}">
                    <option value="">— Select —</option>
                    ${options.map((opt, i) => {
                        const lbl = labels ? labels[i] : opt;
                        return `<option value="${opt}" ${value === opt ? "selected" : ""}>${lbl}</option>`;
                    }).join("")}
                </select>
            </div>
        `;
    }

    _shake(el) {
        if (!el) return;
        el.style.borderColor = "#ff7675";
        el.style.animation = "pfShake 0.4s ease";
        el.addEventListener("animationend", () => { el.style.animation = ""; }, { once: true });
        el.focus();
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='profile']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new ProfileApp());
    }
});
