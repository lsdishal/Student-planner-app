class BrowserApp extends BaseApp {
    constructor() {
        super("Browser");
        this.tabs = [
            { id: 1, title: "New Tab", url: "", favicon: "🌐", active: true }
        ];
        this.activeTabId = 1;
        this.nextTabId = 2;
        this.iframes = {}; // tabId → iframe element
    }

    // Quick-launch sites shown on new tab page
    get quickSites() {
        return [
            { name: "Google",  url: "https://www.google.com/webhp?igu=1", icon: "https://www.google.com/favicon.ico",  color: "#4285F4" },
            { name: "Yahoo",   url: "https://yahoo.com",                   icon: "https://www.yahoo.com/favicon.ico",  color: "#720E9E" },
            { name: "YouTube", url: "https://www.youtube.com",             icon: "https://www.youtube.com/favicon.ico",color: "#FF0000" },
            { name: "GitHub",  url: "https://github.com",                  icon: "https://github.com/favicon.ico",     color: "#24292E" },
            { name: "Wikipedia",url:"https://en.wikipedia.org",            icon: "https://en.wikipedia.org/favicon.ico",color:"#000" },
            { name: "Maps",    url: "https://maps.google.com",             icon: "https://maps.google.com/favicon.ico",color: "#34A853" },
        ];
    }

    render(container) {
        container.classList.add("browser-app");
        container.innerHTML = `
            <div class="browser-chrome" id="bChrome">
                <div class="br-tabs-row" id="brTabsRow"></div>
                <div class="br-toolbar">
                    <button class="br-nav-btn" id="brBack"    title="Back">&#8592;</button>
                    <button class="br-nav-btn" id="brForward" title="Forward">&#8594;</button>
                    <button class="br-nav-btn" id="brReload"  title="Reload">&#8635;</button>
                    <button class="br-nav-btn" id="brHome"    title="Home">⌂</button>
                    <div class="br-address-bar">
                        <span class="br-lock" id="brLock">🔒</span>
                        <input type="text" id="brUrl" placeholder="Search or enter URL..." autocomplete="off" spellcheck="false">
                        <button class="br-go-btn" id="brGo">Go</button>
                    </div>
                </div>
            </div>
            <div class="br-viewport" id="brViewport">
                <!-- iframes + new-tab pages rendered here -->
            </div>
            <div class="br-blocked-msg" id="brBlocked" style="display:none;">
                <div class="br-blocked-inner">
                    <div class="br-blocked-icon">🚫</div>
                    <h2>This site can't be opened here</h2>
                    <p id="brBlockedUrl"></p>
                    <p class="br-blocked-sub">This website blocks embedding. You can open it in a new tab instead.</p>
                    <button class="br-open-tab-btn" id="brOpenExternal">Open in New Window</button>
                </div>
            </div>
        `;

        this._renderTabs();
        this._renderNewTabPage(this.activeTabId);
        this._bindEvents(container);
    }

    /* ─── TAB RENDERING ─── */

    _renderTabs() {
        const row = document.getElementById("brTabsRow");
        if (!row) return;
        row.innerHTML = "";

        this.tabs.forEach(tab => {
            const el = document.createElement("div");
            el.className = "br-tab" + (tab.id === this.activeTabId ? " active" : "");
            el.dataset.tabId = tab.id;
            el.innerHTML = `
                <img class="br-tab-favicon" src="${tab.favicon && tab.favicon.startsWith('http') ? tab.favicon : ''}" 
                     onerror="this.style.display='none'" style="${tab.favicon && tab.favicon.startsWith('http') ? '' : 'display:none'}">
                <span class="br-tab-emoji-fav" style="${tab.favicon && tab.favicon.startsWith('http') ? 'display:none' : ''}">${tab.favicon && !tab.favicon.startsWith('http') ? tab.favicon : '🌐'}</span>
                <span class="br-tab-title">${this._truncate(tab.title, 18)}</span>
                <span class="br-tab-close" data-close-tab="${tab.id}">×</span>
            `;
            row.appendChild(el);
        });

        // New tab button
        const newBtn = document.createElement("div");
        newBtn.className = "br-new-tab-btn";
        newBtn.title = "New Tab";
        newBtn.textContent = "+";
        newBtn.id = "brNewTab";
        row.appendChild(newBtn);
    }

    /* ─── NEW TAB PAGE ─── */

    _renderNewTabPage(tabId) {
        const viewport = document.getElementById("brViewport");
        if (!viewport) return;

        // Hide all existing panes
        viewport.querySelectorAll(".br-pane").forEach(p => p.style.display = "none");

        let pane = viewport.querySelector(`.br-pane[data-tab="${tabId}"]`);
        if (!pane) {
            pane = document.createElement("div");
            pane.className = "br-pane br-newtab";
            pane.dataset.tab = tabId;
            pane.innerHTML = `
                <div class="br-nt-content">
                    <div class="br-nt-logo">🌐 WebOS Browser</div>
                    <div class="br-nt-search">
                        <input type="text" placeholder="Search Google or enter a URL…" id="brNtSearch_${tabId}" autocomplete="off">
                        <button id="brNtGo_${tabId}">Search</button>
                    </div>
                    <div class="br-nt-shortcuts">
                        ${this.quickSites.map(s => `
                            <div class="br-shortcut" data-url="${s.url}">
                                <div class="br-shortcut-icon" style="background:${s.color}20; border:2px solid ${s.color}40">
                                    <img src="${s.icon}" onerror="this.parentNode.innerHTML='🌐'" width="28" height="28">
                                </div>
                                <span>${s.name}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
            viewport.appendChild(pane);

            // New-tab search
            const ntSearch = pane.querySelector(`#brNtSearch_${tabId}`);
            const ntGo = pane.querySelector(`#brNtGo_${tabId}`);
            const doNtSearch = () => {
                const q = ntSearch.value.trim();
                if (q) this._navigate(this._toUrl(q), tabId);
            };
            ntSearch.addEventListener("keydown", e => { if (e.key === "Enter") doNtSearch(); });
            ntGo.addEventListener("click", doNtSearch);

            // Shortcut clicks
            pane.querySelectorAll(".br-shortcut").forEach(el => {
                el.addEventListener("click", () => this._navigate(el.dataset.url, tabId));
            });
        }

        pane.style.display = "flex";
        this._syncToolbar();
    }

    /* ─── NAVIGATE (load iframe) ─── */

    _navigate(url, tabId) {
        tabId = tabId || this.activeTabId;
        const viewport = document.getElementById("brViewport");
        const blocked = document.getElementById("brBlocked");
        if (!viewport) return;

        // Hide all panes
        viewport.querySelectorAll(".br-pane").forEach(p => p.style.display = "none");
        if (blocked) blocked.style.display = "none";

        // Update tab record
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.url = url;
            tab.title = this._titleFromUrl(url);
        }

        // Get or create iframe pane
        let pane = viewport.querySelector(`.br-iframe-pane[data-tab="${tabId}"]`);
        if (!pane) {
            pane = document.createElement("div");
            pane.className = "br-pane br-iframe-pane";
            pane.dataset.tab = tabId;
            pane.style.display = "none";
            viewport.appendChild(pane);
        }

        // Create fresh iframe
        pane.innerHTML = `<div class="br-loading-bar" id="brLoader_${tabId}"></div>
                          <iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                                  allow="autoplay; clipboard-read; clipboard-write"
                                  referrerpolicy="no-referrer"
                                  src="${url}"
                                  id="brIframe_${tabId}"
                                  class="br-iframe"></iframe>`;

        pane.style.display = "flex";
        this.iframes[tabId] = pane.querySelector("iframe");

        // Favicon & title update on load
        const iframe = this.iframes[tabId];
        const loader = pane.querySelector(`#brLoader_${tabId}`);

        // Animate loader
        if (loader) {
            loader.style.width = "40%";
            setTimeout(() => { if (loader) loader.style.width = "80%"; }, 400);
        }

        iframe.addEventListener("load", () => {
            if (loader) { loader.style.width = "100%"; setTimeout(() => loader.remove(), 300); }
            // Try to get title (only works for same-origin)
            try {
                const t = iframe.contentDocument?.title;
                if (t && tab) { tab.title = t; this._renderTabs(); }
            } catch (_) {}
        });

        iframe.addEventListener("error", () => {
            if (loader) loader.remove();
            this._showBlocked(url, tabId);
        });

        // Update address bar & tabs
        this._syncToolbar();
        this._renderTabs();
    }

    _showBlocked(url, tabId) {
        const viewport = document.getElementById("brViewport");
        const blocked = document.getElementById("brBlocked");
        viewport.querySelectorAll(".br-pane").forEach(p => p.style.display = "none");
        if (blocked) {
            document.getElementById("brBlockedUrl").textContent = url;
            document.getElementById("brOpenExternal").onclick = () => window.open(url, "_blank");
            blocked.style.display = "flex";
        }
    }

    /* ─── TOOLBAR SYNC ─── */

    _syncToolbar() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        const urlInput = document.getElementById("brUrl");
        const lock = document.getElementById("brLock");
        if (urlInput && tab) {
            urlInput.value = tab.url || "";
        }
        if (lock && tab) {
            lock.textContent = tab.url?.startsWith("https") ? "🔒" : (tab.url ? "🔓" : "🌐");
        }
    }

    /* ─── EVENT BINDING ─── */

    _bindEvents(container) {
        // Address bar navigation
        const urlInput = document.getElementById("brUrl");
        const goBtn = document.getElementById("brGo");
        const doNav = () => {
            const val = urlInput?.value.trim();
            if (val) this._navigate(this._toUrl(val));
        };
        urlInput?.addEventListener("keydown", e => { if (e.key === "Enter") doNav(); });
        urlInput?.addEventListener("focus", () => urlInput.select());
        goBtn?.addEventListener("click", doNav);

        // Back
        document.getElementById("brBack")?.addEventListener("click", () => {
            try { this.iframes[this.activeTabId]?.contentWindow.history.back(); } catch (_) {}
        });
        // Forward
        document.getElementById("brForward")?.addEventListener("click", () => {
            try { this.iframes[this.activeTabId]?.contentWindow.history.forward(); } catch (_) {}
        });
        // Reload
        document.getElementById("brReload")?.addEventListener("click", () => {
            const iframe = this.iframes[this.activeTabId];
            if (iframe) {
                try { iframe.contentWindow.location.reload(); } catch (_) {
                    const src = iframe.src; iframe.src = ""; iframe.src = src;
                }
            }
        });
        // Home
        document.getElementById("brHome")?.addEventListener("click", () => {
            const tab = this.tabs.find(t => t.id === this.activeTabId);
            if (tab) { tab.url = ""; tab.title = "New Tab"; }
            this._renderNewTabPage(this.activeTabId);
            this._renderTabs();
        });

        // Tab clicks (event delegation on the tab row)
        const tabsRow = document.getElementById("brTabsRow");
        tabsRow?.addEventListener("click", e => {
            // Close button
            const closeBtn = e.target.closest("[data-close-tab]");
            if (closeBtn) {
                e.stopPropagation();
                this._closeTab(parseInt(closeBtn.dataset.closeTab));
                return;
            }
            // Tab switch
            const tabEl = e.target.closest(".br-tab");
            if (tabEl) {
                this._switchTab(parseInt(tabEl.dataset.tabId));
            }
            // New tab
            if (e.target.id === "brNewTab" || e.target.closest("#brNewTab")) {
                this._openNewTab();
            }
        });
    }

    /* ─── TAB MANAGEMENT ─── */

    _openNewTab(url = "") {
        const tab = { id: this.nextTabId++, title: "New Tab", url: "", favicon: "🌐", active: false };
        this.tabs.push(tab);
        this._switchTab(tab.id);
        if (url) this._navigate(url, tab.id);
    }

    _switchTab(tabId) {
        this.tabs.forEach(t => t.active = (t.id === tabId));
        this.activeTabId = tabId;
        const tab = this.tabs.find(t => t.id === tabId);

        // Show/hide panes
        const viewport = document.getElementById("brViewport");
        const blocked  = document.getElementById("brBlocked");
        if (viewport) viewport.querySelectorAll(".br-pane").forEach(p => p.style.display = "none");
        if (blocked)  blocked.style.display = "none";

        if (tab && tab.url) {
            // Re-show the iframe pane for this tab
            const pane = viewport?.querySelector(`.br-iframe-pane[data-tab="${tabId}"]`);
            if (pane) pane.style.display = "flex";
            else this._navigate(tab.url, tabId);
        } else {
            this._renderNewTabPage(tabId);
        }

        this._renderTabs();
        this._syncToolbar();
    }

    _closeTab(tabId) {
        if (this.tabs.length === 1) { this._openNewTab(); }
        const idx = this.tabs.findIndex(t => t.id === tabId);
        this.tabs.splice(idx, 1);
        // Remove iframe pane from DOM
        document.querySelector(`.br-pane[data-tab="${tabId}"]`)?.remove();
        delete this.iframes[tabId];
        // Switch to nearest tab
        const next = this.tabs[Math.min(idx, this.tabs.length - 1)];
        if (next) this._switchTab(next.id);
    }

    /* ─── UTILS ─── */

    _toUrl(input) {
        if (/^https?:\/\//i.test(input)) return input;
        if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(input) && !input.includes(" ")) return "https://" + input;
        return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }

    _titleFromUrl(url) {
        try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
    }

    _truncate(str, n) {
        return str.length > n ? str.slice(0, n) + "…" : str;
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='browser']");
    if (launcher) {
        launcher.onclick = () => {
            WindowManager.createWindow(new BrowserApp());
        };
    }
});
