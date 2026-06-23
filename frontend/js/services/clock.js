const ClockService = (() => {
    function init() {
        const el = document.getElementById('clock');
        const widgetTime = document.getElementById('widget-time');
        const widgetDate = document.getElementById('widget-date');

        function update() {
            const now = new Date();
            // Taskbar
            if (el) el.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Widget
            if (widgetTime) widgetTime.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (widgetDate) widgetDate.innerText = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        }
        setInterval(update, 1000);
        update();
    }

    // Wait for boot or DOM
    document.addEventListener("DOMContentLoaded", init);

    return { init };
})();
