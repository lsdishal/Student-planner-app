console.log("Booting Web OS...");

let isSyncing = false; // Prevent infinite loops during bootstrap sync
const originalSetItem = localStorage.setItem;

// Globally intercept localStorage.setItem to auto-sync app updates to the backend database
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);

    if (isSyncing) return;

    // Managed key list
    const targetKeys = [
        "webos_marks_data",
        "webos_fs_data",
        "webos_grades_data",
        "webos_fees_data",
        "webos_timetable_data",
        "webos_msg_me",
        "webos_msg_chats",
        "webos_od_data",
        "webos_student_profile",
        "webos_campus_mess",
        "webos_campus_laundry",
        "webos_campus_buses",
        "webos_campus_mode",
        "webos_pinned_apps"
    ];

    const matchedKey = targetKeys.find(tk => key.startsWith(tk));
    if (matchedKey) {
        const regNumber = localStorage.getItem("regNumber");
        if (regNumber) {
            const { protocol, hostname, port, origin } = window.location;
            const host = hostname || 'localhost';
            const scheme = protocol === 'https:' ? 'https' : 'http';
            const apiBase = (protocol !== 'file:' && (!port || port === '5000' || port === '80' || port === '443')) 
                ? origin 
                : `${scheme}://${host}:5001`;

            fetch(`${apiBase}/api/state/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    registration_number: regNumber,
                    key: key,
                    value: value
                })
            }).catch(err => console.error("Sync error:", err));
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const regNumber = localStorage.getItem("regNumber");
    if (!regNumber) {
        window.location.href = "login.html";
        return;
    }

    const { protocol, hostname, port, origin } = window.location;
    const host = hostname || 'localhost';
    const scheme = protocol === 'https:' ? 'https' : 'http';
    const apiBase = (protocol !== 'file:' && (!port || port === '5000' || port === '80' || port === '443')) 
        ? origin 
        : `${scheme}://${host}:5001`;

    console.log("[Boot] Syncing user state from database...");
    
    fetch(`${apiBase}/api/state/load-all/${regNumber}`)
        .then(res => {
            if (!res.ok) throw new Error("Backend offline or error");
            return res.json();
        })
        .then(states => {
            console.log("[Boot] States synchronized successfully");
            
            const targetKeys = [
                "webos_marks_data",
                "webos_fs_data",
                "webos_grades_data",
                "webos_fees_data",
                "webos_timetable_data",
                "webos_msg_me",
                "webos_msg_chats",
                "webos_od_data",
                "webos_student_profile",
                "webos_campus_mess",
                "webos_campus_laundry",
                "webos_campus_buses",
                "webos_campus_mode",
                "webos_pinned_apps"
            ];

            const receivedKeys = new Set();
            isSyncing = true;
            try {
                states.forEach(s => {
                    localStorage.setItem(s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
                    receivedKeys.add(s.key);
                });

                // Clear cached keys that don't belong to this user
                targetKeys.forEach(tk => {
                    if (!receivedKeys.has(tk)) {
                        localStorage.removeItem(tk);
                    }
                });
            } finally {
                isSyncing = false;
            }
        })
        .catch(err => {
            console.warn("[Boot] Using offline local storage:", err);
        })
        .finally(() => {
            // Emit SYSTEM_BOOT once state initialization completes (simulate tiny delay)
            setTimeout(() => {
                EventBus.emit("SYSTEM_BOOT");
                console.log("System Booted");
            }, 300);
        });
});
