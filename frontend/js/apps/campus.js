class CampusApp extends BaseApp {
    constructor() {
        super("Campus Life");
        this.MESS_KEY    = "webos_campus_mess";
        this.LAUNDRY_KEY = "webos_campus_laundry";
        this.BUS_KEY     = "webos_campus_buses";
        this.MODE_KEY    = "webos_campus_mode";

        // Try to auto-detect mode from Profile app
        const profile = (() => { try { return JSON.parse(localStorage.getItem("webos_student_profile") || "{}"); } catch { return {}; } })();
        const savedMode = localStorage.getItem(this.MODE_KEY);
        this.mode = savedMode || (profile.resType === "Day Scholar" ? "dayscholar" : "hosteller");

        this.mess    = this._loadMess();
        this.laundry = this._loadLaundry();
        this.buses   = this._loadBuses();

        this.activeDay  = this._today();
        this.activeBus  = null;
        this.container  = null;
    }

    /* ─── Defaults & Load ─── */
    _today() {
        return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
    }
    _time() {
        return new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
    }
    _loadMess() {
        try { return JSON.parse(localStorage.getItem(this.MESS_KEY)) || this._defaultMess(); }
        catch { return this._defaultMess(); }
    }
    _loadLaundry() {
        try { return JSON.parse(localStorage.getItem(this.LAUNDRY_KEY)) || this._defaultLaundry(); }
        catch { return this._defaultLaundry(); }
    }
    _loadBuses() {
        try { return JSON.parse(localStorage.getItem(this.BUS_KEY)) || []; }
        catch { return []; }
    }
    _saveMess()    { localStorage.setItem(this.MESS_KEY,    JSON.stringify(this.mess)); }
    _saveLaundry() { localStorage.setItem(this.LAUNDRY_KEY, JSON.stringify(this.laundry)); }
    _saveBuses()   { localStorage.setItem(this.BUS_KEY,     JSON.stringify(this.buses)); }
    _saveMode()    { localStorage.setItem(this.MODE_KEY,    this.mode); }

    _defaultMess() {
        const meals = {
            Monday:    { breakfast:"Idli, Sambar, Coconut Chutney, Tea / Coffee", lunch:"Rice, Dal Fry, Sambar, Rasam, Papad, Pickle, Curd", snacks:"Bread Butter, Boiled Egg / Banana, Tea", dinner:"Chapati, Dal Makhani, Jeera Rice, Salad, Sweet" },
            Tuesday:   { breakfast:"Poha, Boiled Egg, Tea / Coffee", lunch:"Rice, Rajma, Sambar, Rasam, Papad, Pickle, Curd", snacks:"Veg Puff, Tea", dinner:"Chapati, Paneer Butter Masala, Plain Rice, Salad" },
            Wednesday: { breakfast:"Dosa, Sambar, Chutney, Tea / Coffee", lunch:"Rice, Chole, Sambar, Rasam, Papad, Pickle, Curd", snacks:"Bread Omelette, Tea", dinner:"Parotta, Chicken Curry / Veg Kurma, Salad" },
            Thursday:  { breakfast:"Upma, Chutney, Tea / Coffee", lunch:"Rice, Dal Tadka, Sambar, Rasam, Papad, Pickle, Curd", snacks:"Veg Cutlet, Tea", dinner:"Chapati, Dal, Fried Rice, Salad, Payasam" },
            Friday:    { breakfast:"Pongal, Sambar, Ghee, Tea / Coffee", lunch:"Rice, Fish Curry / Kadai Paneer, Sambar, Rasam, Papad, Pickle, Curd", snacks:"Egg Puff / Veg Puff, Tea", dinner:"Chapati, Egg Curry / Palak Paneer, Rice, Salad" },
            Saturday:  { breakfast:"Idli, Vada, Sambar, Chutney, Tea / Coffee", lunch:"Special Biryani (Chicken/Veg), Raita, Papad, Dessert", snacks:"Samosa, Tea", dinner:"Chapati, Mixed Veg, Dal Rice, Salad" },
            Sunday:    { breakfast:"Bread Toast, Omelette / Jam, Cornflakes, Milk", lunch:"Special Sunday Meals – Biryani, Raita, Papad, Sweet", snacks:"Snack Plate, Coffee", dinner:"Chapati, Paneer / Egg Masala, Fried Rice, Salad" }
        };
        return meals;
    }
    _defaultLaundry() {
        return {
            batch: "A",
            slots: [
                { day: "Monday",    pickup: "08:00 AM – 10:00 AM", delivery: "" },
                { day: "Wednesday", pickup: "",                     delivery: "04:00 PM – 06:00 PM" },
                { day: "Thursday",  pickup: "08:00 AM – 10:00 AM", delivery: "" },
                { day: "Saturday",  pickup: "",                     delivery: "04:00 PM – 06:00 PM" }
            ],
            notes: "Place clothes in the laundry bag with your reg. number tag. Max 5 kg per slot."
        };
    }

    /* ─── Render Entry ─── */
    render(container) {
        this.container = container;
        container.classList.add("campus-container");
        this._renderShell();
    }

    _renderShell() {
        this.container.innerHTML = `
            <div class="campus-layout">
                <!-- Top bar with mode toggle -->
                <div class="campus-topbar">
                    <div class="campus-topbar-brand">
                        <span class="campus-topbar-icon">🏫</span>
                        <span class="campus-topbar-title">Campus Life</span>
                    </div>
                    <div class="campus-mode-toggle">
                        <button class="campus-toggle-btn ${this.mode === 'hosteller' ? 'active' : ''}" data-mode="hosteller">
                            🏠 Hosteller
                        </button>
                        <button class="campus-toggle-btn ${this.mode === 'dayscholar' ? 'active' : ''}" data-mode="dayscholar">
                            🚌 Day Scholar
                        </button>
                    </div>
                    <div class="campus-topbar-right">
                        <div class="campus-clock" id="campusClock">${this._time()}</div>
                    </div>
                </div>

                <!-- Main content -->
                <div class="campus-main" id="campusMain"></div>
            </div>
        `;

        // Live clock
        this._clockInterval = setInterval(() => {
            const el = this.container.querySelector("#campusClock");
            if (el) el.textContent = this._time();
            else clearInterval(this._clockInterval);
        }, 60000);

        // Mode toggle
        this.container.querySelectorAll(".campus-toggle-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                this.mode = btn.dataset.mode;
                this._saveMode();
                this.container.querySelectorAll(".campus-toggle-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === this.mode));
                this._renderMain();
            });
        });

        this._renderMain();
    }

    _renderMain() {
        const main = this.container.querySelector("#campusMain");
        if (this.mode === "hosteller") {
            this._renderHostellerView(main);
        } else {
            this._renderDayScholarView(main);
        }
    }

    /* ════════════════════════════════════════
       HOSTELLER VIEW
    ════════════════════════════════════════ */
    _renderHostellerView(main) {
        const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        const today = this._today();
        const todayMeals = this.mess[today] || {};
        const mealIcons = { breakfast:"🌅", lunch:"☀️", snacks:"🍵", dinner:"🌙" };
        const mealColors = { breakfast:"#fdcb6e", lunch:"#74b9ff", snacks:"#55efc4", dinner:"#a29bfe" };

        main.innerHTML = `
            <div class="campus-h-view">
                <!-- Today's Hero Card -->
                <div class="campus-today-card">
                    <div class="campus-today-header">
                        <div>
                            <div class="campus-today-label">Today's Mess Menu</div>
                            <div class="campus-today-day">${today}</div>
                        </div>
                        <button class="campus-edit-btn" id="hEditTodayBtn" title="Edit Today's Menu">✏️ Edit</button>
                    </div>
                    <div class="campus-today-meals">
                        ${["breakfast","lunch","snacks","dinner"].map(meal => `
                            <div class="campus-meal-card" style="--meal-color:${mealColors[meal]}">
                                <div class="campus-meal-icon">${mealIcons[meal]}</div>
                                <div class="campus-meal-name">${meal.charAt(0).toUpperCase()+meal.slice(1)}</div>
                                <div class="campus-meal-items">${todayMeals[meal] || "—"}</div>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div class="campus-h-lower">
                    <!-- Weekly Schedule -->
                    <div class="campus-weekly-card">
                        <div class="campus-card-header">
                            <span>📋</span><span>Weekly Mess Schedule</span>
                            <button class="campus-edit-btn campus-edit-btn-sm" id="hEditWeekBtn">✏️ Edit Week</button>
                        </div>
                        <div class="campus-day-tabs">
                            ${days.map(d => `
                                <button class="campus-day-tab ${d === this.activeDay ? 'active' : ''} ${d === today ? 'today' : ''}" data-day="${d}">
                                    ${d.slice(0,3)}
                                </button>
                            `).join("")}
                        </div>
                        <div class="campus-day-meals" id="hDayMeals">
                            ${this._renderDayMeals(this.activeDay, mealIcons, mealColors)}
                        </div>
                    </div>

                    <!-- Laundry Schedule -->
                    <div class="campus-laundry-card">
                        <div class="campus-card-header">
                            <span>👕</span><span>Laundry Schedule</span>
                            <span class="campus-laundry-batch">Batch <strong>${this.laundry.batch}</strong></span>
                            <button class="campus-edit-btn campus-edit-btn-sm" id="hEditLaundryBtn">✏️ Edit</button>
                        </div>
                        <div class="campus-laundry-grid">
                            ${this.laundry.slots.map(slot => `
                                <div class="campus-laundry-slot ${slot.day === today ? 'today' : ''}">
                                    <div class="campus-laundry-day">${slot.day.slice(0,3)}</div>
                                    ${slot.pickup ? `<div class="campus-laundry-type pickup">⬆ Pickup<span>${slot.pickup}</span></div>` : ""}
                                    ${slot.delivery ? `<div class="campus-laundry-type delivery">⬇ Delivery<span>${slot.delivery}</span></div>` : ""}
                                </div>
                            `).join("")}
                        </div>
                        ${this.laundry.notes ? `<div class="campus-laundry-notes">ℹ️ ${this.laundry.notes}</div>` : ""}
                        <!-- Next laundry event -->
                        ${this._nextLaundryEvent()}
                    </div>
                </div>
            </div>
        `;

        // Day tab switching
        main.querySelectorAll(".campus-day-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                this.activeDay = tab.dataset.day;
                main.querySelectorAll(".campus-day-tab").forEach(t => t.classList.toggle("active", t.dataset.day === this.activeDay));
                const mealArea = main.querySelector("#hDayMeals");
                if (mealArea) mealArea.innerHTML = this._renderDayMeals(this.activeDay, mealIcons, mealColors);
            });
        });

        // Edit buttons
        main.querySelector("#hEditTodayBtn")?.addEventListener("click", () => this._editMessDay(today, main));
        main.querySelector("#hEditWeekBtn")?.addEventListener("click", () => this._editMessWeek(main));
        main.querySelector("#hEditLaundryBtn")?.addEventListener("click", () => this._editLaundry(main));
    }

    _renderDayMeals(day, icons, colors) {
        const meals = this.mess[day] || {};
        return ["breakfast","lunch","snacks","dinner"].map(meal => `
            <div class="campus-dm-row">
                <span class="campus-dm-icon">${icons[meal]}</span>
                <span class="campus-dm-name" style="color:${colors[meal]}">${meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                <span class="campus-dm-items">${meals[meal] || "—"}</span>
            </div>
        `).join("");
    }

    _nextLaundryEvent() {
        const dayIdx = { Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6,Sunday:0 };
        const todayIdx = new Date().getDay();
        let upcoming = [];
        this.laundry.slots.forEach(s => {
            const di = dayIdx[s.day] ?? -1;
            let diff = (di - todayIdx + 7) % 7;
            if (s.pickup) upcoming.push({ diff, label: `Pickup – ${s.day}`, time: s.pickup, type: "pickup" });
            if (s.delivery) upcoming.push({ diff, label: `Delivery – ${s.day}`, time: s.delivery, type: "delivery" });
        });
        upcoming.sort((a,b) => a.diff - b.diff);
        const next = upcoming[0];
        if (!next) return "";
        const daysText = next.diff === 0 ? "Today" : next.diff === 1 ? "Tomorrow" : `In ${next.diff} days`;
        return `
            <div class="campus-next-laundry">
                <span class="campus-next-label">Next:</span>
                <span class="campus-next-type ${next.type}">${next.type === "pickup" ? "⬆" : "⬇"} ${next.label}</span>
                <span class="campus-next-when">${daysText} · ${next.time}</span>
            </div>
        `;
    }

    /* ─── Edit Mess Day Modal ─── */
    _editMessDay(day, main) {
        const meals = this.mess[day] || {};
        this._openModal(main, `
            <div class="campus-modal-header"><span>🍽️</span><h3>Edit ${day}'s Menu</h3></div>
            ${["breakfast","lunch","snacks","dinner"].map(m => `
                <div class="campus-modal-field">
                    <label>${m.charAt(0).toUpperCase()+m.slice(1)}</label>
                    <textarea name="${m}" class="campus-modal-textarea" rows="2" placeholder="Enter items…">${meals[m]||""}</textarea>
                </div>
            `).join("")}
            <div class="campus-modal-actions">
                <button class="campus-btn campus-btn-ghost" data-action="cancel">Cancel</button>
                <button class="campus-btn campus-btn-primary" data-action="save-day" data-day="${day}">💾 Save</button>
            </div>
        `, (action, form) => {
            if (action === "save-day") {
                ["breakfast","lunch","snacks","dinner"].forEach(m => {
                    this.mess[day][m] = form.querySelector(`[name="${m}"]`).value.trim();
                });
                this._saveMess();
                this._closeModal(main);
                this._renderMain();
            }
        });
    }

    /* ─── Edit Laundry Modal ─── */
    _editLaundry(main) {
        const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        this._openModal(main, `
            <div class="campus-modal-header"><span>👕</span><h3>Edit Laundry Schedule</h3></div>
            <div class="campus-modal-field">
                <label>Your Batch</label>
                <input class="campus-modal-input" name="batch" type="text" value="${this.laundry.batch||""}" placeholder="A / B / C">
            </div>
            <div class="campus-modal-field">
                <label>Notes</label>
                <textarea class="campus-modal-textarea" name="notes" rows="2">${this.laundry.notes||""}</textarea>
            </div>
            <div class="campus-laundry-edit-rows" id="laundryEditRows">
                ${this.laundry.slots.map((s,i) => `
                    <div class="campus-laundry-edit-row">
                        <select class="campus-modal-input campus-modal-select" name="day-${i}">
                            ${days.map(d => `<option ${d===s.day?"selected":""}>${d}</option>`).join("")}
                        </select>
                        <input class="campus-modal-input" name="pickup-${i}" type="text" value="${s.pickup||""}" placeholder="Pickup time or blank">
                        <input class="campus-modal-input" name="delivery-${i}" type="text" value="${s.delivery||""}" placeholder="Delivery time or blank">
                        <button class="campus-laundry-del-row" data-idx="${i}" type="button">✕</button>
                    </div>
                `).join("")}
            </div>
            <button class="campus-btn campus-btn-ghost" id="addLaundryRow" type="button" style="margin-top:8px;width:100%">＋ Add Row</button>
            <div class="campus-modal-actions">
                <button class="campus-btn campus-btn-ghost" data-action="cancel">Cancel</button>
                <button class="campus-btn campus-btn-primary" data-action="save-laundry">💾 Save</button>
            </div>
        `, (action, form) => {
            if (action === "save-laundry") {
                const rows = form.querySelectorAll(".campus-laundry-edit-row");
                const slots = [];
                rows.forEach((row, i) => {
                    slots.push({
                        day: row.querySelector(`[name="day-${i}"]`)?.value || "Monday",
                        pickup: row.querySelector(`[name="pickup-${i}"]`)?.value.trim() || "",
                        delivery: row.querySelector(`[name="delivery-${i}"]`)?.value.trim() || ""
                    });
                });
                this.laundry = { batch: form.querySelector("[name='batch']").value.trim(), notes: form.querySelector("[name='notes']").value.trim(), slots };
                this._saveLaundry();
                this._closeModal(main);
                this._renderMain();
            }
        }, (modal) => {
            // Add row
            modal.querySelector("#addLaundryRow")?.addEventListener("click", () => {
                const rows = modal.querySelectorAll(".campus-laundry-edit-row");
                const idx = rows.length;
                const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
                const newRow = document.createElement("div");
                newRow.className = "campus-laundry-edit-row";
                newRow.innerHTML = `
                    <select class="campus-modal-input campus-modal-select" name="day-${idx}">
                        ${days.map(d => `<option>${d}</option>`).join("")}
                    </select>
                    <input class="campus-modal-input" name="pickup-${idx}" type="text" placeholder="Pickup time or blank">
                    <input class="campus-modal-input" name="delivery-${idx}" type="text" placeholder="Delivery time or blank">
                    <button class="campus-laundry-del-row" data-idx="${idx}" type="button">✕</button>
                `;
                modal.querySelector("#laundryEditRows").appendChild(newRow);
                newRow.querySelector(".campus-laundry-del-row").addEventListener("click", () => newRow.remove());
            });
            // Delete existing rows
            modal.querySelectorAll(".campus-laundry-del-row").forEach(btn => {
                btn.addEventListener("click", () => btn.closest(".campus-laundry-edit-row").remove());
            });
        });
    }

    _editMessWeek(main) {
        // Simplified — just edit all days' dinner as a quick representative
        // Open a per-day collapsible form
        const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        const meals = ["breakfast","lunch","snacks","dinner"];
        this._openModal(main, `
            <div class="campus-modal-header"><span>📋</span><h3>Edit Weekly Menu</h3></div>
            <div class="campus-modal-scroll">
                ${days.map(d => `
                    <div class="campus-week-edit-section">
                        <div class="campus-week-edit-day">${d}</div>
                        ${meals.map(m => `
                            <div class="campus-modal-field">
                                <label>${m.charAt(0).toUpperCase()+m.slice(1)}</label>
                                <input class="campus-modal-input" name="${d}-${m}" type="text" value="${(this.mess[d]||{})[m]||""}" placeholder="Enter items…">
                            </div>
                        `).join("")}
                    </div>
                `).join("")}
            </div>
            <div class="campus-modal-actions">
                <button class="campus-btn campus-btn-ghost" data-action="cancel">Cancel</button>
                <button class="campus-btn campus-btn-primary" data-action="save-week">💾 Save All</button>
            </div>
        `, (action, form) => {
            if (action === "save-week") {
                days.forEach(d => {
                    if (!this.mess[d]) this.mess[d] = {};
                    meals.forEach(m => {
                        const inp = form.querySelector(`[name="${d}-${m}"]`);
                        if (inp) this.mess[d][m] = inp.value.trim();
                    });
                });
                this._saveMess();
                this._closeModal(main);
                this._renderMain();
            }
        });
    }

    /* ════════════════════════════════════════
       DAY SCHOLAR VIEW
    ════════════════════════════════════════ */
    _renderDayScholarView(main) {
        main.innerHTML = `
            <div class="campus-ds-view">
                <!-- Header row -->
                <div class="campus-ds-header">
                    <div class="campus-ds-header-left">
                        <h2>🚌 Bus Routes</h2>
                        <span class="campus-ds-subtitle">${this.buses.length} route${this.buses.length !== 1 ? "s" : ""} saved</span>
                    </div>
                    <button class="campus-btn campus-btn-primary" id="dsAddRouteBtn">＋ Add Route</button>
                </div>

                ${this.buses.length === 0 ? `
                    <div class="campus-ds-empty">
                        <div style="font-size:56px;margin-bottom:16px;animation:campusFloat 3s ease-in-out infinite">🚌</div>
                        <h3>No Bus Routes Saved</h3>
                        <p>Add your bus route to see timings, stops and route info.</p>
                        <button class="campus-btn campus-btn-primary" id="dsAddRouteBtn2">＋ Add My Route</button>
                    </div>
                ` : `
                    <div class="campus-ds-content">
                        <!-- Route cards list -->
                        <div class="campus-route-list" id="dsRouteList">
                            ${this.buses.map((b, i) => this._routeCard(b, i)).join("")}
                        </div>

                        <!-- Route detail panel -->
                        <div class="campus-route-detail" id="dsRouteDetail">
                            ${this.activeBus !== null && this.buses[this.activeBus] ? this._routeDetail(this.buses[this.activeBus], this.activeBus) : this._routeDetailEmpty()}
                        </div>
                    </div>
                `}
            </div>
        `;

        main.querySelector("#dsAddRouteBtn")?.addEventListener("click", () => this._editRoute(main, null));
        main.querySelector("#dsAddRouteBtn2")?.addEventListener("click", () => this._editRoute(main, null));

        main.querySelectorAll(".campus-route-card").forEach(card => {
            card.addEventListener("click", e => {
                if (e.target.closest(".campus-route-card-actions")) return;
                const idx = parseInt(card.dataset.idx);
                this.activeBus = idx;
                main.querySelectorAll(".campus-route-card").forEach(c => c.classList.toggle("active", parseInt(c.dataset.idx) === idx));
                const detail = main.querySelector("#dsRouteDetail");
                if (detail) detail.innerHTML = this._routeDetail(this.buses[idx], idx);
                this._bindDetailEvents(main, detail, idx);
            });
        });

        main.querySelectorAll(".campus-route-edit-btn").forEach(btn => {
            btn.addEventListener("click", e => { e.stopPropagation(); this._editRoute(main, parseInt(btn.dataset.idx)); });
        });
        main.querySelectorAll(".campus-route-del-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                if (confirm("Delete this route?")) {
                    this.buses.splice(parseInt(btn.dataset.idx), 1);
                    this._saveBuses();
                    this.activeBus = null;
                    this._renderMain();
                }
            });
        });

        if (this.activeBus !== null && this.buses[this.activeBus]) {
            const detail = main.querySelector("#dsRouteDetail");
            if (detail) this._bindDetailEvents(main, detail, this.activeBus);
        }
    }

    _routeCard(bus, idx) {
        const isActive = this.activeBus === idx;
        return `
            <div class="campus-route-card ${isActive ? "active" : ""}" data-idx="${idx}">
                <div class="campus-route-card-top">
                    <div class="campus-route-num" style="background:${bus.color||"#6c5ce7"}22;color:${bus.color||"#6c5ce7"};border-color:${bus.color||"#6c5ce7"}44">
                        Route ${bus.routeNo || "?"}
                    </div>
                    <div class="campus-route-card-actions">
                        <button class="campus-route-edit-btn" data-idx="${idx}" title="Edit">✏️</button>
                        <button class="campus-route-del-btn" data-idx="${idx}" title="Delete">🗑</button>
                    </div>
                </div>
                <div class="campus-route-card-name">${bus.name || "My Bus"}</div>
                <div class="campus-route-card-path">
                    <span class="campus-route-from">${bus.from || "—"}</span>
                    <span class="campus-route-arrow">→</span>
                    <span class="campus-route-to">${bus.to || "—"}</span>
                </div>
                <div class="campus-route-card-meta">
                    ${bus.busNo ? `<span>🚌 ${bus.busNo}</span>` : ""}
                    ${bus.stops?.length ? `<span>📍 ${bus.stops.length} stops</span>` : ""}
                    ${bus.pickupTime ? `<span>⏰ ${bus.pickupTime}</span>` : ""}
                </div>
            </div>
        `;
    }

    _routeDetailEmpty() {
        return `<div class="campus-route-detail-empty"><div style="font-size:40px">👈</div><p>Select a route to see details</p></div>`;
    }

    _routeDetail(bus, idx) {
        const stops = bus.stops || [];
        return `
            <div class="campus-route-detail-inner">
                <div class="campus-route-detail-header">
                    <div class="campus-route-detail-num" style="background:${bus.color||"#6c5ce7"}22;color:${bus.color||"#6c5ce7"}">Route ${bus.routeNo||"?"}</div>
                    <div class="campus-route-detail-title">${bus.name||"My Bus"}</div>
                    <button class="campus-btn campus-btn-ghost campus-detail-edit-btn" data-idx="${idx}">✏️ Edit Route</button>
                </div>

                <!-- Key info cards -->
                <div class="campus-route-info-cards">
                    ${this._infoCard("🚌", "Bus Number", bus.busNo)}
                    ${this._infoCard("🏁", "From", bus.from)}
                    ${this._infoCard("🎯", "To", bus.to)}
                    ${this._infoCard("⏰", "Pickup Time", bus.pickupTime)}
                    ${this._infoCard("⏱", "Drop Time", bus.dropTime)}
                    ${this._infoCard("📞", "Driver Contact", bus.driverPhone)}
                </div>

                <!-- Stops timeline -->
                ${stops.length ? `
                    <div class="campus-stops-section">
                        <div class="campus-stops-title">📍 Route Stops</div>
                        <div class="campus-stops-timeline">
                            ${stops.map((s, i) => `
                                <div class="campus-stop-item ${i === 0 ? "first" : ""} ${i === stops.length-1 ? "last" : ""}">
                                    <div class="campus-stop-dot"></div>
                                    <div class="campus-stop-info">
                                        <span class="campus-stop-name">${s.name}</span>
                                        ${s.time ? `<span class="campus-stop-time">${s.time}</span>` : ""}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                ` : ""}

                <!-- Notes -->
                ${bus.notes ? `<div class="campus-route-notes">ℹ️ ${bus.notes}</div>` : ""}
            </div>
        `;
    }

    _infoCard(icon, label, value) {
        if (!value) return "";
        return `
            <div class="campus-info-card">
                <span class="campus-info-icon">${icon}</span>
                <div><div class="campus-info-label">${label}</div><div class="campus-info-value">${value}</div></div>
            </div>
        `;
    }

    _bindDetailEvents(main, detail, idx) {
        detail.querySelector(".campus-detail-edit-btn")?.addEventListener("click", () => this._editRoute(main, idx));
    }

    /* ─── Edit Route Modal ─── */
    _editRoute(main, idx) {
        const bus = idx !== null ? { ...this.buses[idx] } : { routeNo:"", name:"", busNo:"", from:"", to:"", pickupTime:"", dropTime:"", driverPhone:"", color:"#6c5ce7", notes:"", stops:[] };
        const colors = ["#6c5ce7","#00b894","#0984e3","#e17055","#fdcb6e","#fd79a8","#00cec9","#a29bfe"];
        const isNew = idx === null;

        this._openModal(main, `
            <div class="campus-modal-header"><span>🚌</span><h3>${isNew ? "Add Route" : "Edit Route"}</h3></div>
            <div class="campus-modal-scroll">
                <div class="campus-form-grid">
                    <div class="campus-modal-field">
                        <label>Route Number *</label>
                        <input class="campus-modal-input" name="routeNo" type="text" value="${bus.routeNo}" placeholder="e.g. 12C">
                    </div>
                    <div class="campus-modal-field">
                        <label>Name / Nickname</label>
                        <input class="campus-modal-input" name="name" type="text" value="${bus.name}" placeholder="e.g. Home Bus">
                    </div>
                    <div class="campus-modal-field">
                        <label>Bus Number</label>
                        <input class="campus-modal-input" name="busNo" type="text" value="${bus.busNo}" placeholder="e.g. TN10 AB1234">
                    </div>
                    <div class="campus-modal-field">
                        <label>From</label>
                        <input class="campus-modal-input" name="from" type="text" value="${bus.from}" placeholder="e.g. Katpadi">
                    </div>
                    <div class="campus-modal-field">
                        <label>To</label>
                        <input class="campus-modal-input" name="to" type="text" value="${bus.to}" placeholder="e.g. VIT Campus">
                    </div>
                    <div class="campus-modal-field">
                        <label>Pickup Time</label>
                        <input class="campus-modal-input" name="pickupTime" type="text" value="${bus.pickupTime}" placeholder="e.g. 08:15 AM">
                    </div>
                    <div class="campus-modal-field">
                        <label>Drop Time</label>
                        <input class="campus-modal-input" name="dropTime" type="text" value="${bus.dropTime}" placeholder="e.g. 05:30 PM">
                    </div>
                    <div class="campus-modal-field">
                        <label>Driver Contact</label>
                        <input class="campus-modal-input" name="driverPhone" type="tel" value="${bus.driverPhone}" placeholder="Driver phone number">
                    </div>
                </div>
                <div class="campus-modal-field">
                    <label>Route Color</label>
                    <div class="campus-color-picks">
                        ${colors.map(c => `<button type="button" class="campus-color-pick ${(bus.color||"#6c5ce7")===c?"active":""}" data-color="${c}" style="background:${c}"></button>`).join("")}
                    </div>
                </div>
                <div class="campus-modal-field">
                    <label>Stops (Name · Time)</label>
                    <div class="campus-stops-edit" id="stopsEditList">
                        ${(bus.stops||[]).map((s,i) => `
                            <div class="campus-stop-edit-row">
                                <input class="campus-modal-input" name="stop-name-${i}" type="text" value="${s.name}" placeholder="Stop name">
                                <input class="campus-modal-input campus-stop-time-inp" name="stop-time-${i}" type="text" value="${s.time||""}" placeholder="Time (opt.)">
                                <button class="campus-stop-del" data-idx="${i}" type="button">✕</button>
                            </div>
                        `).join("")}
                    </div>
                    <button class="campus-btn campus-btn-ghost" id="addStopBtn" type="button" style="margin-top:6px;width:100%">＋ Add Stop</button>
                </div>
                <div class="campus-modal-field">
                    <label>Notes</label>
                    <textarea class="campus-modal-textarea" name="notes" rows="2" placeholder="Any notes about the bus…">${bus.notes||""}</textarea>
                </div>
            </div>
            <div class="campus-modal-actions">
                <button class="campus-btn campus-btn-ghost" data-action="cancel">Cancel</button>
                <button class="campus-btn campus-btn-primary" data-action="save-route" data-idx="${idx}">💾 Save Route</button>
            </div>
        `, (action, form) => {
            if (action === "save-route") {
                const rows = form.querySelectorAll(".campus-stop-edit-row");
                const stops = [];
                rows.forEach(row => {
                    const nameInp = row.querySelector("[name^='stop-name-']");
                    const timeInp = row.querySelector("[name^='stop-time-']");
                    const n = nameInp?.value.trim();
                    if (n) stops.push({ name: n, time: timeInp?.value.trim() || "" });
                });
                const saved = {
                    routeNo: form.querySelector("[name='routeNo']").value.trim(),
                    name: form.querySelector("[name='name']").value.trim(),
                    busNo: form.querySelector("[name='busNo']").value.trim(),
                    from: form.querySelector("[name='from']").value.trim(),
                    to: form.querySelector("[name='to']").value.trim(),
                    pickupTime: form.querySelector("[name='pickupTime']").value.trim(),
                    dropTime: form.querySelector("[name='dropTime']").value.trim(),
                    driverPhone: form.querySelector("[name='driverPhone']").value.trim(),
                    color: form.querySelector(".campus-color-pick.active")?.dataset.color || "#6c5ce7",
                    notes: form.querySelector("[name='notes']").value.trim(),
                    stops
                };
                if (!saved.routeNo) { form.querySelector("[name='routeNo']").style.borderColor="#ff7675"; return; }
                if (idx === null) { this.buses.push(saved); this.activeBus = this.buses.length - 1; }
                else { this.buses[idx] = saved; this.activeBus = idx; }
                this._saveBuses();
                this._closeModal(main);
                this._renderMain();
            }
        }, (modal) => {
            // Color picker
            modal.querySelectorAll(".campus-color-pick").forEach(btn => {
                btn.addEventListener("click", () => {
                    modal.querySelectorAll(".campus-color-pick").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                });
            });
            // Add stop
            const addStop = () => {
                const list = modal.querySelector("#stopsEditList");
                const idx2 = list.querySelectorAll(".campus-stop-edit-row").length;
                const row = document.createElement("div");
                row.className = "campus-stop-edit-row";
                row.innerHTML = `
                    <input class="campus-modal-input" name="stop-name-${idx2}" type="text" placeholder="Stop name">
                    <input class="campus-modal-input campus-stop-time-inp" name="stop-time-${idx2}" type="text" placeholder="Time (opt.)">
                    <button class="campus-stop-del" type="button">✕</button>
                `;
                list.appendChild(row);
                row.querySelector(".campus-stop-del").addEventListener("click", () => row.remove());
                row.querySelector("input").focus();
            };
            modal.querySelector("#addStopBtn")?.addEventListener("click", addStop);
            modal.querySelectorAll(".campus-stop-del").forEach(b => b.addEventListener("click", () => b.closest(".campus-stop-edit-row").remove()));
        });
    }

    /* ─── Modal System ─── */
    _openModal(main, html, onAction, onMount) {
        let overlay = this.container.querySelector(".campus-modal-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "campus-modal-overlay";
            this.container.querySelector(".campus-layout").appendChild(overlay);
        }
        overlay.innerHTML = `<div class="campus-modal" id="campusModal"><form id="campusModalForm">${html}</form></div>`;
        overlay.style.display = "flex";
        overlay.addEventListener("click", e => { if (e.target === overlay) this._closeModal(main); }, { once: true });

        const form = overlay.querySelector("#campusModalForm");
        overlay.querySelectorAll("[data-action]").forEach(btn => {
            btn.addEventListener("click", e => {
                e.preventDefault();
                const action = btn.dataset.action;
                if (action === "cancel") { this._closeModal(main); return; }
                onAction(action, form);
            });
        });
        form.addEventListener("submit", e => { e.preventDefault(); onAction("save", form); });
        if (onMount) onMount(overlay.querySelector("#campusModal"));
    }
    _closeModal(main) {
        const overlay = this.container.querySelector(".campus-modal-overlay");
        if (overlay) { overlay.style.display = "none"; overlay.innerHTML = ""; }
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='campus']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new CampusApp());
    }
});
