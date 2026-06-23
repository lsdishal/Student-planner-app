const Scheduler = (() => {
    // Advanced scheduler stub
    // distinct from SystemState which holds process list.
    // Scheduler would manage CPU time slices in a real OS.

    function schedule() {
        // Round robin?
        // console.log("Scheduling...");
    }

    // Hook into loop?
    // setInterval(schedule, 1000);

    return { schedule };
})();
