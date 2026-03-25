class EmailApp extends BaseApp {
    constructor() {
        super("Student Mail");
        this.emails = [
            { id: 1, from: "Dean's Office", subject: "Welcome to Semester 5", time: "10:00 AM", unread: true, body: "Dear Student,\n\nWelcome back to campus! Please collect your ID card." },
            { id: 2, from: "Library", subject: "Overdue Book: Advanced Physics", time: "Yesterday", unread: true, body: "You have an overdue book. Please return it by Friday." },
            { id: 3, from: "Prof. Smith", subject: "Assignment Extension", time: "Mon", unread: false, body: "The deadline has been extended to Monday." },
            { id: 4, from: "Campus News", subject: "Hackathon Registration Open", time: "Sun", unread: false, body: "Register for the annual Hackathon now!" }
        ];
        this.currentEmail = null;
    }

    render(container) {
        container.innerHTML = `
            <div class="email-container">
                <div class="email-sidebar">
                    <button class="compose-btn">✏️ Compose</button>
                    <div class="email-nav">
                        <div class="nav-item active">Inbox <span class="badge">2</span></div>
                        <div class="nav-item">Sent</div>
                        <div class="nav-item">Drafts</div>
                        <div class="nav-item">Trash</div>
                    </div>
                </div>
                <div class="email-list"></div>
                <div class="email-view hidden">
                    <div class="email-view-header">
                        <button class="back-btn">← Back</button>
                        <div class="email-actions">
                            <button>↩️</button>
                            <button>🗑️</button>
                        </div>
                    </div>
                    <div class="email-content-view"></div>
                </div>
            </div>
        `;

        this.renderList(container);

        container.querySelector(".compose-btn").onclick = () => alert("Compose feature coming soon!");
        container.querySelector(".back-btn").onclick = () => {
            container.querySelector(".email-view").classList.add("hidden");
            container.querySelector(".email-list").classList.remove("hidden");
        };
    }

    renderList(container) {
        const listContainer = container.querySelector(".email-list");
        listContainer.innerHTML = "";

        this.emails.forEach(email => {
            const el = document.createElement("div");
            el.className = `email-item ${email.unread ? 'unread' : ''}`;
            el.innerHTML = `
                <div class="email-avatar">${email.from[0]}</div>
                <div class="email-info">
                    <div class="email-sender">${email.from}</div>
                    <div class="email-subject">${email.subject}</div>
                </div>
                <div class="email-time">${email.time}</div>
            `;
            el.onclick = () => this.openEmail(container, email);
            listContainer.appendChild(el);
        });
    }

    openEmail(container, email) {
        this.currentEmail = email;
        const view = container.querySelector(".email-view");
        const list = container.querySelector(".email-list");
        const content = container.querySelector(".email-content-view");

        email.unread = false; // Mark read
        this.renderList(container); // Re-render list to update unread status

        content.innerHTML = `
            <h2>${email.subject}</h2>
            <div class="email-meta">
                <strong>From:</strong> ${email.from} <br>
                <strong>Time:</strong> ${email.time}
            </div>
            <hr>
            <div class="email-body">${email.body}</div>
        `;

        list.classList.add("hidden");
        view.classList.remove("hidden");
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='email']");
    if (launcher) {
        launcher.onclick = () => {
            WindowManager.createWindow(new EmailApp());
        };
    }
});
