class CalculatorApp extends BaseApp {
    constructor() {
        super("Calculator");
    }

    render(container) {
        container.classList.add("calculator-container"); // Helper class
        const display = document.createElement("input");
        display.readOnly = true;
        display.className = "calc-display";

        const buttonContainer = document.createElement("div");
        buttonContainer.className = "calc-buttons";

        // iOS Standard Layout
        const buttons = [
            "AC", "+/-", "%", "÷",
            "7", "8", "9", "×",
            "4", "5", "6", "-",
            "1", "2", "3", "+",
            "0", ".", "="
        ];

        buttons.forEach(char => {
            const btn = document.createElement("button");
            btn.innerText = char;
            if (char === "0") btn.classList.add("btn-zero");
            btn.onclick = () => this.input(char, display);
            buttonContainer.appendChild(btn);
        });

        container.append(display, buttonContainer);
    }

    input(char, display) {
        if (char === "=") {
            try {
                let expr = display.value
                    .replace(/×/g, "*")
                    .replace(/÷/g, "/");
                display.value = eval(expr) || "";
            } catch (e) {
                display.value = "Error";
            }
        } else if (char === "AC") {
            display.value = "";
        } else if (char === "+/-") {
            if (display.value) {
                if (display.value.startsWith("-")) display.value = display.value.slice(1);
                else display.value = "-" + display.value;
            }
        } else if (char === "%") {
            try {
                display.value = eval(display.value) / 100;
            } catch (e) { display.value = "Error"; }
        } else {
            display.value += char;
        }
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='calculator']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new CalculatorApp());
    }
});
