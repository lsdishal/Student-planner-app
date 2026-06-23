class FeesApp extends BaseApp {
    constructor() {
        super("Fees Tracker");
        this.STORAGE_KEY = "webos_fees_data";
        this.activeYear = "all"; // "all" | "1" | "2" | "3" | "4"
        this.activeFilter = "all"; // "all" | "paid" | "pending" | "overdue" | "partial" | "waived"
        this.container = null;
        this.data = this._load();
    }

    /* ─── Data Persistence & Dummy Data ─── */
    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to load fees data", e);
        }
        
        // No data, load dummy defaults
        const defaults = this._initDefaultData();
        this._save(defaults);
        return defaults;
    }

    _save(data) {
        try {
            this.data = data;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            alert("Storage full! Unable to save. Try uploading smaller receipt files (<2MB).");
        }
    }

    _initDefaultData() {
        const base64Pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        return [
            // Year 1 (All Paid)
            { id: "f1", year: "1", category: "Tuition Fee", amount: 120000, paidAmount: 120000, dueDate: "2023-08-10", status: "Paid", receipt: base64Pixel, receiptName: "tuition_receipt_y1.png", uploadedAt: "2023-08-09T10:15:00.000Z" },
            { id: "f2", year: "1", category: "Hostel Fee", amount: 45000, paidAmount: 45000, dueDate: "2023-08-10", status: "Paid", receipt: base64Pixel, receiptName: "hostel_receipt_y1.png", uploadedAt: "2023-08-09T10:20:00.000Z" },
            { id: "f3", year: "1", category: "Mess Fee", amount: 35000, paidAmount: 35000, dueDate: "2023-08-10", status: "Paid", receipt: base64Pixel, receiptName: "mess_receipt_y1.png", uploadedAt: "2023-08-09T10:25:00.000Z" },
            { id: "f4", year: "1", category: "Exam Fee", amount: 5000, paidAmount: 5000, dueDate: "2023-11-15", status: "Paid", receipt: base64Pixel, receiptName: "exam_receipt_y1.png", uploadedAt: "2023-11-14T09:40:00.000Z" },

            // Year 2 (All Paid)
            { id: "f5", year: "2", category: "Tuition Fee", amount: 125000, paidAmount: 125000, dueDate: "2024-08-10", status: "Paid", receipt: base64Pixel, receiptName: "tuition_receipt_y2.png", uploadedAt: "2024-08-09T11:00:00.000Z" },
            { id: "f6", year: "2", category: "Hostel Fee", amount: 47000, paidAmount: 47000, dueDate: "2024-08-10", status: "Paid", receipt: base64Pixel, receiptName: "hostel_receipt_y2.png", uploadedAt: "2024-08-09T11:05:00.000Z" },
            { id: "f7", year: "2", category: "Mess Fee", amount: 37000, paidAmount: 37000, dueDate: "2024-08-10", status: "Paid", receipt: base64Pixel, receiptName: "mess_receipt_y2.png", uploadedAt: "2024-08-09T11:10:00.000Z" },
            { id: "f8", year: "2", category: "Exam Fee", amount: 5500, paidAmount: 5500, dueDate: "2024-11-15", status: "Paid", receipt: base64Pixel, receiptName: "exam_receipt_y2.png", uploadedAt: "2024-11-14T14:15:00.000Z" },

            // Year 3 (Current - Mixed Statuses)
            { id: "f9", year: "3", category: "Tuition Fee", amount: 130000, paidAmount: 130000, dueDate: "2025-08-10", status: "Paid", receipt: base64Pixel, receiptName: "tuition_receipt_y3.png", uploadedAt: "2025-08-08T15:20:00.000Z" },
            { id: "f10", year: "3", category: "Hostel Fee", amount: 50000, paidAmount: 25000, dueDate: "2025-08-10", status: "Partial", receipt: null, receiptName: null, uploadedAt: null },
            { id: "f11", year: "3", category: "Mess Fee", amount: 40000, paidAmount: 0, dueDate: "2025-08-10", status: "Overdue", receipt: null, receiptName: null, uploadedAt: null },
            { id: "f12", year: "3", category: "Exam Fee", amount: 6000, paidAmount: 0, dueDate: "2026-06-30", status: "Pending", receipt: null, receiptName: null, uploadedAt: null },

            // Year 4 (Future - All Pending)
            { id: "f13", year: "4", category: "Tuition Fee", amount: 135000, paidAmount: 0, dueDate: "2026-08-10", status: "Pending", receipt: null, receiptName: null, uploadedAt: null },
            { id: "f14", year: "4", category: "Hostel Fee", amount: 52000, paidAmount: 0, dueDate: "2026-08-10", status: "Pending", receipt: null, receiptName: null, uploadedAt: null },
            { id: "f15", year: "4", category: "Mess Fee", amount: 42000, paidAmount: 0, dueDate: "2026-08-10", status: "Pending", receipt: null, receiptName: null, uploadedAt: null }
        ];
    }

    /* ─── Calculations ─── */
    _getYearStats(year) {
        const items = year === "all" ? this.data : this.data.filter(x => x.year === year);
        let total = 0, paid = 0, outstanding = 0;
        items.forEach(item => {
            total += item.amount;
            paid += item.paidAmount;
            if (item.status !== "Waived") {
                outstanding += Math.max(0, item.amount - item.paidAmount);
            }
        });
        const pct = total > 0 ? (paid / total) * 100 : 0;
        return { total, paid, outstanding, pct };
    }

    _getCategoryEmoji(category) {
        const c = category.toLowerCase();
        if (c.includes("tuition")) return "🎓";
        if (c.includes("hostel")) return "🏢";
        if (c.includes("mess") || c.includes("food")) return "🍽️";
        if (c.includes("exam") || c.includes("test")) return "📝";
        if (c.includes("library")) return "📖";
        if (c.includes("bus") || c.includes("transport")) return "🚌";
        return "💳";
    }

    /* ─── Render Entry ─── */
    render(container) {
        this.container = container;
        container.classList.add("fees-container");

        // Scale window size to be slightly wider for stats and sidebar layout
        const win = container.closest(".window");
        if (win) {
            win.style.width = "920px";
            win.style.height = "580px";
        }

        this._renderAll();
    }

    _renderAll() {
        const stats = this._getYearStats(this.activeYear);
        const filteredItems = this.data.filter(item => {
            const yearMatch = this.activeYear === "all" || item.year === this.activeYear;
            const filterMatch = this.activeFilter === "all" || item.status.toLowerCase() === this.activeFilter.toLowerCase();
            return yearMatch && filterMatch;
        });

        this.container.innerHTML = `
            <div class="fees-layout">
                <!-- Sidebar -->
                <aside class="fees-sidebar">
                    <div class="fees-sidebar-title">Academic Years</div>
                    <nav class="fees-nav">
                        <button class="fees-nav-btn ${this.activeYear === "all" ? "active" : ""}" data-year="all">
                            <span class="fees-nav-label">All Years</span>
                            <span class="fees-nav-pct">${this._getYearStats("all").pct.toFixed(0)}% paid</span>
                        </button>
                        ${[1, 2, 3, 4].map(y => {
                            const yStr = String(y);
                            const yStats = this._getYearStats(yStr);
                            const overdueCount = this.data.filter(x => x.year === yStr && x.status === "Overdue").length;
                            return `
                                <button class="fees-nav-btn ${this.activeYear === yStr ? "active" : ""}" data-year="${yStr}">
                                    <span class="fees-nav-label">Year ${y}</span>
                                    <span class="fees-nav-sub">
                                        <span>${yStats.pct.toFixed(0)}% paid</span>
                                        ${overdueCount > 0 ? `<span class="fees-nav-alert">⚠️ ${overdueCount} Overdue</span>` : ""}
                                    </span>
                                </button>
                            `;
                        }).join("")}
                    </nav>
                </aside>

                <!-- Main Section -->
                <main class="fees-main">
                    <!-- Dashboard Stats -->
                    <div class="fees-hero">
                        <div class="fees-hero-stats">
                            <div class="fees-stat-card">
                                <span class="fees-stat-icon">💰</span>
                                <div class="fees-stat-details">
                                    <span class="fees-stat-label">Total Amount</span>
                                    <span class="fees-stat-val">₹${stats.total.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                            <div class="fees-stat-card success">
                                <span class="fees-stat-icon">✅</span>
                                <div class="fees-stat-details">
                                    <span class="fees-stat-label">Paid Amount</span>
                                    <span class="fees-stat-val">₹${stats.paid.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                            <div class="fees-stat-card warning">
                                <span class="fees-stat-icon">⚠️</span>
                                <div class="fees-stat-details">
                                    <span class="fees-stat-label">Outstanding</span>
                                    <span class="fees-stat-val">₹${stats.outstanding.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Display -->
                        <div class="fees-hero-progress">
                            <div class="fees-progress-info">
                                <span class="fees-progress-title">Payment Progress</span>
                                <span class="fees-progress-num">${stats.pct.toFixed(1)}%</span>
                            </div>
                            <div class="fees-progress-bg">
                                <div class="fees-progress-fill" style="width: ${stats.pct}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Toolbar & Filters -->
                    <div class="fees-toolbar">
                        <div class="fees-filters" id="feesFilters">
                            <button class="fees-filter-btn ${this.activeFilter === "all" ? "active" : ""}" data-filter="all">All</button>
                            <button class="fees-filter-btn ${this.activeFilter === "paid" ? "active" : ""}" data-filter="paid">Paid</button>
                            <button class="fees-filter-btn ${this.activeFilter === "pending" ? "active" : ""}" data-filter="pending">Pending</button>
                            <button class="fees-filter-btn ${this.activeFilter === "overdue" ? "active" : ""}" data-filter="overdue">Overdue</button>
                            <button class="fees-filter-btn ${this.activeFilter === "partial" ? "active" : ""}" data-filter="partial">Partial</button>
                            <button class="fees-filter-btn ${this.activeFilter === "waived" ? "active" : ""}" data-filter="waived">Waived</button>
                        </div>
                        <button class="fees-add-btn" id="feesAddBtn">➕ Add Fee Record</button>
                    </div>

                    <!-- Fee Items List -->
                    <div class="fees-list-container">
                        ${filteredItems.length === 0 ? `
                            <div class="fees-empty-state">
                                <span class="fees-empty-icon">📂</span>
                                <p class="fees-empty-msg">No fee records found matching selection.</p>
                            </div>
                        ` : `
                            <div class="fees-list">
                                ${filteredItems.map(item => this._renderFeeCard(item)).join("")}
                            </div>
                        `}
                    </div>
                </main>
            </div>
            
            <!-- Global Overlay Container for Modals -->
            <div class="fees-overlay-container hidden" id="feesOverlay"></div>
        `;

        this._attachEvents();
    }

    _renderFeeCard(item) {
        const outstanding = item.status === "Waived" ? 0 : Math.max(0, item.amount - item.paidAmount);
        const hasReceipt = !!item.receipt;
        const emoji = this._getCategoryEmoji(item.category);
        const formattedDate = new Date(item.dueDate).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric"
        });

        // Determine if due date is in the past and status is not Paid/Waived
        const isPastDue = new Date(item.dueDate) < new Date() && !["Paid", "Waived"].includes(item.status);
        const actualStatus = isPastDue ? "Overdue" : item.status;

        return `
            <div class="fees-card" data-id="${item.id}">
                <div class="fees-card-main">
                    <div class="fees-card-cat">
                        <span class="fees-cat-emoji">${emoji}</span>
                        <div class="fees-cat-info">
                            <span class="fees-cat-name">${item.category}</span>
                            <span class="fees-cat-year">Year ${item.year} · Due: ${formattedDate}</span>
                        </div>
                    </div>

                    <div class="fees-card-amounts">
                        <div class="fees-amount-box">
                            <span class="fees-amount-label">Total Fee</span>
                            <span class="fees-amount-val">₹${item.amount.toLocaleString("en-IN")}</span>
                        </div>
                        <div class="fees-amount-box text-success">
                            <span class="fees-amount-label">Paid</span>
                            <span class="fees-amount-val">₹${item.paidAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <div class="fees-amount-box ${outstanding > 0 ? "text-warning" : "text-muted"}">
                            <span class="fees-amount-label">Remaining</span>
                            <span class="fees-amount-val">₹${outstanding.toLocaleString("en-IN")}</span>
                        </div>
                    </div>

                    <div class="fees-card-status">
                        <span class="fees-badge badge-${actualStatus.toLowerCase()}">${actualStatus}</span>
                    </div>
                </div>

                <div class="fees-card-footer">
                    <!-- Receipt Upload / Viewer Area -->
                    <div class="fees-receipt-section">
                        ${hasReceipt ? `
                            <div class="fees-receipt-pill">
                                <span class="fees-receipt-icon">📄</span>
                                <span class="fees-receipt-filename" title="${item.receiptName}">${item.receiptName}</span>
                                <div class="fees-receipt-actions">
                                    <button class="fees-receipt-btn view" data-action="view-receipt" title="View receipt">👁️ View</button>
                                    <button class="fees-receipt-btn dl" data-action="dl-receipt" title="Download receipt">⬇️</button>
                                    <button class="fees-receipt-btn del" data-action="del-receipt" title="Remove receipt">🗑️</button>
                                </div>
                            </div>
                        ` : `
                            <div class="fees-upload-zone" data-action="trigger-upload">
                                <span class="fees-upload-hint">📤 Drag & drop receipt or <strong>Browse</strong></span>
                            </div>
                        `}
                    </div>

                    <!-- Record Controls -->
                    <div class="fees-card-actions">
                        <button class="fees-action-btn edit" data-action="edit" title="Edit record">✏️ Edit</button>
                        <button class="fees-action-btn delete" data-action="delete" title="Delete record">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    /* ─── Event Bindings & Actions ─── */
    _attachEvents() {
        // Sidebar Navigation
        this.container.querySelectorAll(".fees-nav-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                this.activeYear = btn.dataset.year;
                this._renderAll();
            });
        });

        // Filter Buttons
        this.container.querySelector("#feesFilters").addEventListener("click", e => {
            const btn = e.target.closest(".fees-filter-btn");
            if (!btn) return;
            this.activeFilter = btn.dataset.filter;
            this._renderAll();
        });

        // Add Record Button
        this.container.querySelector("#feesAddBtn").addEventListener("click", () => {
            this._showAddEditModal();
        });

        // Card Specific Actions
        this.container.querySelectorAll(".fees-card").forEach(card => {
            const id = card.dataset.id;
            const item = this.data.find(x => x.id === id);
            if (!item) return;

            // Edit record
            card.querySelector("[data-action='edit']").addEventListener("click", () => {
                this._showAddEditModal(item);
            });

            // Delete record
            card.querySelector("[data-action='delete']").addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete the ${item.category} record for Year ${item.year}?`)) {
                    const filtered = this.data.filter(x => x.id !== id);
                    this._save(filtered);
                    this._renderAll();
                }
            });

            // Receipt: View
            const viewBtn = card.querySelector("[data-action='view-receipt']");
            if (viewBtn) {
                viewBtn.addEventListener("click", () => this._showReceiptViewer(item));
            }

            // Receipt: Download
            const dlBtn = card.querySelector("[data-action='dl-receipt']");
            if (dlBtn) {
                dlBtn.addEventListener("click", () => {
                    const a = document.createElement("a");
                    a.href = item.receipt;
                    a.download = item.receiptName || "receipt.png";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                });
            }

            // Receipt: Delete
            const delBtn = card.querySelector("[data-action='del-receipt']");
            if (delBtn) {
                delBtn.addEventListener("click", () => {
                    if (confirm("Are you sure you want to delete the receipt file?")) {
                        item.receipt = null;
                        item.receiptName = null;
                        item.uploadedAt = null;
                        this._save(this.data);
                        this._renderAll();
                    }
                });
            }

            // Receipt: Upload click / Drag-drop
            const uploadZone = card.querySelector(".fees-upload-zone");
            if (uploadZone) {
                uploadZone.addEventListener("click", () => this._triggerFileUpload(item));
                
                // Drag Over
                uploadZone.addEventListener("dragover", e => {
                    e.preventDefault();
                    uploadZone.classList.add("drag-active");
                });

                // Drag Leave
                uploadZone.addEventListener("dragleave", () => {
                    uploadZone.classList.remove("drag-active");
                });

                // Drop file
                uploadZone.addEventListener("drop", e => {
                    e.preventDefault();
                    uploadZone.classList.remove("drag-active");
                    const file = e.dataTransfer.files[0];
                    if (file) this._processReceiptFile(file, item);
                });
            }
        });
    }

    /* ─── File Upload Processing ─── */
    _triggerFileUpload(item) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/jpg,application/pdf";
        input.style.display = "none";
        document.body.appendChild(input);
        
        input.addEventListener("change", () => {
            if (input.files[0]) {
                this._processReceiptFile(input.files[0], item);
            }
            input.remove();
        });
        input.click();
    }

    _processReceiptFile(file, item) {
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            alert("Unsupported format. Please upload PNG, JPG, or PDF files.");
            return;
        }

        // Limit size to 2MB (localStorage quota is ~5MB)
        if (file.size > 2 * 1024 * 1024) {
            alert(`File size is too large: ${(file.size / 1024 / 1024).toFixed(2)} MB. Please upload a compressed receipt under 2 MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            item.receipt = e.target.result; // base64 data URL
            item.receiptName = file.name;
            item.uploadedAt = new Date().toISOString();
            
            // Auto update status to Paid if it was Pending/Overdue and we uploaded a receipt
            if (item.status === "Pending" || item.status === "Overdue") {
                item.status = "Paid";
                item.paidAmount = item.amount; // assume fully paid on receipt upload
            }

            this._save(this.data);
            this._renderAll();
        };
        reader.onerror = () => alert("Error reading file.");
        reader.readAsDataURL(file);
    }

    /* ─── Modal Dialogs ─── */
    _showAddEditModal(item = null) {
        const overlay = this.container.querySelector("#feesOverlay");
        const isEdit = !!item;
        
        overlay.innerHTML = `
            <div class="fees-modal">
                <div class="fees-modal-header">
                    <h3>${isEdit ? "Edit Fee Record" : "Add Fee Record"}</h3>
                    <button class="fees-modal-close" id="modalClose">✖</button>
                </div>
                <form class="fees-modal-form" id="feeForm">
                    <div class="fees-form-group">
                        <label for="fYear">Academic Year</label>
                        <select id="fYear" required>
                            <option value="1" ${isEdit && item.year === "1" ? "selected" : ""}>Year 1</option>
                            <option value="2" ${isEdit && item.year === "2" ? "selected" : ""}>Year 2</option>
                            <option value="3" ${isEdit && item.year === "3" ? "selected" : ""}>Year 3</option>
                            <option value="4" ${isEdit && item.year === "4" ? "selected" : ""}>Year 4</option>
                        </select>
                    </div>
                    <div class="fees-form-group">
                        <label for="fCat">Category Name</label>
                        <input type="text" id="fCat" placeholder="e.g. Tuition Fee, Hostel Fee" value="${isEdit ? item.category : ""}" required />
                    </div>
                    <div class="fees-form-grid">
                        <div class="fees-form-group">
                            <label for="fAmount">Total Amount (₹)</label>
                            <input type="number" id="fAmount" min="0" value="${isEdit ? item.amount : ""}" required />
                        </div>
                        <div class="fees-form-group">
                            <label for="fPaid">Paid Amount (₹)</label>
                            <input type="number" id="fPaid" min="0" value="${isEdit ? item.paidAmount : "0"}" required />
                        </div>
                    </div>
                    <div class="fees-form-grid">
                        <div class="fees-form-group">
                            <label for="fDate">Due Date</label>
                            <input type="date" id="fDate" value="${isEdit ? item.dueDate : ""}" required />
                        </div>
                        <div class="fees-form-group">
                            <label for="fStatus">Payment Status</label>
                            <select id="fStatus" required>
                                <option value="Paid" ${isEdit && item.status === "Paid" ? "selected" : ""}>Paid</option>
                                <option value="Pending" ${isEdit && item.status === "Pending" ? "selected" : ""}>Pending</option>
                                <option value="Overdue" ${isEdit && item.status === "Overdue" ? "selected" : ""}>Overdue</option>
                                <option value="Partial" ${isEdit && item.status === "Partial" ? "selected" : ""}>Partial</option>
                                <option value="Waived" ${isEdit && item.status === "Waived" ? "selected" : ""}>Waived</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="fees-modal-actions">
                        <button type="button" class="fees-btn secondary" id="modalCancel">Cancel</button>
                        <button type="submit" class="fees-btn primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        overlay.classList.remove("hidden");

        const close = () => {
            overlay.classList.add("hidden");
        };

        overlay.querySelector("#modalClose").onclick = close;
        overlay.querySelector("#modalCancel").onclick = close;

        // Auto update paid amount if status is Paid or Waived
        const statusSelect = overlay.querySelector("#fStatus");
        const amountInput = overlay.querySelector("#fAmount");
        const paidInput = overlay.querySelector("#fPaid");

        statusSelect.addEventListener("change", () => {
            if (statusSelect.value === "Paid") {
                paidInput.value = amountInput.value || 0;
            } else if (statusSelect.value === "Pending" || statusSelect.value === "Overdue" || statusSelect.value === "Waived") {
                paidInput.value = 0;
            }
        });

        amountInput.addEventListener("input", () => {
            if (statusSelect.value === "Paid") {
                paidInput.value = amountInput.value;
            }
        });

        // Form Submit
        overlay.querySelector("#feeForm").onsubmit = e => {
            e.preventDefault();
            const year = overlay.querySelector("#fYear").value;
            const category = overlay.querySelector("#fCat").value.trim();
            const amount = parseFloat(overlay.querySelector("#fAmount").value);
            const paidAmount = parseFloat(overlay.querySelector("#fPaid").value);
            const dueDate = overlay.querySelector("#fDate").value;
            const status = overlay.querySelector("#fStatus").value;

            if (paidAmount > amount) {
                alert("Paid amount cannot exceed total fee amount.");
                return;
            }

            if (isEdit) {
                // Update
                item.year = year;
                item.category = category;
                item.amount = amount;
                item.paidAmount = paidAmount;
                item.dueDate = dueDate;
                item.status = status;
            } else {
                // Insert
                const newRec = {
                    id: "f_" + Date.now(),
                    year,
                    category,
                    amount,
                    paidAmount,
                    dueDate,
                    status,
                    receipt: null,
                    receiptName: null,
                    uploadedAt: null
                };
                this.data.push(newRec);
            }

            this._save(this.data);
            close();
            this._renderAll();
        };
    }

    _showReceiptViewer(item) {
        const overlay = this.container.querySelector("#feesOverlay");
        const isPdf = item.receipt.startsWith("data:application/pdf");
        
        overlay.innerHTML = `
            <div class="fees-modal viewer">
                <div class="fees-modal-header">
                    <h3>Receipt: ${item.receiptName}</h3>
                    <button class="fees-modal-close" id="modalClose">✖</button>
                </div>
                <div class="fees-viewer-content">
                    ${isPdf ? `
                        <div class="fees-pdf-preview">
                            <span class="fees-pdf-icon">📄</span>
                            <p>PDF Document receipt cannot be previewed directly inside the frame.</p>
                            <a href="${item.receipt}" download="${item.receiptName}" class="fees-btn primary">⬇️ Download PDF Receipt</a>
                        </div>
                    ` : `
                        <img src="${item.receipt}" class="fees-img-preview" alt="Receipt preview" />
                    `}
                </div>
                <div class="fees-modal-actions">
                    <button class="fees-btn secondary" id="viewerClose">Close</button>
                </div>
            </div>
        `;

        overlay.classList.remove("hidden");

        const close = () => {
            overlay.classList.add("hidden");
        };

        overlay.querySelector("#modalClose").onclick = close;
        overlay.querySelector("#viewerClose").onclick = close;
    }
}

// System Boot App Registration
EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='fees']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new FeesApp());
    }
});
