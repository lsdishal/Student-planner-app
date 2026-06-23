class TerminalApp extends BaseApp {
    constructor() {
        super("Terminal");
        // Virtual working directory (mirrors VFS paths)
        this.cwd = "C:\\Users\\Student";
        this.cwdVfsPath = "home";
        this.history = [];
        this.historyIndex = -1;
        this.env = {
            USERNAME: localStorage.getItem("regNumber") || "Student",
            COMPUTERNAME: "WEBOS-PC",
            OS: "WebOS [Version 1.0]",
            PROMPT: "$P$G",
            PATH: "C:\\Windows\\System32;C:\\Windows",
            TEMP: "C:\\Users\\Student\\AppData\\Local\\Temp",
            HOMEDRIVE: "C:",
            HOMEPATH: "\\Users\\Student"
        };
        // In-memory file system (per-session)
        this.vfsDirs  = new Set(["C:", "C:\\Windows", "C:\\Windows\\System32",
                                  "C:\\Users", "C:\\Users\\Student",
                                  "C:\\Users\\Student\\Documents",
                                  "C:\\Users\\Student\\Downloads",
                                  "C:\\Users\\Student\\Desktop"]);
        this.vfsFiles = {};          // path → content
        this.aliases  = { cls: "clear", dir: "ls", type: "cat", copy: "cp",
                          move: "mv",   del: "rm",  ren: "rename" };
        this.outputEl = null;
        this.inputEl  = null;
    }

    /* ══════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════ */
    render(container) {
        container.classList.add("terminal-container");
        container.style.cssText =
            "background:#0c0c0c;color:#cccccc;font-family:'Cascadia Code','Fira Code','Consolas',monospace;" +
            "font-size:13px;display:flex;flex-direction:column;height:100%;min-height:0;padding:0;";

        // Title bar strip
        const titleBar = document.createElement("div");
        titleBar.style.cssText =
            "background:#1a1a1a;padding:6px 14px;font-size:12px;color:#888;" +
            "border-bottom:1px solid #2a2a2a;user-select:none;flex-shrink:0;";
        titleBar.textContent = "Command Prompt — WebOS Terminal";

        // Output area
        this.outputEl = document.createElement("div");
        this.outputEl.style.cssText =
            "flex:1;min-height:0;overflow-y:auto;padding:10px 14px;";
        this.outputEl.id = "term-output-" + Date.now();

        // Input row
        const inputRow = document.createElement("div");
        inputRow.style.cssText =
            "display:flex;align-items:center;padding:4px 10px 8px;flex-shrink:0;";

        this.promptSpan = document.createElement("span");
        this.promptSpan.style.cssText = "color:#f0e68c;white-space:nowrap;margin-right:4px;";
        this.promptSpan.textContent = this.cwd + ">";

        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.autocomplete = "off";
        this.inputEl.spellcheck = false;
        this.inputEl.style.cssText =
            "flex:1;background:transparent;border:none;outline:none;" +
            "color:#ffffff;font-family:inherit;font-size:13px;caret-color:#fff;";

        inputRow.append(this.promptSpan, this.inputEl);
        container.append(titleBar, this.outputEl, inputRow);

        // Boot banner
        this._print(
            `Microsoft Windows [Version 10.0.26100.0]\n` +
            `(c) WebOS Corporation. All rights reserved.\n`,
            "#cccccc"
        );
        this._print(`Type <span style="color:#f0e68c">help</span> for a list of commands.\n`);

        // Key handling
        this.inputEl.addEventListener("keydown", e => this._onKey(e));
        container.addEventListener("click", () => this.inputEl.focus());
        setTimeout(() => this.inputEl.focus(), 50);
    }

    /* ══════════════════════════════════════════
       KEY HANDLER
    ══════════════════════════════════════════ */
    _onKey(e) {
        if (e.key === "Enter") {
            const raw = this.inputEl.value;
            const cmd = raw.trim();
            this._printCmd(cmd);
            this.inputEl.value = "";
            if (cmd) {
                if (this.history[this.history.length - 1] !== cmd)
                    this.history.push(cmd);
                this.historyIndex = this.history.length;
            }
            this._run(cmd);
            this._scrollBottom();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.inputEl.value = this.history[this.historyIndex] || "";
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.inputEl.value = this.history[this.historyIndex] || "";
            } else {
                this.historyIndex = this.history.length;
                this.inputEl.value = "";
            }
        } else if (e.key === "Tab") {
            e.preventDefault();
            this._autocomplete();
        } else if (e.key === "l" && e.ctrlKey) {
            e.preventDefault();
            this.outputEl.innerHTML = "";
        }
    }

    /* ══════════════════════════════════════════
       COMMAND DISPATCHER
    ══════════════════════════════════════════ */
    _run(raw) {
        if (!raw) return;

        // Resolve alias
        const parts  = raw.trim().split(/\s+/);
        const name   = parts[0].toLowerCase();
        const alias  = this.aliases[name];
        const tokens = alias ? [alias, ...parts.slice(1)] : parts;
        const cmd    = tokens[0].toLowerCase();
        const args   = tokens.slice(1);
        const rest   = args.join(" ");

        switch (cmd) {
            /* ── Info ── */
            case "help":         return this._cmdHelp();
            case "ver":          return this._print(this.env.OS);
            case "date":         return this._print(new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" }));
            case "time":         return this._print(new Date().toLocaleTimeString());
            case "echo":         return this._print(rest || "");
            case "set":          return this._cmdSet(args);
            case "whoami":       return this._print(this.env.COMPUTERNAME + "\\" + this.env.USERNAME);
            case "hostname":     return this._print(this.env.COMPUTERNAME);
            case "systeminfo":   return this._cmdSysInfo();

            /* ── Navigation ── */
            case "cd":           return this._cmdCd(args);
            case "chdir":        return this._cmdCd(args);
            case "pwd":          return this._print(this.cwd);

            /* ── File system ── */
            case "ls":           return this._cmdLs(args);
            case "mkdir":        return this._cmdMkdir(rest);
            case "rmdir":        return this._cmdRmdir(rest);
            case "rd":           return this._cmdRmdir(rest);
            case "md":           return this._cmdMkdir(rest);
            case "cat":          return this._cmdCat(rest);
            case "cp":           return this._cmdCopy(args);
            case "mv":           return this._cmdMove(args);
            case "rm":           return this._cmdDel(rest);
            case "rename":       return this._cmdRename(args);
            case "find":         return this._cmdFind(rest);
            case "tree":         return this._cmdTree();
            case "attrib":       return this._print("File attributes — not applicable in WebOS.");

            /* ── Text / File creation ── */
            case "echo.":        return this._print("");
            case "notepad":      return this._launchApp("NotesApp", "Notepad");

            /* ── Network (simulated) ── */
            case "ping":         return this._cmdPing(rest);
            case "ipconfig":     return this._cmdIpconfig();
            case "nslookup":     return this._cmdNslookup(rest);
            case "tracert":      return this._cmdTracert(rest);
            case "netstat":      return this._cmdNetstat();
            case "curl":         return this._print("'curl' is not recognized. Try the Browser app.");

            /* ── System ── */
            case "tasklist":     return this._cmdTasklist();
            case "taskkill":     return this._cmdTaskkill(args);
            case "shutdown":     return this._cmdShutdown(args);
            case "restart":      return this._cmdShutdown(["/r"]);
            case "logoff":       return this._cmdLogoff();
            case "cls":          /* alias handled above */
            case "clear":        this.outputEl.innerHTML = ""; return;
            case "exit":         return this._cmdExit();
            case "color":        return this._cmdColor(args);

            /* ── Math / Calc ── */
            case "calc":         return this._launchApp("CalculatorApp", "Calculator");

            /* ── App launchers ── */
            case "start":        return this._cmdStart(args);
            case "open":         return this._cmdStart(args);

            /* ── Misc ── */
            case "cls.":         this.outputEl.innerHTML = ""; return;
            case "pause":        return this._print("Press Enter to continue...");
            case "rem":          return; // comment — do nothing
            case "title":        return; // title change — no-op
            case "":             return;

            default:
                this._print(
                    `'${parts[0]}' is not recognized as an internal or external command,\n` +
                    `operable program or batch file.`,
                    "#ff6b6b"
                );
        }
    }

    /* ══════════════════════════════════════════
       COMMANDS
    ══════════════════════════════════════════ */

    _cmdHelp() {
        this._print(
`<span style="color:#f0e68c">WebOS Command Prompt — Available Commands</span>

<span style="color:#87ceeb">── Navigation ──────────────────────────</span>
  CD [path]          Change directory
  CD ..              Go up one level
  CD \\               Go to drive root
  DIR / LS           List directory contents
  TREE               Show directory tree
  MKDIR / MD [name]  Create folder
  RMDIR / RD [name]  Remove folder

<span style="color:#87ceeb">── Files ───────────────────────────────</span>
  CAT / TYPE [file]  Display file contents
  COPY / CP [f] [d]  Copy file
  MOVE / MV [f] [d]  Move / rename file
  DEL / RM [file]    Delete file
  RENAME / REN       Rename file
  FIND [text]        Search for text

<span style="color:#87ceeb">── System Info ─────────────────────────</span>
  VER                Windows version
  DATE / TIME        Current date / time
  WHOAMI             Current user
  HOSTNAME           Computer name
  SYSTEMINFO         System information
  TASKLIST           Running applications
  TASKKILL /IM [app] Close an app
  SET                Show environment variables
  SET [var]=[val]    Set a variable

<span style="color:#87ceeb">── Network ─────────────────────────────</span>
  PING [host]        Ping a host
  IPCONFIG           Network configuration
  NSLOOKUP [host]    DNS lookup
  TRACERT [host]     Trace route
  NETSTAT            Network statistics

<span style="color:#87ceeb">── Apps & Utilities ────────────────────</span>
  START [app]        Launch an app (browser, calc, notes…)
  CALC               Open Calculator
  NOTEPAD            Open Notes

<span style="color:#87ceeb">── Terminal ────────────────────────────</span>
  ECHO [text]        Print text
  CLS / CLEAR        Clear screen        (Ctrl+L also works)
  COLOR [code]       Change text color
  HISTORY            Command history
  EXIT               Close terminal
  HELP               Show this help

<span style="color:#555">Tip: Use ↑ / ↓ to navigate command history. Tab to autocomplete.</span>`
        );
    }

    _cmdCd(args) {
        if (!args.length || args[0] === "") {
            this._print(this.cwd);
            return;
        }
        const target = args.join(" ");
        if (target === "..") {
            const parts = this.cwd.split("\\");
            if (parts.length > 1) { parts.pop(); this.cwd = parts.join("\\") || "C:"; }
        } else if (target === "\\" || target === "/") {
            this.cwd = "C:";
        } else {
            const resolved = this._resolvePath(target);
            if (this.vfsDirs.has(resolved)) {
                this.cwd = resolved;
            } else {
                this._print(`The system cannot find the path specified: ${target}`, "#ff6b6b");
                return;
            }
        }
        this.promptSpan.textContent = this.cwd + ">";
    }

    _cmdLs(args) {
        const target = args.length ? this._resolvePath(args.join(" ")) : this.cwd;
        const dirs  = [...this.vfsDirs].filter(d => {
            const parent = d.substring(0, d.lastIndexOf("\\"));
            return parent === target;
        });
        const files = Object.keys(this.vfsFiles).filter(f => {
            const parent = f.substring(0, f.lastIndexOf("\\"));
            return parent === target;
        });

        if (!this.vfsDirs.has(target) && dirs.length === 0 && files.length === 0) {
            this._print(`File Not Found`, "#ff6b6b"); return;
        }

        const now = new Date().toLocaleDateString("en-US");
        this._print(`\n Directory of ${target}\n`);
        dirs.forEach(d => {
            const name = d.split("\\").pop();
            this._print(`${now}  &lt;DIR&gt;          <span style="color:#87ceeb">${name}</span>`);
        });
        files.forEach(f => {
            const name = f.split("\\").pop();
            const size = (this.vfsFiles[f] || "").length;
            this._print(`${now}          ${String(size).padStart(8)}  ${name}`);
        });
        this._print(`\n       ${dirs.length} Dir(s)    ${files.length} File(s)\n`);
    }

    _cmdMkdir(name) {
        if (!name) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const path = this._resolvePath(name);
        if (this.vfsDirs.has(path)) { this._print(`A subdirectory or file ${name} already exists.`, "#ff6b6b"); return; }
        this.vfsDirs.add(path);
        this._print(`Directory created: ${path}`);
    }

    _cmdRmdir(name) {
        if (!name) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const path = this._resolvePath(name);
        if (!this.vfsDirs.has(path)) { this._print(`The system cannot find the path specified.`, "#ff6b6b"); return; }
        this.vfsDirs.delete(path);
        this._print(`Directory deleted: ${path}`);
    }

    _cmdCat(name) {
        if (!name) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const path = this._resolvePath(name);
        if (!(path in this.vfsFiles)) { this._print(`The system cannot find the file specified: ${name}`, "#ff6b6b"); return; }
        this._print(this.vfsFiles[path] || "(empty file)");
    }

    _cmdCopy(args) {
        if (args.length < 2) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const src = this._resolvePath(args[0]);
        const dst = this._resolvePath(args[1]);
        if (!(src in this.vfsFiles)) { this._print(`The system cannot find the file specified.`, "#ff6b6b"); return; }
        this.vfsFiles[dst] = this.vfsFiles[src];
        this._print(`        1 file(s) copied.`);
    }

    _cmdMove(args) {
        if (args.length < 2) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const src = this._resolvePath(args[0]);
        const dst = this._resolvePath(args[1]);
        if (!(src in this.vfsFiles)) { this._print(`The system cannot find the file specified.`, "#ff6b6b"); return; }
        this.vfsFiles[dst] = this.vfsFiles[src];
        delete this.vfsFiles[src];
        this._print(`        1 file(s) moved.`);
    }

    _cmdDel(name) {
        if (!name) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const path = this._resolvePath(name);
        if (!(path in this.vfsFiles)) { this._print(`Could Not Find ${name}`, "#ff6b6b"); return; }
        delete this.vfsFiles[path];
        this._print(`File deleted: ${path}`);
    }

    _cmdRename(args) {
        if (args.length < 2) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const src = this._resolvePath(args[0]);
        const dst = this._resolvePath(args[1]);
        if (!(src in this.vfsFiles)) { this._print(`The system cannot find the file specified.`, "#ff6b6b"); return; }
        this.vfsFiles[dst] = this.vfsFiles[src];
        delete this.vfsFiles[src];
        this._print(`File renamed: ${src} → ${dst}`);
    }

    _cmdFind(text) {
        if (!text) { this._print("The syntax of the command is incorrect.", "#ff6b6b"); return; }
        const matches = Object.keys(this.vfsFiles).filter(p =>
            (this.vfsFiles[p] || "").toLowerCase().includes(text.toLowerCase()));
        if (!matches.length) { this._print(`FIND: No files found matching "${text}"`, "#ff6b6b"); return; }
        matches.forEach(p => this._print(`---------- ${p}\n${this.vfsFiles[p]}\n`));
    }

    _cmdTree() {
        this._print(`Folder PATH listing for ${this.cwd}\n`);
        const prefix = (d, lvl) => "│   ".repeat(lvl) + "├── " + d.split("\\").pop();
        const cdriven = [...this.vfsDirs].filter(d => d.startsWith(this.cwd) && d !== this.cwd);
        cdriven.forEach((d, i) => {
            const lvl = d.replace(this.cwd, "").split("\\").filter(Boolean).length - 1;
            this._print(prefix(d, lvl));
        });
    }

    _cmdSet(args) {
        if (!args.length) {
            Object.entries(this.env).forEach(([k, v]) => this._print(`${k}=${v}`));
            return;
        }
        const eq = args.join(" ").indexOf("=");
        if (eq === -1) {
            const val = this.env[args[0].toUpperCase()];
            this._print(val !== undefined ? `${args[0].toUpperCase()}=${val}` : `Environment variable ${args[0]} not defined.`);
        } else {
            const k = args.join(" ").slice(0, eq).trim().toUpperCase();
            const v = args.join(" ").slice(eq + 1).trim();
            this.env[k] = v;
        }
    }

    _cmdSysInfo() {
        const mb = (performance.memory?.totalJSHeapSize / 1048576 || 0).toFixed(0);
        this._print(
`Host Name:                 ${this.env.COMPUTERNAME}
OS Name:                   WebOS
OS Version:                1.0 Build 2025.6
OS Manufacturer:           WebOS Corporation
OS Configuration:          Standalone Workstation
Registered Owner:          ${this.env.USERNAME}
System Type:               x64-based PC
Total Physical Memory:     ${navigator.deviceMemory ? navigator.deviceMemory * 1024 : 8192} MB
Available Physical Memory: ${mb} MB
Time Zone:                 (UTC+05:30) Chennai, Mumbai, New Delhi
System Locale:             en-in;English (India)
Input Locale:              en-in;English (India)`
        );
    }

    _cmdTasklist() {
        this._print(`\nImage Name                     PID  Session#  Mem Usage`);
        this._print(`========================= ======== ========  ==========`);
        const apps = [
            ["WebOS.exe",     "1",  "0", "45,320 K"],
            ["Terminal.exe",  "12", "1", "12,840 K"],
            ["Explorer.exe",  "44", "1", "28,000 K"],
        ];
        // Check open windows if WindowManager is available
        if (typeof WindowManager !== "undefined" && WindowManager.windows) {
            Object.values(WindowManager.windows).forEach((w, i) => {
                apps.push([`${w.name || "App"}.exe`, String(100 + i), "1", "18,000 K"]);
            });
        }
        apps.forEach(([name, pid, sess, mem]) =>
            this._print(`${name.padEnd(26)} ${pid.padStart(4)}   ${sess.padStart(3)}     ${mem}`)
        );
    }

    _cmdTaskkill(args) {
        const im = args.indexOf("/IM");
        if (im === -1) { this._print("ERROR: Invalid argument/option", "#ff6b6b"); return; }
        const target = args[im + 1];
        this._print(`SUCCESS: The process "${target}" has been terminated.`, "#55efc4");
    }

    _cmdShutdown(args) {
        if (args.includes("/r")) {
            this._print("Restarting WebOS…");
            setTimeout(() => location.reload(), 1500);
        } else if (args.includes("/l")) {
            this._cmdLogoff();
        } else {
            this._print("It is now safe to turn off your computer.\n", "#55efc4");
        }
    }

    _cmdLogoff() {
        this._print("Logging off…");
        setTimeout(() => {
            localStorage.removeItem("regNumber");
            window.location.href = "login.html";
        }, 1200);
    }

    _cmdExit() {
        this._print("Closing terminal…");
        setTimeout(() => {
            const winEl = this.outputEl?.closest(".window");
            if (winEl) winEl.remove();
        }, 600);
    }

    _cmdColor(args) {
        const code = args[0] || "";
        const colors = {
            "0": "#000",  "1": "#000080", "2": "#008000", "3": "#008080",
            "4": "#800000","5": "#800080", "6": "#808000", "7": "#c0c0c0",
            "8": "#808080","9": "#0000ff", "A": "#00ff00", "B": "#00ffff",
            "C": "#ff0000","D": "#ff00ff", "E": "#ffff00", "F": "#ffffff",
        };
        if (code.length === 2) {
            const bg = colors[code[0].toUpperCase()];
            const fg = colors[code[1].toUpperCase()];
            if (bg && fg) {
                this.outputEl.closest(".terminal-container").style.background = bg;
                this.outputEl.style.color = fg;
                this.inputEl.style.color  = fg;
                this._print("Color changed.", fg);
                return;
            }
        }
        this._print("Usage: COLOR [attr]  e.g. COLOR 0A (black bg, green text)");
    }

    _cmdPing(host) {
        if (!host) { this._print("Usage: PING hostname", "#ff6b6b"); return; }
        this._print(`\nPinging ${host} with 32 bytes of data:`);
        let i = 0;
        const iv = setInterval(() => {
            const ms = Math.floor(Math.random() * 20 + 5);
            this._print(`Reply from ${host}: bytes=32 time=${ms}ms TTL=128`, "#55efc4");
            this._scrollBottom();
            if (++i >= 4) {
                clearInterval(iv);
                this._print(`\nPing statistics for ${host}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)\nApproximate round trip times in milli-seconds:\n    Minimum = ${ms}ms, Maximum = ${ms + 5}ms, Average = ${ms + 2}ms`);
                this._scrollBottom();
            }
        }, 600);
    }

    _cmdIpconfig() {
        this._print(
`Windows IP Configuration

Ethernet adapter WebOS Virtual Adapter:

   Connection-specific DNS Suffix  . : webos.local
   IPv4 Address. . . . . . . . . . . : 192.168.1.${Math.floor(Math.random()*200+10)}
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
   DNS Servers . . . . . . . . . . . : 8.8.8.8
                                       8.8.4.4`
        );
    }

    _cmdNslookup(host) {
        if (!host) { this._print("Usage: NSLOOKUP hostname", "#ff6b6b"); return; }
        this._print(`Server:  dns.webos.local\nAddress:  8.8.8.8\n\nNon-authoritative answer:\nName:    ${host}\nAddress:  93.184.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`);
    }

    _cmdTracert(host) {
        if (!host) { this._print("Usage: TRACERT hostname", "#ff6b6b"); return; }
        this._print(`\nTracing route to ${host} over a maximum of 30 hops:\n`);
        let hop = 1;
        const iv = setInterval(() => {
            const ms = Math.floor(Math.random() * 15 + 2);
            this._print(`  ${hop}    ${ms} ms   ${ms+1} ms   ${ms} ms  192.168.${hop}.1`);
            this._scrollBottom();
            if (++hop > 5) {
                clearInterval(iv);
                this._print(`  6     <1 ms    <1 ms    <1 ms  ${host}`);
                this._print(`\nTrace complete.`);
                this._scrollBottom();
            }
        }, 400);
    }

    _cmdNetstat() {
        this._print(`\nActive Connections\n\n  Proto  Local Address          Foreign Address        State`);
        this._print(`  TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING`);
        this._print(`  TCP    127.0.0.1:5000          127.0.0.1:52342        ESTABLISHED`);
        this._print(`  TCP    127.0.0.1:52342         127.0.0.1:5000         ESTABLISHED`);
    }

    _cmdStart(args) {
        const appMap = {
            browser:    ["BrowserApp",    "Browser"],
            calc:       ["CalculatorApp", "Calculator"],
            calculator: ["CalculatorApp", "Calculator"],
            notepad:    ["NotesApp",      "Notepad"],
            notes:      ["NotesApp",      "Notes"],
            terminal:   ["TerminalApp",   "Terminal"],
            planner:    ["PlannerApp",    "Planner"],
            timer:      ["TimerApp",      "Timer"],
            attendance: ["AttendanceApp", "Attendance"],
        };
        const key = (args[0] || "").toLowerCase().replace(/\.exe$/i, "");
        const entry = appMap[key];
        if (entry) {
            this._launchApp(entry[0], entry[1]);
        } else if (!key) {
            this._print("Usage: START [appname]  e.g. START browser");
        } else {
            this._print(`'${args[0]}' is not a recognized application.`, "#ff6b6b");
            this._print(`Try: START browser | calc | notepad | planner | timer | attendance`);
        }
    }

    _launchApp(className, displayName) {
        if (typeof window[className] !== "undefined") {
            WindowManager.createWindow(new window[className]());
            this._print(`Opening ${displayName}…`, "#55efc4");
        } else {
            this._print(`${displayName} is not available.`, "#ff6b6b");
        }
    }

    _autocomplete() {
        const val = this.inputEl.value;
        const parts = val.split("\\");
        const partial = parts.pop();
        const dir = parts.length ? parts.join("\\") : this.cwd;
        const resolved = parts.length ? this._resolvePath(parts.join("\\")) : this.cwd;

        const matches = [
            ...[...this.vfsDirs].filter(d => {
                const parent = d.substring(0, d.lastIndexOf("\\"));
                const name   = d.split("\\").pop();
                return parent === resolved && name.toLowerCase().startsWith(partial.toLowerCase());
            }),
            ...Object.keys(this.vfsFiles).filter(f => {
                const parent = f.substring(0, f.lastIndexOf("\\"));
                const name   = f.split("\\").pop();
                return parent === resolved && name.toLowerCase().startsWith(partial.toLowerCase());
            })
        ];

        if (matches.length === 1) {
            const name = matches[0].split("\\").pop();
            this.inputEl.value = (parts.length ? parts.join("\\") + "\\" : "") + name;
        } else if (matches.length > 1) {
            this._print(matches.map(m => m.split("\\").pop()).join("    "));
        }
    }

    /* ══════════════════════════════════════════
       UTILS
    ══════════════════════════════════════════ */
    _resolvePath(p) {
        if (!p) return this.cwd;
        if (/^[a-zA-Z]:/.test(p)) return p.replace(/\//g, "\\"); // absolute
        if (p.startsWith("\\")) return this.cwd.split("\\")[0] + p;
        return this.cwd + "\\" + p.replace(/\//g, "\\");
    }

    _print(html, color) {
        if (!this.outputEl) return;
        const line = document.createElement("div");
        line.style.cssText = `white-space:pre-wrap;line-height:1.55;${color ? "color:" + color + ";" : ""}`;
        line.innerHTML = html ?? "";
        this.outputEl.appendChild(line);
    }

    _printCmd(cmd) {
        this._print(`<span style="color:#f0e68c">${this.cwd}&gt;</span> <span style="color:#fff">${this._esc(cmd)}</span>`);
    }

    _esc(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    _scrollBottom() {
        if (this.outputEl) this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='terminal']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new TerminalApp());
    }
});
