class NotesApp extends BaseApp {
    constructor(title = "Notes", content = "") {
        super(title);
        this.content = content;
    }

    render(container) {
        const textarea = document.createElement("textarea");
        textarea.className = "notes-area";
        textarea.placeholder = "Type your notes here...";
        textarea.style.width = "100%";
        textarea.style.height = "100%";
        textarea.value = this.content;
        container.appendChild(textarea);
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='notes']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new NotesApp());
    }
});
