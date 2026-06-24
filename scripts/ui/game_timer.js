// Game timer for the observer UI.
//
// Tracks how long the current game has been running: started when the observer
// receives its first tick (the game is actually live), stopped when the game
// ends in a win or a draw. The elapsed value is rendered into #status-time and
// ticks once a second while running. stop() freezes the final elapsed time so
// the observer can see how long the finished game took.

function formatElapsed(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
}

class GameTimer {
    constructor() {
        this.startTime = null;   // performance.now() at start, or null when not running
        this.intervalId = null;
        this.elementId = 'status-time';
    }

    get element() {
        return document.getElementById(this.elementId);
    }

    render(ms) {
        const el = this.element;
        if (el) el.textContent = formatElapsed(ms);
    }

    // Begin timing a freshly-started game. No-op if already running so repeated
    // ticks don't reset the clock.
    start() {
        if (this.startTime !== null) return;
        this.startTime = performance.now();
        this.render(0);
        this.intervalId = setInterval(() => {
            this.render(performance.now() - this.startTime);
        }, 1000);
    }

    // Freeze the clock at the final elapsed time (game ended).
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.startTime !== null) {
            this.render(performance.now() - this.startTime);
            this.startTime = null;
        }
    }

    // Clear back to the idle state for a new game/session.
    reset() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.startTime = null;
        const el = this.element;
        if (el) el.textContent = '-';
    }
}

const gameTimer = new GameTimer();

export default gameTimer;
