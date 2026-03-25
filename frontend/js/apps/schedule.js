class ScheduleApp extends BaseApp {
    constructor() {
        super("Timetable");
        this.dataFile = "home/schedule.json";
        this.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        this.schedule = this.loadData();
    }

    loadData() {
        if (typeof VFS !== 'undefined' && VFS.exists(this.dataFile)) {
            return VFS.readFileSync(this.dataFile);
        }
        // Defaults
        return {
            "Monday": [
                { time: "09:00", subject: "Mathematics", room: "101" },
                { time: "11:00", subject: "Physics", room: "Lab A" }
            ],
            "Tuesday": [
                { time: "10:00", subject: "Computer Science", room: "302" }
            ],
            "Wednesday": [],
            "Thursday": [],
            "Friday": []
        };
    }

    saveData() {
        if (typeof VFS !== 'undefined') {
            VFS.writeFileSync(this.dataFile, this.schedule);
        }
    }

    render(container) {
        container.innerHTML = `
            <div class="schedule-container">
                <div class="schedule-header">
                    <h2>Class Timetable</h2>
                    <button class="add-class-btn">+ Add Class</button>
                </div>
                <div class="schedule-grid"></div>
            </div>
        `;

        this.renderGrid(container.querySelector(".schedule-grid"));

        container.querySelector(".add-class-btn").onclick = () => {
            this.promptAddClass(container);
        };
    }

    renderGrid(container) {
        container.innerHTML = "";
        this.days.forEach(day => {
            const dayCol = document.createElement("div");
            dayCol.className = "day-column";

            const dayHeader = document.createElement("div");
            dayHeader.className = "day-header";
            dayHeader.innerText = day;
            dayCol.appendChild(dayHeader);

            const classes = this.schedule[day] || [];
            if (classes.length === 0) {
                const empty = document.createElement("div");
                empty.className = "empty-slot";
                empty.innerText = "No classes";
                dayCol.appendChild(empty);
            } else {
                // Sort by time
                classes.sort((a, b) => a.time.localeCompare(b.time));

                classes.forEach((cls, idx) => {
                    const card = document.createElement("div");
                    card.className = "class-card";
                    card.innerHTML = `
                        <div class="class-time">${cls.time}</div>
                        <div class="class-subject">${cls.subject}</div>
                        <div class="class-room">Room: ${cls.room}</div>
                        <button class="remove-class">×</button>
                    `;

                    card.querySelector(".remove-class").onclick = () => {
                        if (confirm("Remove this class?")) {
                            classes.splice(idx, 1);
                            this.saveData();
                            this.renderGrid(container);
                        }
                    };

                    dayCol.appendChild(card);
                });
            }

            container.appendChild(dayCol);
        });
    }

    promptAddClass(container) {
        // Simple prompt approach for now
        const day = prompt("Day (Monday-Friday):");
        if (!this.days.includes(day)) {
            if (day) alert("Invalid day. Please type full day name (e.g. Monday).");
            return;
        }

        const time = prompt("Time (e.g. 09:00):");
        const subject = prompt("Subject:");
        const room = prompt("Room:");

        if (day && time && subject) {
            if (!this.schedule[day]) this.schedule[day] = [];
            this.schedule[day].push({ time, subject, room: room || "-" });
            this.saveData();
            this.renderGrid(container.querySelector(".schedule-grid"));
        }
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='schedule']");
    if (launcher) {
        launcher.onclick = () => {
            WindowManager.createWindow(new ScheduleApp());
        };
    }
});
