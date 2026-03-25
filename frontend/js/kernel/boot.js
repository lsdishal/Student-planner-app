console.log("Booting Web OS...");

document.addEventListener("DOMContentLoaded", () => {
    // Simulate a small boot delay for effect
    setTimeout(() => {
        EventBus.emit("SYSTEM_BOOT");
        console.log("System Booted");
    }, 500);
});
