const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const particleCountSpan = document.getElementById('particleCount');
const fpsCountSpan = document.getElementById('fpsCount');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Update central mass position when resized
    obj1.x = width / 2;
    obj1.y = height / 2;
}

window.addEventListener('resize', resize);

// Constants from Python Gravity.py
const G = 0.1;
const M = 10e7;
const DT = 0.001;

let particles = [];

// Central mass object
let obj1 = { x: 0, y: 0, r: 15 };

// Tracking touch/mouse position
let mouseX = 0;
let mouseY = 0;
let isDragging = false; 
let spawnMode = 'single'; // 'single', 'line1', 'circle', 'line2'

// Initialize layout
resize();

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.mass = 2;
        this.momentum_x = 500;
        this.momentum_y = 500;
        this.color = 'white';
    }

    // Equivalent to move_numba from Python
    move(x2, y2, dt) {
        let dx = x2 - this.x;
        let dy = y2 - this.y;
        let hyp = Math.sqrt(dx * dx + dy * dy);

        if (hyp < 1) {
            return;
        }

        let theta = Math.atan2(dy, dx);
        let force = (G * this.mass * M) / hyp;
        
        let force_x = force * Math.cos(theta);
        let force_y = force * Math.sin(theta);
        
        this.momentum_x += force_x * dt;
        this.momentum_y += force_y * dt;
        
        this.x += (this.momentum_x / this.mass) * dt;
        this.y += (this.momentum_y / this.mass) * dt;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
    }
}

// Generators matching Python
function generateCircle(centerX, centerY) {
    for (let i = 0; i < 100; i++) {
        let ang = Math.random() * 2 * Math.PI;
        let hyp = Math.sqrt(Math.random()) * 50; 
        let x = centerX + Math.cos(ang) * hyp;
        let y = centerY + Math.sin(ang) * hyp;
        particles.push(new Particle(x, y));
    }
}

function generateLine(y) {
    for (let i = 0; i < 100; i++) {
        let x = Math.floor(Math.random() * width);
        particles.push(new Particle(x, y));
    }
}

function generateLine2(x) {
    for (let i = 0; i < 100; i++) {
        let y = Math.floor(Math.random() * height);
        particles.push(new Particle(x, y));
    }
}

// Spawn Controller
function spawnBasedOnMode(x, y) {
    if (spawnMode === 'single') {
        particles.push(new Particle(x, y));
    } else if (spawnMode === 'line1') {
        generateLine(y);
    } else if (spawnMode === 'circle') {
        generateCircle(x, y);
    } else if (spawnMode === 'line2') {
        generateLine2(x);
    }
}

// UI Buttons
function setMode(mode, btnId) {
    spawnMode = mode;
    document.querySelectorAll('.action-buttons button').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
}

document.getElementById('btnSingle').addEventListener('click', () => setMode('single', 'btnSingle'));
document.getElementById('btnLine1').addEventListener('click', () => setMode('line1', 'btnLine1'));
document.getElementById('btnCircle').addEventListener('click', () => setMode('circle', 'btnCircle'));
document.getElementById('btnLine2').addEventListener('click', () => setMode('line2', 'btnLine2'));

// UI Toggle for Mobile
const toggleUiBtn = document.getElementById('toggleUiBtn');
const uiPanel = document.getElementById('uiPanel');
if (toggleUiBtn && uiPanel) {
    toggleUiBtn.addEventListener('click', () => {
        uiPanel.classList.toggle('hidden');
    });
}

// Input Handling (Mouse)
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (e.ctrlKey) {
        particles.push(new Particle(e.clientX, e.clientY));
    } else {
        isDragging = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
        spawnBasedOnMode(mouseX, mouseY);
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Input Handling (Touch)
canvas.addEventListener('touchstart', (e) => {
    // Canvas target directly prevents interacting with UI panel bounds that overlaps
    e.preventDefault(); 
    isDragging = true;
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
    spawnBasedOnMode(mouseX, mouseY);
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging) return;
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
}, {passive: false});

window.addEventListener('touchend', () => {
    isDragging = false;
});


// Keyboard Handling
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// FPS tracking
let lastTime = performance.now();
let frames = 0;
let fps = 0;
let lastSpawnTime = performance.now();

// Main Loop
function loop() {
    let currentTime = performance.now();
    frames++;
    
    if (currentTime - lastTime >= 1000) {
        fps = frames;
        frames = 0;
        lastTime = currentTime;
        
        // Update UI
        fpsCountSpan.innerText = fps;
        particleCountSpan.innerText = particles.length;
    }

    // Handle sustained key presses like pygame's key.get_pressed()
    if (keys['1']) generateLine(mouseY);
    if (keys['2']) generateCircle(mouseX, mouseY);
    if (keys['3']) generateLine2(mouseX);

    // Continuous spawner while dragging. Throttled slightly to prevent mobile freeze when spawning 100s per frame.
    if (isDragging) {
        if (currentTime - lastSpawnTime > 16) { // ~60 times a second max
            spawnBasedOnMode(mouseX, mouseY);
            lastSpawnTime = currentTime;
        }
    }

    // Clear background
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(0, 0, width, height);

    // Draw central mass (obj1)
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(obj1.x, obj1.y, obj1.r, 0, Math.PI * 2);
    ctx.fill();

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.move(obj1.x, obj1.y, DT);
        p.draw(ctx);
    }

    requestAnimationFrame(loop);
}

// Start simulation
requestAnimationFrame(loop);
