const EventQueue = (() => {
    const queue = [];
    const processingSpeed = 600; // ms
    let isProcessing = false;
    let visualList = null;
    let processingIndicator = null;

    function init() {
        visualList = document.getElementById("event-list");
        processingIndicator = document.getElementById("event-processing-indicator");

        // Listen for user interactions
        // We capture check bubbling events to simulate OS handling
        document.addEventListener("keydown", (e) => {
            enqueue("KEYBOARD", `Key: ${e.key}`);
        });

        document.addEventListener("mousedown", (e) => {
            enqueue("MOUSE", `Click: ${e.clientX},${e.clientY}`);
        });

        startProcessor();
    }

    function enqueue(type, detail) {
        if (!visualList) return;

        // Limit queue size for UI sanity
        if (queue.length > 8) queue.shift();

        const event = { id: Date.now() + Math.random(), type, detail };
        queue.push(event);
        renderQueue();
    }

    function renderQueue() {
        if (!visualList) return;
        visualList.innerHTML = "";

        // Render current queue
        // We want the HEAD of the queue (next to be processed) to be distinct?
        // Let's just list them.
        queue.forEach(evt => {
            const el = document.createElement("div");
            el.className = "event-item";
            el.innerText = `[${evt.type}] ${evt.detail}`;
            visualList.appendChild(el);
        });
    }

    function startProcessor() {
        setInterval(() => {
            if (queue.length > 0 && !isProcessing) {
                processNext();
            }
        }, 100);
    }

    function processNext() {
        isProcessing = true;

        const event = queue[0]; // Peek

        // Highlight in UI
        const firstEl = visualList ? visualList.firstChild : null; // matches enqueue order?
        // Wait, enqueue appends. So first child is first in.
        if (firstEl) {
            firstEl.classList.add("processing");
            firstEl.innerText += " <PROCESSING>";
        }

        if (processingIndicator) processingIndicator.classList.remove("hidden");

        // Simulate work
        setTimeout(() => {
            queue.shift(); // Remove from model
            renderQueue(); // Remove from UI

            isProcessing = false;
            if (processingIndicator) processingIndicator.classList.add("hidden");
        }, processingSpeed);
    }

    // Wait for DOM and wait for boot
    EventBus.on("SYSTEM_BOOT", init);

    return { enqueue };
})();
