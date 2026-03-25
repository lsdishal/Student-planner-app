class BaseApp {
    constructor(name) {
        this.name = name;
    }

    render(container) {
        container.innerHTML = "<p>Base App</p>";
    }
}
