class BrowserApp extends BaseApp {
    constructor() {
        super("Browser");
        this.homepage = "https://www.google.com/search?igu=1"; // Use iframe compatible search or mock
    }

    render(container) {
        container.classList.add("browser-app");
        container.innerHTML = `
            <div class="browser-chrome">
                <div class="tabs">
                    <div class="tab active">
                        <span class="favicon">🎓</span>
                        <span class="title">College Portal</span>
                        <span class="close">×</span>
                    </div>
                     <div class="tab">
                        <span class="favicon">G</span>
                        <span class="title">Google</span>
                    </div>
                     <div class="new-tab">+</div>
                </div>
                <div class="toolbar">
                    <button class="nav-btn">←</button>
                    <button class="nav-btn">→</button>
                    <button class="nav-btn">↻</button>
                    <div class="address-bar">
                        <span class="lock">🔒</span>
                        <input type="text" value="portal.college.edu/dashboard">
                    </div>
                </div>
            </div>
            <div class="browser-viewport">
                <div class="mock-portal">
                    <h1>College Access</h1>
                    <div class="search-box" style="display:flex; justify-content:center; margin-bottom: 40px;">
                        <input type="text" placeholder="Search the web or enter URL" style="padding: 10px 20px; width: 60%; border-radius: 24px; border: 1px solid #dfe1e5; box-shadow: 0 1px 6px rgba(32,33,36,.28); font-size: 16px;">
                    </div>
                    <div class="portal-grid">
                        <div class="portal-card" onclick="window.location.reload()"> <!-- Reload as mock nav -->
                            <div class="icon">📚</div>
                            <h3>Library</h3>
                        </div>
                        <div class="portal-card">
                            <div class="icon">📢</div>
                            <h3>Announcements</h3>
                        </div>
                        <div class="portal-card">
                            <div class="icon">📧</div>
                            <h3>Student Mail</h3>
                        </div>
                        <div class="portal-card">
                            <div class="icon">🏆</div>
                            <h3>Results</h3>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Mock interactivity
        const input = container.querySelector("input");
        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                // In a real implementation this would change the iframe src
                alert(`Navigating to ${input.value} (Mock)`);
            }
        }
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
