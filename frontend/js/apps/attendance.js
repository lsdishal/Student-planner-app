class AttendanceApp extends BaseApp {
    constructor() {
        super("Attendance");
        this.dataFile = "home/attendance.json";
        this.subjects = this.loadData();
    }

    loadData() {
        if (typeof VFS !== 'undefined' && VFS.exists(this.dataFile)) {
            return VFS.readFileSync(this.dataFile);
        }
        // Defaults
        return [
            { name: "Mathematics", total: 40, attended: 35 },
            { name: "Physics", total: 30, attended: 20 },
            { name: "Computer Science", total: 45, attended: 42 }
        ];
    }

    saveData() {
        if (typeof VFS !== 'undefined') {
            VFS.writeFileSync(this.dataFile, this.subjects);
        }
    }

    render(container) {
        container.innerHTML = `
            <div class="attendance-container">
                <div class="attendance-header">
                    <h2>My Attendance</h2>
                    <button class="add-subject-btn">+ Add Subject</button>
                    <button class="reset-btn" style="margin-left: 10px; background: #dc3545;">⚠ Reset info</button>
                </div>
                <div class="subject-list"></div>
            </div>
        `;

        this.renderList(container.querySelector(".subject-list"));

        container.querySelector(".add-subject-btn").onclick = () => {
            const name = prompt("Subject Name:");
            if (name) {
                this.subjects.push({ name, total: 0, attended: 0 });
                this.saveData(); // Save
                this.renderList(container.querySelector(".subject-list"));
            }
        };

        container.querySelector(".reset-btn").onclick = () => {
            if (confirm("Are you sure you want to reset all attendance data?")) {
                this.subjects = [];
                this.saveData();
                this.renderList(container.querySelector(".subject-list"));
            }
        };
    }

    renderList(container) {
        container.innerHTML = "";
        this.subjects.forEach((sub, index) => {
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

            el.querySelector(".present-btn").onclick = () => {
                sub.attended++;
                sub.total++;
                this.saveData(); // Save
                this.renderList(container);
            };

            el.querySelector(".absent-btn").onclick = () => {
                sub.total++;
                this.saveData(); // Save
                this.renderList(container);
            };

            el.querySelector(".delete-btn").onclick = () => {
                if (confirm(`Delete ${sub.name}?`)) {
                    this.subjects.splice(index, 1);
                    this.saveData();
                    this.renderList(container);
                }
            };

            container.appendChild(el);
        });
    }

    calculateBunk(attended, total) {
        const target = 0.75;
        const current = total === 0 ? 0 : attended / total;

        if (current >= target) {
            // How many can I bunk?
            // (attended) / (total + x) >= 0.75
            // attended >= 0.75 * total + 0.75 * x
            // 0.75x <= attended - 0.75*total
            // x <= (attended - 0.75*total) / 0.75
            const canBunk = Math.floor((attended - target * total) / target);
            return canBunk > 0 ? `You can bunk ${canBunk} classes` : "On the edge!";
        } else {
            // How many to attend?
            // (attended + x) / (total + x) >= 0.75
            // attended + x >= 0.75*total + 0.75*x
            // 0.25x >= 0.75*total - attended
            // x >= (0.75*total - attended) / 0.25
            const need = Math.ceil((target * total - attended) / (1 - target));
            return `Attend ${need} next classes!`;
        }
    }
}

// Hook
EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='attendance']");
    if (launcher) {
        launcher.onclick = () => {
            WindowManager.createWindow(new AttendanceApp());
        };
    }
});
