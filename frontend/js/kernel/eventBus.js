const EventBus = (() => {
  const events = {};

  function on(event, handler) {
    if (!events[event]) events[event] = [];
    events[event].push(handler);
  }

  function emit(event, data = null) {
    if (!events[event]) return;
    events[event].forEach(handler => handler(data));
  }

  return { on, emit };
})();
