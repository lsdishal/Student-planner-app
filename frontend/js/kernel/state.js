const SystemState = (() => {
    let processes = {};
    let focusedProcess = null;
    let pidCounter = 1000;

    function createProcess(appName) {
        const pid = pidCounter++;
        processes[pid] = {
            pid,
            appName,
            state: "RUNNING"
        };
        return pid;
    }

    function killProcess(pid) {
        delete processes[pid];
    }

    function focusProcess(pid) {
        focusedProcess = pid;
    }

    return {
        createProcess,
        killProcess,
        focusProcess
    };
})();
