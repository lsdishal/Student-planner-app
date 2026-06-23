class CalculatorApp extends BaseApp {
    constructor() {
        super("Calculator");
        this.expression = "";
        this.result     = "";
        this.justEvaled = false;
    }

    render(container) {
        container.classList.add("calculator-container");
        container.innerHTML = `
            <div class="calc-body">
                <div class="calc-display-wrap">
                    <div class="calc-expr" id="calcExpr"></div>
                    <div class="calc-display" id="calcDisplay">0</div>
                </div>
                <div class="calc-buttons">
                    <!-- Row 1 -->
                    <button class="calc-btn btn-fn"  data-val="AC">AC</button>
                    <button class="calc-btn btn-fn"  data-val="+/-">⁺∕₋</button>
                    <button class="calc-btn btn-fn"  data-val="%">%</button>
                    <button class="calc-btn btn-op"  data-val="÷">÷</button>
                    <!-- Row 2 -->
                    <button class="calc-btn btn-num" data-val="7">7</button>
                    <button class="calc-btn btn-num" data-val="8">8</button>
                    <button class="calc-btn btn-num" data-val="9">9</button>
                    <button class="calc-btn btn-op"  data-val="×">×</button>
                    <!-- Row 3 -->
                    <button class="calc-btn btn-num" data-val="4">4</button>
                    <button class="calc-btn btn-num" data-val="5">5</button>
                    <button class="calc-btn btn-num" data-val="6">6</button>
                    <button class="calc-btn btn-op"  data-val="−">−</button>
                    <!-- Row 4 -->
                    <button class="calc-btn btn-num" data-val="1">1</button>
                    <button class="calc-btn btn-num" data-val="2">2</button>
                    <button class="calc-btn btn-num" data-val="3">3</button>
                    <button class="calc-btn btn-op"  data-val="+">+</button>
                    <!-- Row 5 -->
                    <button class="calc-btn btn-num btn-zero" data-val="0">0</button>
                    <button class="calc-btn btn-num" data-val=".">.</button>
                    <button class="calc-btn btn-op btn-eq" data-val="=">=</button>
                </div>
            </div>
        `;

        this.displayEl = container.querySelector("#calcDisplay");
        this.exprEl    = container.querySelector("#calcExpr");

        container.querySelectorAll(".calc-btn").forEach(btn => {
            btn.addEventListener("click", () => this._press(btn.dataset.val));
            btn.addEventListener("mousedown", e => e.preventDefault());
        });

        // Keyboard support
        container.setAttribute("tabindex", "0");
        container.addEventListener("keydown", e => this._key(e));
        setTimeout(() => container.focus(), 50);
    }

    _press(val) {
        const ops = ["÷", "×", "−", "+"];

        if (val === "AC") {
            this.expression = "";
            this.result = "";
            this.justEvaled = false;
            this._update("0", "");
            return;
        }

        if (val === "+/-") {
            if (this.result !== "") {
                this.result = String(-parseFloat(this.result));
                this._update(this.result, this.expression);
            }
            return;
        }

        if (val === "%") {
            if (this.result !== "") {
                this.result = String(parseFloat(this.result) / 100);
                this._update(this.result, this.expression);
            }
            return;
        }

        if (val === "=") {
            if (!this.expression) return;
            const expr = this.expression + (this.result || "0");
            this.exprEl.textContent = expr + " =";
            try {
                const sanitized = expr
                    .replace(/÷/g, "/")
                    .replace(/×/g, "*")
                    .replace(/−/g, "-");
                // Safe eval: only numbers and operators
                if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(sanitized))
                    throw new Error("unsafe");
                // eslint-disable-next-line no-new-func
                const res = Function(`"use strict"; return (${sanitized})`)();
                this.result = String(parseFloat(res.toFixed(10)));
                this.expression = "";
                this.justEvaled = true;
                this._update(this.result, this.exprEl.textContent);
            } catch {
                this._update("Error", "");
                this.expression = "";
                this.result = "";
            }
            return;
        }

        if (ops.includes(val)) {
            if (this.justEvaled) {
                // chain from last result
                this.expression = this.result + " " + val + " ";
                this.result = "";
                this.justEvaled = false;
            } else if (this.result !== "") {
                this.expression += this.result + " " + val + " ";
                this.result = "";
            } else if (this.expression) {
                // Replace last operator
                this.expression = this.expression.trimEnd().replace(/[\+\-\*\/÷×−]$/, "").trimEnd()
                    + " " + val + " ";
            }
            this._update(this.expression || "0", "");
            return;
        }

        // Digit or dot
        if (this.justEvaled) {
            this.result = "";
            this.expression = "";
            this.justEvaled = false;
        }
        if (val === "." && this.result.includes(".")) return;
        if (val !== "." && this.result === "0") this.result = "";
        this.result += val;
        this._update(this.result, this.expression);
    }

    _key(e) {
        const map = {
            "0":"0","1":"1","2":"2","3":"3","4":"4",
            "5":"5","6":"6","7":"7","8":"8","9":"9",
            ".":".", "+":"+", "-":"−", "*":"×", "/":"÷",
            "Enter":"=", "=":"=", "Escape":"AC", "Backspace":"DEL",
            "%":"%"
        };
        const v = map[e.key];
        if (!v) return;
        e.preventDefault();
        if (v === "DEL") {
            if (this.result.length > 0) this.result = this.result.slice(0, -1) || "";
            this._update(this.result || "0", this.expression);
        } else {
            this._press(v);
        }
    }

    _update(display, expr) {
        // Shrink font if long
        const len = String(display).length;
        const size = len > 12 ? "22px" : len > 9 ? "30px" : len > 6 ? "40px" : "56px";
        this.displayEl.style.fontSize = size;
        this.displayEl.textContent = display;
        if (expr !== undefined) this.exprEl.textContent = expr;
    }
}

EventBus.on("SYSTEM_BOOT", () => {
    const launcher = document.querySelector("[data-app='calculator']");
    if (launcher) {
        launcher.onclick = () => WindowManager.createWindow(new CalculatorApp());
    }
});
