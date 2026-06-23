class MessengerApp extends BaseApp {
    constructor() {
        super("Messenger");
        this.ME_KEY    = "webos_msg_me";
        this.CHATS_KEY = "webos_msg_chats";
        this.me        = this._loadMe();
        this.chats     = this._loadChats();
        this.activeChatId = null;
        this.container  = null;
        this.channel    = null; // BroadcastChannel
        this._pollTimer = null;
        this._prevChatsJSON = "";
    }

    /* ── Persistence ── */
    _loadMe()    { try { return JSON.parse(localStorage.getItem(this.ME_KEY)) || null; } catch { return null; } }
    _loadChats() { try { return JSON.parse(localStorage.getItem(this.CHATS_KEY)) || {}; } catch { return {}; } }
    _saveMe()    { localStorage.setItem(this.ME_KEY, JSON.stringify(this.me)); }
    _saveChats() { localStorage.setItem(this.CHATS_KEY, JSON.stringify(this.chats)); }

    /* ── Chat ID ── */
    _chatId(a, b) { return [a, b].sort().join("__").toLowerCase(); }

    /* ── Helpers ── */
    _initials(name) { return (name||"?").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
    _avatarColor(email) {
        const palette = ["#6c5ce7","#00b894","#0984e3","#e17055","#fdcb6e","#fd79a8","#00cec9","#a29bfe"];
        let h = 0; for (const c of (email||"")) h = (h * 31 + c.charCodeAt(0)) % palette.length;
        return palette[h];
    }
    _fmtTime(iso) {
        if (!iso) return "";
        const d = new Date(iso), now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        if (sameDay) return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
        const diff = Math.floor((now - d) / 86400000);
        if (diff < 7) return d.toLocaleDateString("en-IN", { weekday:"short" });
        return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
    }
    _unreadCount(chat) {
        return (chat.messages||[]).filter(m => m.to === this.me?.email && !m.read).length;
    }
    _totalUnread() {
        return Object.values(this.chats).reduce((n, c) => n + this._unreadCount(c), 0);
    }
    _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
    _escape(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    _peerEmail(chat) { return (chat.participants||[]).find(e => e !== this.me?.email) || ""; }
    _peerName(chat) { return chat.peerName || this._peerEmail(chat); }

    /* ── BroadcastChannel ── */
    _startChannel() {
        if (typeof BroadcastChannel === "undefined") { this._startPoll(); return; }
        try {
            this.channel = new BroadcastChannel("webos_messenger");
            this.channel.onmessage = e => this._onChannelMessage(e.data);
        } catch { this._startPoll(); }
    }
    _stopChannel() {
        if (this.channel) { this.channel.close(); this.channel = null; }
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    }
    _broadcast(data) {
        if (this.channel) { try { this.channel.postMessage(data); } catch {} }
    }
    // Polling fallback for same-tab or browsers without BroadcastChannel
    _startPoll() {
        this._prevChatsJSON = localStorage.getItem(this.CHATS_KEY) || "{}";
        this._pollTimer = setInterval(() => {
            const cur = localStorage.getItem(this.CHATS_KEY) || "{}";
            if (cur !== this._prevChatsJSON) {
                this._prevChatsJSON = cur;
                this._onExternalUpdate();
            }
        }, 1000);
    }
    _onChannelMessage(data) {
        if (!data || !this.me) return;
        if (data.type === "NEW_MESSAGE" && data.to === this.me.email) {
            this.chats = this._loadChats();
            this._refreshAll();
        }
        if (data.type === "READ_RECEIPT" && data.from !== this.me.email) {
            this.chats = this._loadChats();
            this._refreshAll();
        }
    }
    _onExternalUpdate() {
        this.chats = this._loadChats();
        this._refreshAll();
    }

    /* ── Render Entry ── */
    render(container) {
        this.container = container;
        container.classList.add("msg-container");
        this._startChannel();
        if (!this.me) { this._renderSetup(); }
        else { this._renderShell(); }
    }

    /* ── Setup Screen ── */
    _renderSetup() {
        this.container.innerHTML = `
            <div class="msg-setup-screen">
                <div class="msg-setup-card">
                    <div class="msg-setup-icon">💬</div>
                    <h2>Welcome to Messenger</h2>
                    <p>Set your identity to start chatting with friends on this WebOS.</p>
                    <div class="msg-setup-fields">
                        <div class="msg-field">
                            <label>Your Email Address *</label>
                            <input class="msg-input" id="setupEmail" type="email" placeholder="you@example.com" autocomplete="off">
                        </div>
                        <div class="msg-field">
                            <label>Display Name *</label>
                            <input class="msg-input" id="setupName" type="text" placeholder="Your name">
                        </div>
                        <div class="msg-field">
                            <label>Choose Avatar Color</label>
                            <div class="msg-color-row" id="setupColors">
                                ${["#6c5ce7","#00b894","#0984e3","#e17055","#fdcb6e","#fd79a8","#00cec9","#a29bfe"].map((c,i) =>
                                    `<button class="msg-color-dot ${i===0?"active":""}" data-color="${c}" style="background:${c}"></button>`
                                ).join("")}
                            </div>
                        </div>
                    </div>
                    <button class="msg-btn msg-btn-primary" id="setupSaveBtn">Start Messaging →</button>
                </div>
            </div>
        `;

        let chosenColor = "#6c5ce7";
        this.container.querySelectorAll(".msg-color-dot").forEach(btn => {
            btn.addEventListener("click", () => {
                this.container.querySelectorAll(".msg-color-dot").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                chosenColor = btn.dataset.color;
            });
        });

        this.container.querySelector("#setupSaveBtn").addEventListener("click", () => {
            const email = this.container.querySelector("#setupEmail").value.trim().toLowerCase();
            const name  = this.container.querySelector("#setupName").value.trim();
            if (!email || !name) {
                if (!email) this.container.querySelector("#setupEmail").style.borderColor = "#ff7675";
                if (!name)  this.container.querySelector("#setupName").style.borderColor = "#ff7675";
                return;
            }
            this.me = { email, name, color: chosenColor };
            this._saveMe();
            this._renderShell();
        });
    }

    /* ── Main Shell ── */
    _renderShell() {
        this.container.innerHTML = `
            <div class="msg-shell">
                <!-- Sidebar -->
                <aside class="msg-sidebar">
                    <div class="msg-sidebar-top">
                        <div class="msg-my-avatar" style="background:${this.me.color}" title="${this._escape(this.me.email)}">
                            ${this._initials(this.me.name)}
                        </div>
                        <div class="msg-my-info">
                            <div class="msg-my-name">${this._escape(this.me.name)}</div>
                            <div class="msg-my-email">${this._escape(this.me.email)}</div>
                        </div>
                        <button class="msg-icon-btn" id="msgSettingsBtn" title="Edit profile">⚙️</button>
                    </div>

                    <!-- Search + New Chat -->
                    <div class="msg-sidebar-actions">
                        <div class="msg-search-wrap">
                            <span class="msg-search-icon">🔍</span>
                            <input class="msg-search" id="msgSearch" type="text" placeholder="Search conversations…">
                        </div>
                        <button class="msg-new-btn" id="msgNewChatBtn" title="New chat">✏️</button>
                    </div>

                    <!-- Conversation List -->
                    <div class="msg-conv-list" id="msgConvList"></div>
                </aside>

                <!-- Main area -->
                <main class="msg-main" id="msgMain">
                    <div class="msg-empty-state">
                        <div class="msg-empty-icon">💬</div>
                        <h3>Your Messages</h3>
                        <p>Select a conversation or start a new chat<br>by clicking the ✏️ button.</p>
                        <button class="msg-btn msg-btn-primary" id="msgEmptyNewBtn">✏️ New Chat</button>
                    </div>
                </main>
            </div>
        `;

        this._renderConvList();

        this.container.querySelector("#msgNewChatBtn").addEventListener("click", () => this._openNewChatModal());
        this.container.querySelector("#msgEmptyNewBtn")?.addEventListener("click", () => this._openNewChatModal());
        this.container.querySelector("#msgSettingsBtn").addEventListener("click", () => this._openSettingsModal());

        // Search
        this.container.querySelector("#msgSearch").addEventListener("input", e => {
            this._renderConvList(e.target.value.trim().toLowerCase());
        });

        // Re-open active chat if any
        if (this.activeChatId && this.chats[this.activeChatId]) {
            this._openChat(this.activeChatId);
        }
    }

    /* ── Conversation List ── */
    _renderConvList(filter = "") {
        const list = this.container.querySelector("#msgConvList");
        if (!list) return;
        const convs = Object.entries(this.chats)
            .filter(([, c]) => c.participants.includes(this.me.email))
            .map(([id, c]) => ({ id, c, last: c.messages?.at(-1)?.timestamp || "" }))
            .sort((a, b) => b.last.localeCompare(a.last));

        const filtered = filter
            ? convs.filter(({ c }) => this._peerEmail(c).includes(filter) || this._peerName(c).toLowerCase().includes(filter))
            : convs;

        if (!filtered.length) {
            list.innerHTML = `<div class="msg-conv-empty">${filter ? "No results" : "No conversations yet"}</div>`;
            return;
        }
        list.innerHTML = filtered.map(({ id, c }) => {
            const peer = this._peerEmail(c);
            const name = this._peerName(c);
            const lastMsg = c.messages?.at(-1);
            const unread = this._unreadCount(c);
            const isActive = id === this.activeChatId;
            const color = this._avatarColor(peer);
            return `
                <div class="msg-conv-item ${isActive ? "active" : ""}" data-chatid="${id}">
                    <div class="msg-conv-avatar" style="background:${color}">${this._initials(name)}</div>
                    <div class="msg-conv-body">
                        <div class="msg-conv-top">
                            <span class="msg-conv-name">${this._escape(name)}</span>
                            ${lastMsg ? `<span class="msg-conv-time">${this._fmtTime(lastMsg.timestamp)}</span>` : ""}
                        </div>
                        <div class="msg-conv-preview">
                            ${lastMsg ? `<span class="${lastMsg.from===this.me.email?"msg-mine-preview":""}">${lastMsg.from===this.me.email?"You: ":""}${this._escape(lastMsg.text||"").slice(0,50)}</span>` : "<span>Say hello!</span>"}
                            ${unread > 0 ? `<span class="msg-unread-badge">${unread}</span>` : ""}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        list.querySelectorAll(".msg-conv-item").forEach(item => {
            item.addEventListener("click", () => this._openChat(item.dataset.chatid));
        });
    }

    /* ── Chat Window ── */
    _openChat(chatId) {
        this.activeChatId = chatId;
        const chat = this.chats[chatId];
        if (!chat) return;

        // Mark all messages from peer as read
        let changed = false;
        (chat.messages || []).forEach(m => {
            if (m.to === this.me.email && !m.read) { m.read = true; changed = true; }
        });
        if (changed) {
            this._saveChats();
            this._broadcast({ type: "READ_RECEIPT", chatId, from: this.me.email });
        }

        const peer = this._peerEmail(chat);
        const peerName = this._peerName(chat);
        const peerColor = this._avatarColor(peer);
        const main = this.container.querySelector("#msgMain");

        main.innerHTML = `
            <div class="msg-chat">
                <!-- Chat header -->
                <div class="msg-chat-header">
                    <div class="msg-chat-avatar" style="background:${peerColor}">${this._initials(peerName)}</div>
                    <div class="msg-chat-peer-info">
                        <div class="msg-chat-peer-name">${this._escape(peerName)}</div>
                        <div class="msg-chat-peer-email">${this._escape(peer)}</div>
                    </div>
                    <div class="msg-chat-header-actions">
                        <button class="msg-icon-btn" id="msgDeleteChatBtn" title="Delete conversation">🗑</button>
                    </div>
                </div>

                <!-- Messages area -->
                <div class="msg-messages" id="msgMessages"></div>

                <!-- Input bar -->
                <div class="msg-input-bar">
                    <textarea class="msg-text-input" id="msgTextInput"
                              placeholder="Message ${this._escape(peerName)}…" rows="1"></textarea>
                    <button class="msg-send-btn" id="msgSendBtn" title="Send (Enter)">
                        <span>➤</span>
                    </button>
                </div>
                <div class="msg-input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</div>
            </div>
        `;

        this._renderConvList();
        this._renderMessages();

        // Send
        const sendBtn = main.querySelector("#msgSendBtn");
        const textInp = main.querySelector("#msgTextInput");

        const send = () => {
            const text = textInp.value.trim();
            if (!text) return;
            this._sendMessage(chatId, text);
            textInp.value = "";
            textInp.style.height = "auto";
        };

        sendBtn.addEventListener("click", send);
        textInp.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
        });
        textInp.addEventListener("input", () => {
            textInp.style.height = "auto";
            textInp.style.height = Math.min(textInp.scrollHeight, 120) + "px";
        });
        textInp.focus();

        // Delete conversation
        main.querySelector("#msgDeleteChatBtn").addEventListener("click", () => {
            if (confirm(`Delete conversation with ${peerName}? This cannot be undone.`)) {
                delete this.chats[chatId];
                this._saveChats();
                this.activeChatId = null;
                this._renderConvList();
                main.innerHTML = `
                    <div class="msg-empty-state">
                        <div class="msg-empty-icon">💬</div>
                        <h3>Conversation Deleted</h3>
                        <p>Start a new chat anytime.</p>
                        <button class="msg-btn msg-btn-primary" id="msgEmptyNewBtn2">✏️ New Chat</button>
                    </div>
                `;
                main.querySelector("#msgEmptyNewBtn2").addEventListener("click", () => this._openNewChatModal());
            }
        });
    }

    _renderMessages() {
        const area = this.container.querySelector("#msgMessages");
        if (!area) return;
        const chat = this.chats[this.activeChatId];
        if (!chat) return;
        const msgs = chat.messages || [];

        if (!msgs.length) {
            area.innerHTML = `<div class="msg-no-msgs">No messages yet. Say hello! 👋</div>`;
            return;
        }

        let lastDate = "";
        area.innerHTML = msgs.map(m => {
            const isMe = m.from === this.me.email;
            const d = new Date(m.timestamp);
            const dateStr = d.toLocaleDateString("en-IN", { weekday:"long", day:"2-digit", month:"long" });
            const dateDivider = dateStr !== lastDate ? `<div class="msg-date-divider"><span>${dateStr}</span></div>` : "";
            lastDate = dateStr;
            const timeStr = d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
            const readTick = isMe ? (m.read ? "✓✓" : "✓") : "";
            return `${dateDivider}
                <div class="msg-bubble-wrap ${isMe ? "me" : "them"}">
                    <div class="msg-bubble ${isMe ? "msg-bubble-me" : "msg-bubble-them"}">
                        <div class="msg-bubble-text">${this._escape(m.text).replace(/\n/g,"<br>")}</div>
                        <div class="msg-bubble-meta">
                            <span class="msg-bubble-time">${timeStr}</span>
                            ${readTick ? `<span class="msg-read-tick ${m.read?"msg-read":""}">${readTick}</span>` : ""}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        area.scrollTop = area.scrollHeight;
    }

    _sendMessage(chatId, text) {
        const chat = this.chats[chatId];
        if (!chat) return;
        const peer = this._peerEmail(chat);
        const msg = { id: this._uid(), from: this.me.email, to: peer, text, timestamp: new Date().toISOString(), read: false };
        chat.messages = chat.messages || [];
        chat.messages.push(msg);
        this._saveChats();
        this._broadcast({ type: "NEW_MESSAGE", chatId, message: msg, to: peer });
        this._renderMessages();
        this._renderConvList();
    }

    /* ── Full Refresh (after external update) ── */
    _refreshAll() {
        this._renderConvList();
        if (this.activeChatId && this.chats[this.activeChatId]) {
            // Mark messages read if chat is open
            const chat = this.chats[this.activeChatId];
            let changed = false;
            (chat.messages || []).forEach(m => {
                if (m.to === this.me?.email && !m.read) { m.read = true; changed = true; }
            });
            if (changed) {
                this._saveChats();
                this._broadcast({ type: "READ_RECEIPT", chatId: this.activeChatId, from: this.me.email });
            }
            this._renderMessages();
        }
    }

    /* ── New Chat Modal ── */
    _openNewChatModal() {
        this._openModal(`
            <div class="msg-modal-header"><span>✏️</span><h3>New Chat</h3></div>
            <div class="msg-modal-field">
                <label>Recipient's Email</label>
                <input class="msg-input" id="newChatEmail" type="email" placeholder="friend@example.com" autocomplete="off">
                <div class="msg-modal-hint">They must also have this WebOS open to receive messages in real-time.</div>
            </div>
            <div class="msg-modal-field">
                <label>Their Name (optional)</label>
                <input class="msg-input" id="newChatName" type="text" placeholder="Friend's name">
            </div>
            <div class="msg-modal-actions">
                <button class="msg-btn msg-btn-ghost" id="msgModalCancel">Cancel</button>
                <button class="msg-btn msg-btn-primary" id="msgModalConfirm">Start Chat</button>
            </div>
        `);

        const emailInp = this.container.querySelector("#newChatEmail");
        const nameInp  = this.container.querySelector("#newChatName");
        emailInp.focus();

        this.container.querySelector("#msgModalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#msgModalConfirm").addEventListener("click", () => {
            const email = emailInp.value.trim().toLowerCase();
            const name  = nameInp.value.trim();
            if (!email) { emailInp.style.borderColor = "#ff7675"; return; }
            if (email === this.me.email) { emailInp.style.borderColor = "#ff7675"; alert("You can't chat with yourself!"); return; }
            const chatId = this._chatId(this.me.email, email);
            if (!this.chats[chatId]) {
                this.chats[chatId] = { participants: [this.me.email, email], peerName: name || email, messages: [] };
                this._saveChats();
            } else if (name) {
                this.chats[chatId].peerName = name;
                this._saveChats();
            }
            this._closeModal();
            this._renderConvList();
            this._openChat(chatId);
        });
        emailInp.addEventListener("keydown", e => { if (e.key === "Enter") nameInp.focus(); });
        nameInp.addEventListener("keydown", e => { if (e.key === "Enter") this.container.querySelector("#msgModalConfirm").click(); });
    }

    /* ── Settings Modal ── */
    _openSettingsModal() {
        this._openModal(`
            <div class="msg-modal-header"><span>⚙️</span><h3>My Profile</h3></div>
            <div class="msg-modal-field">
                <label>Email (cannot change)</label>
                <input class="msg-input" type="text" value="${this._escape(this.me.email)}" disabled style="opacity:0.5;cursor:not-allowed">
            </div>
            <div class="msg-modal-field">
                <label>Display Name</label>
                <input class="msg-input" id="settingName" type="text" value="${this._escape(this.me.name)}">
            </div>
            <div class="msg-modal-field">
                <label>Avatar Color</label>
                <div class="msg-color-row" id="settingColors">
                    ${["#6c5ce7","#00b894","#0984e3","#e17055","#fdcb6e","#fd79a8","#00cec9","#a29bfe"].map(c =>
                        `<button class="msg-color-dot ${this.me.color===c?"active":""}" data-color="${c}" style="background:${c}"></button>`
                    ).join("")}
                </div>
            </div>
            <div class="msg-modal-actions">
                <button class="msg-btn msg-btn-danger" id="msgLogout">Switch Account</button>
                <button class="msg-btn msg-btn-ghost" id="msgModalCancel">Cancel</button>
                <button class="msg-btn msg-btn-primary" id="msgModalConfirm">Save</button>
            </div>
        `);

        let chosenColor = this.me.color;
        this.container.querySelectorAll("#settingColors .msg-color-dot").forEach(btn => {
            btn.addEventListener("click", () => {
                this.container.querySelectorAll("#settingColors .msg-color-dot").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                chosenColor = btn.dataset.color;
            });
        });
        this.container.querySelector("#msgModalCancel").addEventListener("click", () => this._closeModal());
        this.container.querySelector("#msgModalConfirm").addEventListener("click", () => {
            const name = this.container.querySelector("#settingName").value.trim();
            if (!name) return;
            this.me = { ...this.me, name, color: chosenColor };
            this._saveMe();
            this._closeModal();
            this._renderShell();
        });
        this.container.querySelector("#msgLogout").addEventListener("click", () => {
            if (confirm("Switch to a different account? Your chats will remain in the browser.")) {
                this.me = null;
                localStorage.removeItem(this.ME_KEY);
                this._closeModal();
                this._renderSetup();
            }
        });
    }

    /* ── Modal System ── */
    _openModal(html) {
        let overlay = this.container.querySelector(".msg-modal-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "msg-modal-overlay";
            this.container.appendChild(overlay);
        }
        overlay.innerHTML = `<div class="msg-modal">${html}</div>`;
        overlay.style.display = "flex";
        overlay.addEventListener("click", e => { if (e.target === overlay) this._closeModal(); }, { once: true });
    }
    _closeModal() {
        const overlay = this.container.querySelector(".msg-modal-overlay");
        if (overlay) { overlay.style.display = "none"; overlay.innerHTML = ""; }
    }

    /* ── Cleanup on close ── */
    destroy() { this._stopChannel(); }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='messenger']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new MessengerApp());
    }
});
