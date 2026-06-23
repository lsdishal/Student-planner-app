class AttendanceApp extends BaseApp {
    constructor() {
        super("Attendance");
        this.apiBase = "/api/attendance";
        this.subjects = [];
        this.listContainer = null;
    }

    async loadSubjects() {
        const regNumber = this.getRegNumber();
        if (!regNumber) return false;

        try {
            const res = await fetch(`${this.apiBase}/list/${regNumber}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load subjects");
            this.subjects = Array.isArray(data) ? data : [];
            return true;
        } catch (err) {
            console.error("Attendance load failed:", err);
            alert(err.message || "Failed to load attendance data.");
            return false;
        }
    }

    render(container) {
        container.innerHTML = `
            <div class="attendance-container">
                <div class="attendance-header">
                    <h2>My Attendance</h2>
                    <div>
                        <button class="add-subject-btn">+ Add Subject</button>
                        <button class="reset-btn">⚠ Reset info</button>
                    </div>
                </div>
                <div class="subject-list">
                    <div style="color: #888; padding: 20px; text-align: center;">Loading subjects...</div>
                </div>
            </div>
        `;

        this.listContainer = container.querySelector(".subject-list");

        container.querySelector(".add-subject-btn").onclick = () => this.handleAddSubject();
        container.querySelector(".reset-btn").onclick = () => this.handleReset();

        this.loadSubjects().then((ok) => {
            if (ok) this.renderList();
        });
    }

    async handleAddSubject() {
        const regNumber = this.getRegNumber();
        if (!regNumber) return;

        const name = prompt("Subject Name:");
        if (!name || !name.trim()) return;

        try {
            const res = await fetch(`${this.apiBase}/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_number: regNumber, name: name.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add subject");

            this.subjects.push(data);
            this.renderList();
        } catch (err) {
            alert(err.message || "Failed to add subject.");
        }
    }

    async handleReset() {
        const regNumber = this.getRegNumber();
        if (!regNumber) return;

        if (!confirm("Are you sure you want to reset all attendance data?")) return;

        try {
            const res = await fetch(`${this.apiBase}/reset/${regNumber}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to reset");

            this.subjects = [];
            this.renderList();
        } catch (err) {
            alert(err.message || "Failed to reset attendance.");
        }
    }

    async updateSubject(subjectId, action) {
        const regNumber = this.getRegNumber();
        if (!regNumber) return;

        try {
            const res = await fetch(`${this.apiBase}/subjects/${subjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_number: regNumber, action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update");

            const index = this.subjects.findIndex(s => s.id === subjectId);
            if (index !== -1) this.subjects[index] = data;
            this.renderList();
        } catch (err) {
            alert(err.message || "Failed to update attendance.");
        }
    }

    async deleteSubject(subjectId) {
        const regNumber = this.getRegNumber();
        if (!regNumber) return;

        try {
            const res = await fetch(`${this.apiBase}/subjects/${subjectId}?registration_number=${encodeURIComponent(regNumber)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete");

            this.subjects = this.subjects.filter(s => s.id !== subjectId);
            this.renderList();
        } catch (err) {
            alert(err.message || "Failed to delete subject.");
        }
    }

    renderList() {
        if (!this.listContainer) return;

        this.listContainer.innerHTML = "";

        if (this.subjects.length === 0) {
            this.listContainer.innerHTML = `
                <div style="color: #888; padding: 20px; text-align: center;">
                    No subjects yet. Click "+ Add Subject" to get started.
                </div>`;
            return;
        }

        this.subjects.forEach((sub) => {
            const percent = sub.total === 0 ? 0 : Math.round((sub.attended / sub.total) * 100);
            const statusClass = percent >= 75 ? "safe" : "danger";
            const bunkMsg = this.calculateBunk(sub.attended, sub.total);

            const el = document.createElement("div");
            el.className = `subject-card ${statusClass}`;
            el.innerHTML = `
                <div class="sub-info">
                    <h3>${sub.name}</h3>
                    <div class="sub-stats">
                        <span>${sub.attended}/${sub.total}</span>
                        <span class="percent">${percent}%</span>
                    </div>
                    <div class="bunk-status">${bunkMsg}</div>
                </div>
                <div class="sub-actions">
                    <button class="present-btn">✅</button>
                    <button class="absent-btn">❌</button>
                    <button class="delete-btn" style="background: transparent; border: 1px solid #ccc;">🗑</button>
                </div>
            `;

            el.querySelector(".present-btn").onclick = () => this.updateSubject(sub.id, 'present');
            el.querySelector(".absent-btn").onclick = () => this.updateSubject(sub.id, 'absent');
            el.querySelector(".delete-btn").onclick = () => {
                if (confirm(`Delete ${sub.name}?`)) {
                    this.deleteSubject(sub.id);
                }
            };

            this.listContainer.appendChild(el);
        });
    }

    calculateBunk(attended, total) {
        const target = 0.75;
        const current = total === 0 ? 0 : attended / total;

        if (current >= target) {
            const canBunk = Math.floor((attended - target * total) / target);
            return canBunk > 0 ? `You can bunk ${canBunk} classes` : "On the edge!";
        }

        const need = Math.ceil((target * total - attended) / (1 - target));
        return `Attend ${need} next classes!`;
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='attendance']");
    if (launcher) {
        launcher.onclick = () => {
            WindowManager.createWindow(new AttendanceApp());
        };
    }
});
