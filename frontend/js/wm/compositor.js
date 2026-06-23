const Compositor = (() => {
    // Manages z-indexes and visual layering
    // In our simple DOM OS, the browser is the compositor.
    // But we could manage effects here.

    function bringToFront(element) {
        // Logic handled in WindowManager currently
    }

    return { bringToFront };
})();
