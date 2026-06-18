// Makes the right-hand player panel width-adjustable via a drag handle on its
// left edge. The width lives in the `--sidebar-width` CSS custom property (read
// by the .app-shell grid template); we persist it to localStorage so it sticks
// across reloads. After a resize we dispatch a window `resize` event so the map
// re-fits itself to the space that's left (the map fit logic already listens for
// resize).

const STORAGE_KEY = 'mb_sidebar_width';
const MIN_WIDTH = 256;   // px — keep bot cards usable
const MIN_MAP = 320;     // px — never let the sidebar swallow the whole map

function clampWidth(px) {
    const max = Math.max(MIN_WIDTH, window.innerWidth - MIN_MAP);
    return Math.min(max, Math.max(MIN_WIDTH, px));
}

function applyWidth(px) {
    document.documentElement.style.setProperty('--sidebar-width', `${px}px`);
}

function setupSidebarResizer() {
    const handle = document.getElementById('sidebar-resizer');
    if (!handle) return;

    // Restore a saved width (if any and still valid for this window size).
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) {
        applyWidth(clampWidth(saved));
    }

    let dragging = false;

    const onPointerMove = (event) => {
        if (!dragging) return;
        // The sidebar hugs the right edge, so its width is the distance from the
        // pointer to the right side of the window.
        const width = clampWidth(window.innerWidth - event.clientX);
        applyWidth(width);
        // Keep the map fitted live while dragging.
        window.dispatchEvent(new Event('resize'));
    };

    const onPointerUp = (event) => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        handle.releasePointerCapture?.(event.pointerId);
        const width = clampWidth(window.innerWidth - event.clientX);
        localStorage.setItem(STORAGE_KEY, String(width));
    };

    handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        handle.classList.add('dragging');
        // Suppress text selection / show the resize cursor for the whole drag.
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('lostpointercapture', () => {
        if (dragging) {
            dragging = false;
            handle.classList.remove('dragging');
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
    });

    // Double-click resets to the default width.
    handle.addEventListener('dblclick', () => {
        document.documentElement.style.removeProperty('--sidebar-width');
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event('resize'));
    });

    // If the window shrinks, re-clamp so the map keeps its minimum.
    window.addEventListener('resize', () => {
        const current = document.documentElement.style.getPropertyValue('--sidebar-width');
        const px = Number(String(current).replace('px', ''));
        if (Number.isFinite(px) && px > 0) applyWidth(clampWidth(px));
    });
}

export default setupSidebarResizer;
