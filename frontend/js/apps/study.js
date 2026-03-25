class StudyApp extends BaseApp {
    constructor() {
        super("Study Hub");
        this.currentTab = "Semester 1";
this.apiBase = "/api";
    }

    render(container) {
        container.innerHTML = `
            <div class="study-container">
                <div class="sidebar">
                    <div class="nav-item active">Semester 1</div>
                    <div class="nav-item">Semester 2</div>
                    <div class="nav-item">Semester 3</div>
                    <div class="nav-item">projects</div>
                </div>
                <div class="main-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin-top: 0;">${this.currentTab} Materials</h2>
                        <button class="add-material-btn" style="padding: 8px 16px; background: #6c5ce7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">+ Add Material</button>
                    </div>

                    <div class="resources-grid">
                        <div style="color: #777; font-size: 13px; text-align: center; padding: 20px; width: 100%;">Loading materials...</div>
                    </div>
                    
                    <div class="study-notes-section" style="margin-top: 30px; border-top: 1px solid #333; padding-top: 20px;">
                        <h3>Personal Notes</h3>
                        <textarea class="study-notepad" style="width: 100%; height: 100px; padding: 12px; border: 1px solid #444; border-radius: 8px; background: #252530; color: #fff;" placeholder="Write a new note for this semester..."></textarea>
                        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                            <button class="save-notes-btn" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Save Note</button>
                        </div>

                        <div class="study-history"></div>
                    </div>
                </div>
            </div>
        `;

        const notePad = container.querySelector(".study-notepad");
        const saveBtn = container.querySelector(".save-notes-btn");
        const historyContainer = container.querySelector(".study-history");
        const grid = container.querySelector(".resources-grid");
        const addBtn = container.querySelector(".add-material-btn");

        this.loadNotes(historyContainer);
        this.loadMaterials(grid);

        addBtn.onclick = () => this.showAddMaterialForm(grid);

        saveBtn.onclick = async () => {
            const content = notePad.value.trim();
            if (!content) return;
            saveBtn.disabled = true;
            await this.saveNote(content);
            notePad.value = "";
            saveBtn.disabled = false;
            this.loadNotes(historyContainer);
        };

        const items = container.querySelectorAll(".nav-item");
        items.forEach(item => {
            item.onclick = () => {
                items.forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                this.currentTab = item.innerText;
                container.querySelector("h2").innerText = `${this.currentTab} Materials`;
                this.loadNotes(historyContainer);
                this.loadMaterials(grid);
            };
        });
    }

    async loadMaterials(grid) {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            const res = await fetch(`${this.apiBase}/materials/list/${regNumber}/${this.currentTab}`);
            const data = await res.json();

            if (data.length === 0) {
                grid.innerHTML = `<div style="color: #555; font-size: 13px; text-align: center; padding: 20px; width: 100%;">No materials listed for this semester. Click "+ Add Material" to start.</div>`;
                return;
            }

            grid.innerHTML = data.map(m => `
                <div class="resource-card" data-id="${m.id}" data-type="${m.type}" data-isfile="${m.is_file}">
                    <div class="icon">${this.getIconForType(m.type)}</div>
                    <span style="font-size: 12px; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${m.title}</span>
                </div>
            `).join('');

            grid.querySelectorAll(".resource-card").forEach(card => {
                card.onclick = () => {
                    const material = data.find(m => m.id == card.dataset.id);
                    if (material.is_file) {
                        this.downloadFile(material);
                    } else {
                        this.openMaterial(material);
                    }
                };
            });

        } catch (err) {
            grid.innerHTML = `<div style="color: #ff7675;">Failed to load materials.</div>`;
        }
    }

    getIconForType(type) {
        const icons = {
            'pdf': '📕',
            'doc': '📄',
            'docx': '📄',
            'jpg': '🖼️',
            'png': '🖼️',
            'py': '🐍',
            'js': '📜',
            'zip': '📦',
            'note': '📝'
        };
        return icons[type.toLowerCase()] || '📁';
    }

    async downloadFile(material) {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        const filename = material.file_path.split(/[\\/]/).pop();
        const url = `${this.apiBase}/storage/download/${regNumber}/${filename}`;
        window.open(url, '_blank');
    }

    showAddMaterialForm(grid) {
        // Create a temporary modal overlay for upload
        const modal = document.createElement("div");
        modal.style = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center;";
        modal.innerHTML = `
            <div style="background: #2d2d3a; padding: 25px; border-radius: 12px; width: 350px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #fff;">Add New Material</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 5px;">Title</label>
                    <input type="text" id="mat-title" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #444; background: #1e1e2e; color: #fff;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 5px;">Upload File</label>
                    <input type="file" id="mat-file" style="width: 100%; color: #ccc; font-size: 13px;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button class="cancel-btn" style="padding: 8px 15px; background: #444; color: #ccc; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button class="upload-btn" style="padding: 8px 15px; background: #6c5ce7; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Upload to WebOS</button>
                </div>
            </div>
        `;
        grid.parentElement.appendChild(modal);

        modal.querySelector(".cancel-btn").onclick = () => modal.remove();
        modal.querySelector(".upload-btn").onclick = async () => {
            const title = modal.querySelector("#mat-title").value;
            const fileInput = modal.querySelector("#mat-file");
            const file = fileInput.files[0];

            if (!title || !file) {
                alert("Please provide a title and select a file.");
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('registration_number', localStorage.getItem('regNumber') || "STUDENT");
            formData.append('semester', this.currentTab);
            formData.append('title', title);

            const uploadBtn = modal.querySelector(".upload-btn");
            uploadBtn.innerText = "Uploading...";
            uploadBtn.disabled = true;

            try {
                const res = await fetch(`${this.apiBase}/storage/upload`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    modal.remove();
                    this.loadMaterials(grid);
                } else {
                    let errorMessage = "Unknown server error";
                    try {
                        const err = await res.json();
                        errorMessage = err.error || errorMessage;
                    } catch (e) {
                        errorMessage = `Server Error (${res.status})`;
                    }
                    alert("Upload failed: " + errorMessage + "\n\nTip: Make sure you have run migrate_db.py and restarted the server.");
                    uploadBtn.innerText = "Upload to WebOS";
                    uploadBtn.disabled = false;
                }
            } catch (err) {
                alert("Upload failed: Connection error. Is the Flask server running on port 5000?");
                uploadBtn.innerText = "Upload to WebOS";
                uploadBtn.disabled = false;
            }
        };
    }

    async saveMaterial(payload) {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            await fetch(`${this.apiBase}/materials/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_number: regNumber,
                    semester: this.currentTab,
                    ...payload
                })
            });
        } catch (err) { console.error(err); }
    }

    openMaterial(material) {
        // Open the existing Notes app and pass content
        WindowManager.createWindow(new NotesApp(material.title, material.content));
    }

    async loadNotes(container) {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            const res = await fetch(`${this.apiBase}/notes/list/${regNumber}/${this.currentTab}`);
            const data = await res.json();
            container.innerHTML = data.length ? data.map(n => `
                <div class="history-item" data-id="${n.id}">
                    <div style="flex: 1;">
                        <div class="history-content">${n.content}</div>
                        <div class="history-meta">${n.timestamp}</div>
                    </div>
                    <button class="delete-note-btn">🗑️</button>
                </div>
            `).join('') : `<div style="color: #444; text-align: center; padding: 10px;">No notes history.</div>`;

            container.querySelectorAll(".delete-note-btn").forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.closest(".history-item").dataset.id;
                    await fetch(`${this.apiBase}/notes/delete/${id}`, { method: 'DELETE' });
                    this.loadNotes(container);
                };
            });
        } catch (err) { container.innerHTML = "Error loading history."; }
    }

    async saveNote(content) {
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";
        try {
            await fetch(`${this.apiBase}/notes/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_number: regNumber,
                    semester: this.currentTab,
                    content: content
                })
            });
        } catch (err) { console.error(err); }
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='study']");
    if (launcher) {
        launcher.onclick = () => {
            WindowManager.createWindow(new StudyApp());
        };
    }
});
