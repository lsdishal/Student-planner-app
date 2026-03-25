class PlannerApp extends BaseApp {
    constructor() {
        super("Student Planner");
this.apiBase = "https://web-os-backend.onrender.com/api/planner";
        this.tasks = [];
        this.filter = "all";
        this.searchQuery = "";
        this.main = null; // Store reference to container
    }

    render(container) {
        const style = document.createElement('style');
        style.textContent = `
            .planner-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: linear-gradient(135deg, #1e1e2f 0%, #2a2a40 100%);
                color: white;
                padding: 20px;
                box-sizing: border-box;
                font-family: 'Segoe UI', system-ui, sans-serif;
            }
            .planner-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .progress-hud {
                background: rgba(255,255,255,0.05);
                padding: 15px;
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .progress-bar-container {
                height: 8px;
                background: #333;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 10px;
            }
            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #6c5ce7, #a29bfe);
                width: 0%;
                transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .search-box {
                flex: 1;
                padding: 10px 15px;
                border-radius: 8px;
                border: 1px solid #444;
                background: #1e1e2f;
                color: white;
                outline: none;
            }
            .add-task-form {
                display: grid;
                grid-template-columns: 1fr auto auto auto auto;
                gap: 10px;
                background: rgba(0,0,0,0.2);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                align-items: center;
            }
            .add-task-form input, .add-task-form select {
                padding: 8px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #252535;
                color: white;
            }
            .primary-btn {
                background: #6c5ce7;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .primary-btn:hover { background: #5b4cc4; transform: translateY(-1px); }
            
            .task-list {
                list-style: none;
                padding: 0;
                margin: 0;
                overflow-y: auto;
                flex: 1;
            }
            .task-card {
                background: #2d2d3a;
                margin-bottom: 12px;
                padding: 15px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 15px;
                border-left: 4px solid #ccc;
                transition: all 0.3s ease;
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            
            .task-card.High { border-left-color: #ff7675; }
            .task-card.Medium { border-left-color: #fdcb6e; }
            .task-card.Low { border-left-color: #55efc4; }
            
            .task-card.completed {
                opacity: 0.6;
                background: #252530;
            }
            .task-card.completed .task-text {
                text-decoration: line-through;
                color: #888;
            }
            
            .checkbox {
                width: 22px;
                height: 22px;
                border: 2px solid #6c5ce7;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .checkbox:hover { background: rgba(108, 92, 231, 0.2); }
            .checkbox.checked { background: #6c5ce7; }
            .checkbox.checked::after { content: '✓'; color: white; font-size: 14px; }
            
            .task-info { flex: 1; }
            .task-text { font-weight: 500; font-size: 15px; display: block; }
            .task-meta { font-size: 12px; color: #aaa; margin-top: 4px; display: flex; gap: 10px; }
            .tag { background: #444; padding: 2px 6px; border-radius: 4px; color: #eee; }
            
            .countdown { font-weight: 600; color: #fab1a0; }
            .delete-btn { opacity: 0; transition: opacity 0.2s; cursor: pointer; color: #ff7675; font-size: 18px; }
            .task-card:hover .delete-btn { opacity: 1; }
        `;
        container.appendChild(style);

        this.main = document.createElement("div");
        this.main.className = "planner-container";
        this.main.innerHTML = `
            <div class="planner-header">
                <h2 style="margin:0">Student Planner 🔥</h2>
                <div id="streak-counter" title="Daily Streak" style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; font-weight: 600;">🔥 0 Units</div>
            </div>

            <div class="progress-hud">
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600">
                    <span>Course Completion</span>
                    <span id="progress-text">0/0 Tasks Completed</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="progress-fill"></div>
                </div>
            </div>

            <div class="add-task-form">
                <input type="text" id="new-task-text" placeholder="Add a new assignment or goal..." style="flex: 2">
                <select id="new-task-priority">
                    <option value="High">🔴 High</option>
                    <option value="Medium" selected>🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                </select>
                <input type="text" id="new-task-tag" placeholder="#Tag" style="width:70px">
                <div style="display: flex; align-items: center; gap: 5px;">
                   <select id="quick-date" style="width: 100px;">
                      <option value="">Set Date</option>
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="custom">Pick...</option>
                   </select>
                   <input type="date" id="new-task-date" style="display:none; width: 130px;">
                </div>
                <button class="primary-btn" id="save-task-btn">Add Task</button>
            </div>

            <div class="controls">
                <input type="text" class="search-box" id="task-search" placeholder="Search tasks...">
                <select id="status-filter" style="padding:10px; border-radius:8px; background:#1e1e2f; color:white; border:1px solid #444">
                    <option value="all">All Status</option>
                    <option value="pending" selected>Pending</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <ul class="task-list" id="task-list"></ul>
        `;
        container.appendChild(this.main);

        this.attachEvents();
        this.loadTasks();
    }

    attachEvents() {
        const addBtn = this.main.querySelector("#save-task-btn");
        const srchBox = this.main.querySelector("#task-search");
        const filterSel = this.main.querySelector("#status-filter");
        const quickDate = this.main.querySelector("#quick-date");
        const datePicker = this.main.querySelector("#new-task-date");

        addBtn.onclick = () => this.handleAddTask();
        srchBox.oninput = (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTaskList();
        };
        filterSel.onchange = (e) => {
            this.filter = e.target.value;
            this.renderTaskList();
        };
        quickDate.onchange = (e) => {
            if (e.target.value === 'custom') {
                datePicker.style.display = 'block';
                quickDate.style.display = 'none';
            }
        };
    }

    async loadTasks() {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            const res = await fetch(`${this.apiBase}/list/${regNumber}`);
            this.tasks = await res.json();
            this.renderTaskList();
        } catch (err) { console.error("Load failed", err); }
    }

    async handleAddTask() {
        const textIn = this.main.querySelector("#new-task-text");
        const priIn = this.main.querySelector("#new-task-priority");
        const tagIn = this.main.querySelector("#new-task-tag");
        const quickDate = this.main.querySelector("#quick-date");
        const dateIn = this.main.querySelector("#new-task-date");

        if (!textIn.value.trim()) return;

        let dueDate = null;
        if (quickDate.value === 'today') {
            dueDate = new Date().toISOString();
        } else if (quickDate.value === 'tomorrow') {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            dueDate = d.toISOString();
        } else if (dateIn.value) {
            dueDate = new Date(dateIn.value).toISOString();
        }

        const payload = {
            registration_number: localStorage.getItem('regNumber') || "STUDENT",
            text: textIn.value,
            priority: priIn.value,
            category: tagIn.value,
            due_date: dueDate
        };

        try {
            await fetch(`${this.apiBase}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            textIn.value = "";
            tagIn.value = "";
            dateIn.value = "";
            quickDate.value = "";
            quickDate.style.display = 'block';
            dateIn.style.display = 'none';
            this.loadTasks();
        } catch (err) { alert("Save failed"); }
    }

    renderTaskList() {
        const list = this.main.querySelector("#task-list");
        if (!list) return;

        let filtered = this.tasks.filter(t => {
            const matchesSearch = t.text.toLowerCase().includes(this.searchQuery);
            const matchesFilter = this.filter === 'all' ||
                (this.filter === 'completed' && t.completed) ||
                (this.filter === 'pending' && !t.completed);
            return matchesSearch && matchesFilter;
        });

        if (filtered.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:50px; color:#666">
                <div style="font-size:50px; margin-bottom:15px">☕</div>
                <div style="font-weight:600; color:#888">No tasks found.</div>
                <div style="font-size:13px">Try adding a goal or changing filters.</div>
            </div>`;
            this.updateProgress();
            return;
        }

        list.innerHTML = filtered.map(t => {
            const countdown = this.getCountdown(t.due_date);
            return `
                <li class="task-card ${t.priority} ${t.completed ? 'completed' : ''}" data-id="${t.id}">
                    <div class="checkbox ${t.completed ? 'checked' : ''}"></div>
                    <div class="task-info">
                        <span class="task-text">${t.text}</span>
                        <div class="task-meta">
                            ${t.category ? `<span class="tag">${t.category}</span>` : ''}
                            ${t.due_date ? `<span class="countdown">⏰ ${countdown}</span>` : ''}
                        </div>
                    </div>
                    <div class="delete-btn">🗑️</div>
                </li>
            `;
        }).join('');

        list.querySelectorAll(".task-card").forEach(card => {
            const id = card.dataset.id;
            card.querySelector(".checkbox").onclick = (e) => {
                e.stopPropagation();
                this.toggleTask(id);
            };
            card.querySelector(".delete-btn").onclick = (e) => {
                e.stopPropagation();
                if (confirm("Delete task?")) this.deleteTask(id);
            };
            card.addEventListener("dblclick", () => this.editTask(id));
        });

        this.updateProgress();
    }

    async toggleTask(id) {
        try {
            await fetch(`${this.apiBase}/toggle/${id}`, { method: 'POST' });
            this.loadTasks();
        } catch (err) { console.error(err); }
    }

    async deleteTask(id) {
        try {
            await fetch(`${this.apiBase}/delete/${id}`, { method: 'DELETE' });
            this.loadTasks();
        } catch (err) { console.error(err); }
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id == id);
        if (!task) return;
        const newText = prompt("Edit Task:", task.text);
        if (newText && newText !== task.text) {
            fetch(`${this.apiBase}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_number: localStorage.getItem('regNumber') || "STUDENT",
                    id: task.id,
                    text: newText,
                    priority: task.priority,
                    category: task.category,
                    due_date: task.due_date
                })
            }).then(() => this.loadTasks());
        }
    }

    getCountdown(dueDateStr) {
        if (!dueDateStr) return "";
        const due = new Date(dueDateStr);
        const now = new Date();
        const diff = due - now;

        // Date only diff
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayDiff = Math.floor((dueDay - nowDay) / (1000 * 60 * 60 * 24));

        if (dayDiff < 0) return "Overdue";
        if (dayDiff === 0) return "Today";
        if (dayDiff === 1) return "Tomorrow";
        return `${dayDiff} days left`;
    }

    updateProgress() {
        const total = this.tasks.length;
        const done = this.tasks.filter(t => t.completed).length;
        const percent = total > 0 ? (done / total) * 100 : 0;

        const fill = this.main.querySelector("#progress-fill");
        const text = this.main.querySelector("#progress-text");
        const streak = this.main.querySelector("#streak-counter");

        if (fill) fill.style.width = `${percent}%`;
        if (text) text.innerText = `${done}/${total} Tasks Completed`;

        if (streak) {
            streak.innerText = done >= 3 ? `🔥 ${done} Units` : `🔥 0 Units`;
        }
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='planner']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new PlannerApp());
    }
});
