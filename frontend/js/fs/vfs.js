const VFS = (() => {
    const STORAGE_KEY = "webos_fs_data";
    let fs = loadFS();

    function loadFS() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                console.error("FS Corruption", e);
            }
        }
        return {
            home: {
                attendance: null, // Will be files
                study: {
                    notes: {}
                },
                browser: {
                    history: []
                },
                documents: {}
            }
        };
    }

    function saveFS() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
    }

    function resolveParent(path) {
        const parts = path.split("/");
        const filename = parts.pop();
        let current = fs;
        for (const part of parts) {
            if (!part) continue; // Skip empty from leading slash
            if (!current[part]) current[part] = {}; // Auto mkdir
            current = current[part];
        }
        return { dir: current, filename };
    }

    function writeFileSync(path, content) {
        const { dir, filename } = resolveParent(path);
        dir[filename] = content;
        saveFS();
        console.log(`[VFS] Wrote to ${path}`);
    }

    function readFileSync(path) {
        const { dir, filename } = resolveParent(path);
        return dir[filename];
    }

    function exists(path) {
        const { dir, filename } = resolveParent(path);
        return dir[filename] !== undefined && dir[filename] !== null;
    }

    function list(path) {
        try {
            const { dir, filename } = resolveParent(path + "/dummy"); // Hack to get dir
            // Actually, resolveParent gets parent of filename.
            // If path is "home", parts=["home"]. filename="home". parent=root.
            // If path is "home/", parts=["home", ""]. filename="". parent=home.

            // Simplier traversal for list
            const parts = path.split("/").filter(x => x);
            let current = fs;
            for (const p of parts) {
                current = current[p];
            }
            return Object.keys(current || {});
        } catch (e) {
            return [];
        }
    }

    // Debug helper
    window.VFS_DEBUG = () => console.log(fs);

    return { writeFileSync, readFileSync, exists, list };
})();
