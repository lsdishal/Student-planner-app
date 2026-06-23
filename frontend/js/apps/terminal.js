class TerminalApp extends BaseApp {
    constructor() {
        super("Terminal");
    }

    render(container) {
        container.classList.add("terminal-container");
        const output = document.createElement("div");
        output.className = "terminal-output";
        output.innerHTML = "<div>WebOS Terminal v1.0</div>";

        const inputLine = document.createElement("div");
        inputLine.className = "terminal-input-line";
        inputLine.innerHTML = "<span>$</span>";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "terminal-input";

        inputLine.appendChild(input);

        input.onkeydown = e => {
            if (e.key === "Enter") {
                const cmd = input.value.trim();
                output.innerHTML += `<div>$ ${cmd}</div>`;
                this.processCommand(cmd, output);
                input.value = "";
                output.scrollTop = output.scrollHeight;
            }
        };

        // Auto-focus input when clicking container
        container.onclick = () => input.focus();

        container.append(output, inputLine);
        setTimeout(() => input.focus(), 10);
    }

    processCommand(cmd, output) {
        if (!cmd) return;
        const normalizedCmd = cmd.trim().toLowerCase();
        const args = cmd.split(" ");
        const command = args[0].toLowerCase();

        // Handle multi-word commands first
        if (normalizedCmd === "open notes") {
            if (typeof NotesApp !== 'undefined') {
                WindowManager.createWindow(new NotesApp());
                output.innerHTML += `<div>Launching Notes...</div>`;
            } else {
                output.innerHTML += `<div>Notes app not available.</div>`;
            }
            return;
        }

        if (normalizedCmd === "list assignments") {
            if (typeof VFS !== 'undefined') {
                const data = VFS.readFileSync("home/config/planner.json");
                let tasks = [];
                try { tasks = data ? JSON.parse(data) : []; } catch (e) { }

                const pending = tasks.filter(t => !t.completed);
                if (pending.length === 0) {
                    output.innerHTML += `<div>No pending assignments.</div>`;
                } else {
                    output.innerHTML += `<div>Assignments:</div>`;
                    pending.forEach(t => {
                        output.innerHTML += `<div> - [${t.priority}] ${t.text}</div>`;
                    });
                }
            } else {
                output.innerHTML += `<div>File system error.</div>`;
            }
            return;
        }

        switch (command) {
            case "help":
                output.innerHTML += `<div>
                    Available commands:<br>
                    - open notes<br>
                    - list assignments<br>
                    - date<br>
                    - clear<br>
                    - ls<br>
                    - echo [text]
                </div>`;
                break;
            case "date":
                output.innerHTML += `<div>${new Date().toString()}</div>`;
                break;
            case "clear":
                output.innerHTML = "";
                break;
            case "ls":
                // Rudimentary LS using VFS if global VFS is available
                if (typeof VFS !== 'undefined') {
                    output.innerHTML += `<div>${VFS.list('home').join('  ')}</div>`;
                } else {
                    output.innerHTML += `<div>home</div>`;
                }
                break;
            case "echo":
                output.innerHTML += `<div>${args.slice(1).join(" ")}</div>`;
                break;
            default:
                // Error Feedback System
                // "Friendly popups for mistakes"
                // "Syntax error in command"
                output.innerHTML += `<div style="color: #ff6b6b">Syntax error in command: '${command}'</div>`;
            // Maybe trigger a global error popup if requested?
            // User said "Friendly popups for mistakes".
            // I'll stick to terminal output for now but colored nicely.
        }
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='terminal']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new TerminalApp());
    }
});
