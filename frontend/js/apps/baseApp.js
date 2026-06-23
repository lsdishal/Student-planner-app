class BaseApp {
    constructor(name) {
        this.name = name;
    }

    getRegNumber() {
        const reg = localStorage.getItem('regNumber');
        if (!reg) {
            alert('Please log in again to use this feature.');
            window.location.href = 'login.html';
            return null;
        }
        return reg;
    }

    render(container) {
        container.innerHTML = "<p>Base App</p>";
    }
}
