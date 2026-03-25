class EditorApp extends BaseApp {
    constructor() {
        super("Code Editor");
    }

    render(container) {
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.height = "100%";
        container.style.background = "#1e1e1e";
        container.style.color = "#fff";

        // Toolbar
        const toolbar = document.createElement("div");
        toolbar.style.display = "flex";
        toolbar.style.gap = "8px";
        toolbar.style.padding = "8px";
        toolbar.style.background = "#252526";
        toolbar.style.borderBottom = "1px solid #333";

        const langSelect = document.createElement("select");
        langSelect.innerHTML = `
            <option value="html">HTML</option>
            <option value="js">JavaScript</option>
            <option value="c">C</option>
        `;
        langSelect.style.padding = "4px";
        langSelect.style.background = "#3c3c3c";
        langSelect.style.color = "#fff";
        langSelect.style.border = "1px solid #555";
        langSelect.style.borderRadius = "3px";

        const fileNameInput = document.createElement("input");
        fileNameInput.type = "text";
        fileNameInput.placeholder = "filename.txt";
        fileNameInput.style.padding = "4px";
        fileNameInput.style.background = "#3c3c3c";
        fileNameInput.style.color = "#fff";
        fileNameInput.style.border = "1px solid #555";
        fileNameInput.style.borderRadius = "3px";
        fileNameInput.style.flex = "1";

        const openBtn = document.createElement("button");
        openBtn.innerText = "📂 Open";
        openBtn.style.padding = "4px 10px";
        openBtn.style.background = "#3c3c3c";
        openBtn.style.color = "white";
        openBtn.style.border = "1px solid #555";
        openBtn.style.borderRadius = "3px";
        openBtn.style.cursor = "pointer";

        const saveBtn = document.createElement("button");
        saveBtn.innerText = "💾 Save";
        saveBtn.style.padding = "4px 10px";
        saveBtn.style.background = "#0e639c";
        saveBtn.style.color = "white";
        saveBtn.style.border = "none";
        saveBtn.style.borderRadius = "3px";
        saveBtn.style.cursor = "pointer";

        const importBtn = document.createElement("button");
        importBtn.innerText = "📤 Import";
        importBtn.style.padding = "4px 10px";
        importBtn.style.background = "#3c3c3c";
        importBtn.style.color = "white";
        importBtn.style.border = "1px solid #555";
        importBtn.style.borderRadius = "3px";
        importBtn.style.cursor = "pointer";

        const exportBtn = document.createElement("button");
        exportBtn.innerText = "📥 Export";
        exportBtn.style.padding = "4px 10px";
        exportBtn.style.background = "#3c3c3c";
        exportBtn.style.color = "white";
        exportBtn.style.border = "1px solid #555";
        exportBtn.style.borderRadius = "3px";
        exportBtn.style.cursor = "pointer";

        // Hidden file input for import
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.style.display = "none";

const apiBase = "https://web-os-backend.onrender.com/api/editor";
        const regNumber = localStorage.getItem('regNumber') || "STUDENT";

        saveBtn.onclick = async () => {
            const filename = fileNameInput.value.trim();
            if (!filename) { alert("Enter a filename"); return; }

            saveBtn.disabled = true;
            saveBtn.innerText = "Saving...";

            try {
                const res = await fetch(`${apiBase}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        registration_number: regNumber,
                        filename: filename,
                        content: textarea.value,
                        language: langSelect.value
                    })
                });
                if (res.ok) alert("File saved to cloud!");
            } catch (err) { alert("Save failed"); }

            saveBtn.disabled = false;
            saveBtn.innerText = "💾 Save";
        };

        openBtn.onclick = async () => {
            const filename = prompt("Enter filename to load:");
            if (!filename) return;
            try {
                const res = await fetch(`${apiBase}/load/${regNumber}/${filename}`);
                const data = await res.json();
                if (res.ok) {
                    textarea.value = data.content;
                    fileNameInput.value = data.filename;
                    langSelect.value = data.language;
                    updateHighlight();
                } else { alert("File not found"); }
            } catch (err) { alert("Load failed"); }
        };

        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                textarea.value = event.target.result;
                fileNameInput.value = file.name;
                // Auto-detect lang from extension
                const ext = file.name.split('.').pop();
                if (['html', 'js', 'c'].includes(ext)) {
                    langSelect.value = ext;
                }
                updateHighlight();
            };
            reader.readAsText(file);
        };

        exportBtn.onclick = () => {
            const filename = fileNameInput.value || "script.txt";
            const blob = new Blob([textarea.value], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        };

        toolbar.appendChild(langSelect);
        toolbar.appendChild(fileNameInput);
        toolbar.appendChild(openBtn);
        toolbar.appendChild(saveBtn);
        toolbar.appendChild(importBtn);
        toolbar.appendChild(exportBtn);
        toolbar.appendChild(fileInput);

        // Editor Layout
        const editorContainer = document.createElement("div");
        editorContainer.style.position = "relative";
        editorContainer.style.flex = "1";
        editorContainer.style.overflow = "hidden";
        editorContainer.style.background = "#1e1e1e";

        // Shared styles for overlay
        const commonStyle = `
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            padding: 10px;
            margin: 0;
            border: 0;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.5;
            position: absolute;
            top: 0;
            left: 0;
            overflow: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;

        const pre = document.createElement("pre");
        pre.style.cssText = commonStyle + `
            color: #d4d4d4;
            pointer-events: none;
            z-index: 1;
        `;

        const textarea = document.createElement("textarea");
        textarea.style.cssText = commonStyle + `
            color: transparent;
            background: transparent;
            caret-color: white;
            z-index: 2;
            resize: none;
            outline: none;
        `;
        // Sync scroll
        textarea.onscroll = () => {
            pre.scrollTop = textarea.scrollTop;
            pre.scrollLeft = textarea.scrollLeft;
        };

        const updateHighlight = () => {
            let code = textarea.value;
            // Escape HTML entities to prevent rendering
            code = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

            const lang = langSelect.value;
            if (lang === 'html') {
                // Tag Highlighting
                code = code.replace(/(&lt;\/?[a-zA-Z0-9]+)(&gt;)?/g, '<span style="color: #569cd6;">$1</span><span style="color: #808080;">$2</span>');
                code = code.replace(/([a-zA-Z-]+)=/g, '<span style="color: #9cdcfe;">$1</span>=');
                code = code.replace(/(&quot;.*?&quot;)/g, '<span style="color: #ce9178;">$1</span>');
            } else if (lang === 'js') {
                // JS Highlighting
                const keywords = ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "new", "this"];
                keywords.forEach(kw => {
                    const regex = new RegExp(`\\b${kw}\\b`, 'g');
                    code = code.replace(regex, `<span style="color: #c586c0;">${kw}</span>`);
                });
                // Strings
                code = code.replace(/(".*?")/g, '<span style="color: #ce9178;">$1</span>');
                code = code.replace(/('.*?')/g, '<span style="color: #ce9178;">$1</span>');
                // Comments
                code = code.replace(/(\/\/.*)/g, '<span style="color: #6a9955;">$1</span>');
                // Functions
                code = code.replace(/([a-zA-Z0-9_]+)\(/g, '<span style="color: #dcdcaa;">$1</span>(');
            } else if (lang === 'c') {
                const keywords = ["int", "char", "void", "return", "if", "while", "for", "struct", "include", "define"];
                keywords.forEach(kw => {
                    const regex = new RegExp(`\\b${kw}\\b`, 'g');
                    code = code.replace(regex, `<span style="color: #569cd6;">${kw}</span>`);
                });
                code = code.replace(/(".*?")/g, '<span style="color: #ce9178;">$1</span>');
                code = code.replace(/(#include)/g, '<span style="color: #c586c0;">$1</span>');
            }

            // Handle trailing newline
            if (code.endsWith("\n")) {
                code += " ";
            }

            pre.innerHTML = code;
        };

        textarea.oninput = updateHighlight;
        textarea.onkeydown = (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
                updateHighlight();
            }
        }

        editorContainer.appendChild(pre);
        editorContainer.appendChild(textarea);

        container.appendChild(toolbar);
        container.appendChild(editorContainer);

        // Initial text
        textarea.value = `// Welcome to WebOS Code Editor\nconsole.log("Hello World");`;
        updateHighlight();
    }
}

// Register
EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='editor']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new EditorApp());
    }
});
