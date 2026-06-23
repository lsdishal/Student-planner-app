class TimetableApp extends BaseApp {
    constructor() {
        super("Timetable");
        this.STORAGE_KEY = "webos_timetable_data";
        // data: { name, mimeType, b64, uploadedAt }
        this.data = this._load();
        this.container = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
    }

    /* ── Persistence ── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
    _save(data) {
        try {
            this.data = data;
            if (data) localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            else localStorage.removeItem(this.STORAGE_KEY);
        } catch {
            alert("Storage full! The image may be too large. Try a compressed PNG/JPG.");
        }
    }

    /* ── Render Entry ── */
    render(container) {
        this.container = container;
        container.classList.add("tt-container");

        // Auto-maximize the window when it opens
        setTimeout(() => {
            const win = container.closest(".window");
            if (win && !win.classList.contains("maximized")) {
                win.style.transition = "all 0.3s ease";
                win.classList.add("maximized");
                setTimeout(() => { win.style.transition = ""; }, 300);
            }
        }, 40);

        this._renderAll();
    }

    _renderAll() {
        if (!this.data) {
            this._renderUploadView();
        } else {
            this._renderViewer();
        }
    }

    /* ── Upload View ── */
    _renderUploadView() {
        this.container.innerHTML = `
            <div class="tt-upload-screen">
                <div class="tt-upload-zone" id="ttDropZone">
                    <div class="tt-upload-pulse"></div>
                    <div class="tt-upload-icon-wrap">
                        <div class="tt-upload-icon">📅</div>
                    </div>
                    <h2 class="tt-upload-title">Upload Your Timetable</h2>
                    <p class="tt-upload-sub">Drop an image here or click to browse</p>
                    <div class="tt-upload-formats">
                        <span class="tt-fmt-badge">PNG</span>
                        <span class="tt-fmt-badge">JPG</span>
                        <span class="tt-fmt-badge">JPEG</span>
                        <span class="tt-fmt-badge">WEBP</span>
                        <span class="tt-fmt-badge">GIF</span>
                    </div>
                    <button class="tt-upload-btn" id="ttBrowseBtn">📂 Browse File</button>
                    <p class="tt-upload-note">Stored locally · No server required</p>
                </div>
            </div>
        `;

        const zone = this.container.querySelector("#ttDropZone");
        const browseBtn = this.container.querySelector("#ttBrowseBtn");

        zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag-active"); });
        zone.addEventListener("dragleave", () => zone.classList.remove("drag-active"));
        zone.addEventListener("drop", e => {
            e.preventDefault();
            zone.classList.remove("drag-active");
            const file = e.dataTransfer.files[0];
            if (file) this._processFile(file);
        });

        browseBtn.addEventListener("click", e => {
            e.stopPropagation();
            this._openPicker();
        });

        zone.addEventListener("click", e => {
            if (e.target === browseBtn || e.target.closest("#ttBrowseBtn")) return;
            this._openPicker();
        });
    }

    _openPicker() {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/png,image/jpeg,image/jpg,image/webp,image/gif";
        inp.style.display = "none";
        document.body.appendChild(inp);
        inp.addEventListener("change", () => {
            if (inp.files[0]) this._processFile(inp.files[0]);
            inp.remove();
        });
        inp.click();
    }

    _processFile(file) {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file (PNG, JPG, WEBP, GIF).");
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            if (!confirm(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. It may exceed browser storage limits. Continue?`)) return;
        }

        // Show loading state
        const zone = this.container.querySelector("#ttDropZone");
        if (zone) zone.innerHTML = `
            <div class="tt-loading-anim">
                <div class="tt-loading-spinner"></div>
                <p>Processing image…</p>
            </div>
        `;

        const reader = new FileReader();
        reader.onload = e => {
            const b64 = e.target.result.split(",")[1];
            this._save({ name: file.name, mimeType: file.type, b64, uploadedAt: new Date().toISOString() });
            this.zoom = 1; this.panX = 0; this.panY = 0;
            this._renderViewer();
        };
        reader.onerror = () => alert("Failed to read file.");
        reader.readAsDataURL(file);
    }

    /* ── Viewer ── */
    _renderViewer() {
        const d = this.data;
        const src = `data:${d.mimeType};base64,${d.b64}`;
        const uploaded = new Date(d.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

        this.container.innerHTML = `
            <div class="tt-viewer-wrap">
                <!-- Toolbar -->
                <div class="tt-toolbar" id="ttToolbar">
                    <div class="tt-toolbar-left">
                        <div class="tt-toolbar-brand">
                            <span>📅</span>
                            <span class="tt-toolbar-title">${d.name}</span>
                        </div>
                        <span class="tt-toolbar-meta">Uploaded ${uploaded}</span>
                    </div>
                    <div class="tt-toolbar-center">
                        <button class="tt-tb-btn" id="ttZoomOut" title="Zoom Out (−)">−</button>
                        <div class="tt-zoom-display" id="ttZoomDisplay">100%</div>
                        <button class="tt-tb-btn" id="ttZoomIn" title="Zoom In (+)">+</button>
                        <div class="tt-tb-sep"></div>
                        <button class="tt-tb-btn tt-tb-icon" id="ttFitBtn" title="Fit to screen">⊡</button>
                        <button class="tt-tb-btn tt-tb-icon" id="ttActualBtn" title="Actual size (100%)">1:1</button>
                        <button class="tt-tb-btn tt-tb-icon" id="ttFullBtn" title="Toggle fullscreen">⛶</button>
                    </div>
                    <div class="tt-toolbar-right">
                        <button class="tt-tb-btn tt-tb-replace" id="ttReplaceBtn" title="Upload new timetable">🔄 Replace</button>
                        <button class="tt-tb-btn tt-tb-dl" id="ttDlBtn" title="Download image">⬇ Download</button>
                        <button class="tt-tb-btn tt-tb-del" id="ttDelBtn" title="Delete timetable">🗑</button>
                    </div>
                </div>

                <!-- Canvas -->
                <div class="tt-canvas" id="ttCanvas">
                    <div class="tt-img-wrap" id="ttImgWrap">
                        <img class="tt-img" id="ttImg" src="${src}" alt="Timetable" draggable="false">
                    </div>
                    <!-- Toolbar show hint -->
                    <div class="tt-hint" id="ttHint">Move mouse up to show toolbar</div>
                </div>

                <!-- Bottom zoom bar -->
                <div class="tt-zoom-bar" id="ttZoomBar">
                    <input type="range" class="tt-zoom-slider" id="ttZoomSlider"
                           min="10" max="500" value="100" step="5">
                </div>
            </div>
        `;

        // Wire up controls
        this._initViewerControls(src);
    }

    _initViewerControls(src) {
        const canvas = this.container.querySelector("#ttCanvas");
        const wrap   = this.container.querySelector("#ttImgWrap");
        const img    = this.container.querySelector("#ttImg");
        const toolbar = this.container.querySelector("#ttToolbar");
        const zoomDisplay = this.container.querySelector("#ttZoomDisplay");
        const zoomSlider  = this.container.querySelector("#ttZoomSlider");
        const hint = this.container.querySelector("#ttHint");

        let toolbarTimer = null;
        let toolbarVisible = true;

        const showToolbar = () => {
            toolbar.classList.remove("tt-toolbar-hidden");
            toolbarVisible = true;
            clearTimeout(toolbarTimer);
            toolbarTimer = setTimeout(() => {
                if (!toolbar.matches(":hover")) hideToolbar();
            }, 2500);
        };
        const hideToolbar = () => {
            if (toolbar.matches(":hover")) return;
            toolbar.classList.add("tt-toolbar-hidden");
            toolbarVisible = false;
        };

        canvas.addEventListener("mousemove", e => {
            if (e.clientY < 80 || toolbarVisible) showToolbar();
        });
        toolbar.addEventListener("mouseenter", () => { clearTimeout(toolbarTimer); showToolbar(); });
        toolbar.addEventListener("mouseleave", () => { toolbarTimer = setTimeout(hideToolbar, 1200); });

        // Apply transform
        const applyTransform = () => {
            wrap.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            zoomDisplay.textContent = Math.round(this.zoom * 100) + "%";
            zoomSlider.value = Math.round(this.zoom * 100);
        };

        // Fit to screen
        const fitToScreen = () => {
            img.onload = null;
            const cw = canvas.clientWidth - 40;
            const ch = canvas.clientHeight - 40;
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            if (!iw || !ih) return;
            this.zoom = Math.min(cw / iw, ch / ih, 1);
            this.panX = 0; this.panY = 0;
            applyTransform();
        };

        img.onload = () => fitToScreen();
        if (img.complete) fitToScreen();

        // Zoom buttons
        this.container.querySelector("#ttZoomIn").addEventListener("click", () => {
            this.zoom = Math.min(5, this.zoom * 1.2);
            applyTransform();
        });
        this.container.querySelector("#ttZoomOut").addEventListener("click", () => {
            this.zoom = Math.max(0.1, this.zoom / 1.2);
            applyTransform();
        });
        this.container.querySelector("#ttFitBtn").addEventListener("click", fitToScreen);
        this.container.querySelector("#ttActualBtn").addEventListener("click", () => {
            this.zoom = 1; this.panX = 0; this.panY = 0; applyTransform();
        });

        // Slider
        zoomSlider.addEventListener("input", () => {
            this.zoom = parseInt(zoomSlider.value) / 100;
            applyTransform();
        });

        // Fullscreen toggle
        this.container.querySelector("#ttFullBtn").addEventListener("click", () => {
            const win = this.container.closest(".window");
            if (win) {
                win.style.transition = "all 0.3s ease";
                win.classList.toggle("maximized");
                setTimeout(() => { win.style.transition = ""; fitToScreen(); }, 310);
            }
        });

        // Mouse wheel zoom
        canvas.addEventListener("wheel", e => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left - canvas.clientWidth / 2;
            const my = e.clientY - rect.top - canvas.clientHeight / 2;
            const newZoom = Math.max(0.1, Math.min(5, this.zoom * factor));
            const scale = newZoom / this.zoom;
            this.panX = mx + (this.panX - mx) * scale;
            this.panY = my + (this.panY - my) * scale;
            this.zoom = newZoom;
            applyTransform();
        }, { passive: false });

        // Pan (drag)
        canvas.addEventListener("mousedown", e => {
            if (e.button !== 0) return;
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            canvas.classList.add("panning");
        });
        document.addEventListener("mousemove", e => {
            if (!this.isPanning) return;
            this.panX = e.clientX - this.panStart.x;
            this.panY = e.clientY - this.panStart.y;
            applyTransform();
        });
        document.addEventListener("mouseup", () => {
            this.isPanning = false;
            canvas.classList.remove("panning");
        });

        // Keyboard shortcuts
        const onKey = e => {
            if (!this.container.isConnected) { document.removeEventListener("keydown", onKey); return; }
            if (e.key === "+" || e.key === "=") { this.zoom = Math.min(5, this.zoom * 1.2); applyTransform(); }
            if (e.key === "-") { this.zoom = Math.max(0.1, this.zoom / 1.2); applyTransform(); }
            if (e.key === "0") fitToScreen();
            if (e.key === "1") { this.zoom = 1; this.panX = 0; this.panY = 0; applyTransform(); }
        };
        document.addEventListener("keydown", onKey);

        // Replace
        this.container.querySelector("#ttReplaceBtn").addEventListener("click", () => this._openPicker());

        // Download
        this.container.querySelector("#ttDlBtn").addEventListener("click", () => {
            const a = document.createElement("a");
            a.href = src;
            a.download = this.data.name || "timetable.png";
            a.click();
        });

        // Delete
        this.container.querySelector("#ttDelBtn").addEventListener("click", () => {
            if (confirm("Remove this timetable? You can upload a new one anytime.")) {
                this._save(null);
                this._renderAll();
            }
        });

        // Show hint briefly
        setTimeout(() => { if (hint) hint.classList.add("tt-hint-fade"); }, 2500);
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='timetable']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new TimetableApp());
    }
});
