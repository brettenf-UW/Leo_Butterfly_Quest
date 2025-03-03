// Utility functions for the game

// Load an image asynchronously
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Random number between min and max (inclusive)
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Check if two rectangles overlap
function rectsOverlap(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// Lerp (linear interpolation)
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Calculate distance between two points
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}