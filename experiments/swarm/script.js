/**
 * High-Performance Swarm Sandbox
 * Based on the Python Pygame N-Body simulation.
 * Adapted for HTML5 Canvas with mobile controls.
 */

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// UI Elements
const particleCount = document.getElementById('particleCount');
const fpsCount = document.getElementById('fpsCount');
const toggleUiBtn = document.getElementById('toggleUiBtn');
const uiPanel = document.getElementById('uiPanel');
const hintEl = document.getElementById('controlHint');

// Simulation Constants
let G = 1.0;
const M = 10e7; // Custom mass
let currentDT = 0.000006;
const BASE_DT = 0.000006;

// To ensure 60fps in pure JS for an O(N^2) algorithm, we should roughly cap particle count around 1000-1500 directly interacting particles on average machines.
const MAX_PARTICLES = 1500;

const COLORS = [
    'rgb(255, 0, 0)',    // Red
    'rgb(0, 255, 0)',    // Green
    'rgb(0, 0, 255)',    // Blue
];

let width, height;
let particles = [];
let framesThisSecond = 0;
let lastFpsTime = performance.now();
let isMobile = false;

// Geometry/Screen
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Check mobile
    isMobile = width <= 600;
    if (isMobile) {
        hintEl.innerText = "Tap screen to spawn particles";
        // Auto-hide UI on load for mobile
        if(particles.length === 0) {
            uiPanel.classList.add('hidden');
        }
    } else {
        hintEl.innerHTML = "<strong>Keys 1-3 or Ctrl+Click</strong> to spawn";
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// UI Toggles
toggleUiBtn.addEventListener('click', () => {
    uiPanel.classList.toggle('hidden');
});

// ------------------------------------------------------------------
// Particle Logic
// ------------------------------------------------------------------
let currentSpawnRadius = 10;
let currentSpawnMass = 2; // Base mass

class Particle {
    constructor(x, y, radius = currentSpawnRadius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        // Mass scales with the area (or directly with radius if preferred)
        // A radius of 10 gives mass ~2. 
        this.mass = (radius / 10) * 2;
        
        this.g = G;
        this.mx = 0;
        this.my = 0;
        this.dt = currentDT; // Used as base, but we will rely on global currentDT inside loops.
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    // Calculates the force inflicted BY exactly one other target (x2, y2)
    applyForceFrom(otherParticle, Mstr) {
        let dx = otherParticle.x - this.x;
        let dy = otherParticle.y - this.y;
        let distSq = dx * dx + dy * dy;
        let hyp = Math.sqrt(distSq);

        let minDistance = this.radius + otherParticle.radius;

        // Gravity only applies if they aren't touching (or we get infinite acceleration)
        if (hyp > minDistance && hyp > 2) {
            let theta = Math.atan2(dy, dx);
            let force = (this.g * this.mass * Mstr) / hyp; 
            
            let fx = force * Math.cos(theta);
            let fy = force * Math.sin(theta);
            
            this.mx += fx * currentDT;
            this.my += fy * currentDT;
        }
    }

    step() {
        this.x += (this.mx / this.mass) * currentDT;
        this.y += (this.my / this.mass) * currentDT;
    }
}

// ------------------------------------------------------------------
// Spawners 
// ------------------------------------------------------------------
function attemptAddParticle(p) {
    if (particles.length > MAX_PARTICLES) {
        particles.shift(); 
    }
    particles.push(p);
}

function generateCircle(centerX, centerY) {
    for (let i = 0; i < 10; i++) {
        let ang = Math.random() * 2 * Math.PI;
        let hyp = Math.sqrt(Math.random()) * 20;
        let x = centerX + Math.cos(ang) * hyp;
        let y = centerY + Math.sin(ang) * hyp;
        attemptAddParticle(new Particle(x, y, currentSpawnRadius));
    }
}

// ------------------------------------------------------------------
// Input Handling & Placement Modes
// ------------------------------------------------------------------
let currentMode = 'single'; // 'single', 'circle'

const modeBtns = {
    single: document.getElementById('btnSingle'),
    circle: document.getElementById('btnCircle')
};

function setMode(mode) {
    currentMode = mode;
    Object.values(modeBtns).forEach(btn => btn.classList.remove('active'));
    modeBtns[mode].classList.add('active');
}

modeBtns.single.addEventListener('click', () => setMode('single'));
modeBtns.circle.addEventListener('click', () => setMode('circle'));

document.getElementById('btnClear').addEventListener('click', () => { particles = []; });

// Size Slider
const sizeSlider = document.getElementById('sizeSlider');
const sizeVal = document.getElementById('sizeVal');
sizeSlider.addEventListener('input', (e) => {
    currentSpawnRadius = parseInt(e.target.value);
    sizeVal.innerText = currentSpawnRadius;
});

// Speed Slider
const speedSlider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
speedSlider.addEventListener('input', (e) => {
    let speedMult = parseFloat(e.target.value);
    currentDT = BASE_DT * speedMult;
    speedVal.innerText = speedMult.toFixed(1);
});

function handlePlacement(x, y) {
    if (currentMode === 'single') {
        attemptAddParticle(new Particle(x, y, currentSpawnRadius));
    } else if (currentMode === 'circle') {
        generateCircle(x, y);
    }
}

// Global Mouse Down (Desktop)
window.addEventListener('mousedown', (e) => {
    // Only execute if they clicked the canvas
    if (e.target.tagName.toLowerCase() !== 'canvas') return;
    handlePlacement(e.clientX, e.clientY);
});

// Mobile Touch
window.addEventListener('touchstart', (e) => {
    if (e.target.tagName.toLowerCase() !== 'canvas') return;
    // Handle only the first touch to prevent massive spam on multi-touch
    handlePlacement(e.touches[0].clientX, e.touches[0].clientY);
});

// ------------------------------------------------------------------
// Main Loop
// O(N^2) N-Body Interaction
// ------------------------------------------------------------------
function update(timestamp) {
    // --- FPS Math ---
    framesThisSecond++;
    if (timestamp - lastFpsTime >= 1000) {
        fpsCount.innerText = framesThisSecond;
        particleCount.innerText = particles.length;
        framesThisSecond = 0;
        lastFpsTime = timestamp;
    }

    // --- Background (Python matched) ---
    // Pure fast clear.
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(0, 0, width, height);

    let len = particles.length;
    
    // --- Physics Pass [O(N^2)] ---
    for (let i = 0; i < len; i++) {
        let p1 = particles[i];
        p1.g = G; // Update universal constant every frame
        
        for (let j = i + 1; j < len; j++) {
            let p2 = particles[j];
            
            p1.applyForceFrom(p2, M);
            p2.applyForceFrom(p1, M);

            // --- Collision Handling ---
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let distSq = dx * dx + dy * dy;
            let dist = Math.sqrt(distSq);
            let minDistance = p1.radius + p2.radius;

            if (dist < minDistance && dist !== 0) {
                // Resolve overlap directly to prevent sticking
                let overlap = minDistance - dist;
                let nx = dx / dist; // Normal x
                let ny = dy / dist; // Normal y
                
                // Displace proportionately to mass (lighter objects move more)
                let totalMass = p1.mass + p2.mass;
                let ratio1 = p2.mass / totalMass;
                let ratio2 = p1.mass / totalMass;

                p1.x -= nx * overlap * ratio1;
                p1.y -= ny * overlap * ratio1;
                p2.x += nx * overlap * ratio2;
                p2.y += ny * overlap * ratio2;

                // Simple momentum transfer (1D perfectly elastic collision along the normal)
                // Need to convert momentum (mx, my) to velocities (vx, vy) for the math
                let v1x = p1.mx / p1.mass;
                let v1y = p1.my / p1.mass;
                let v2x = p2.mx / p2.mass;
                let v2y = p2.my / p2.mass;

                // Relative velocity
                let rvx = v2x - v1x;
                let rvy = v2y - v1y;

                // Velocity along the normal
                let velAlongNormal = rvx * nx + rvy * ny;

                // Only bounce if they are moving towards each other
                if (velAlongNormal < 0) {
                    // Restitution (1.0 = perfect elastic bounce)
                    let e = 1.0; 
                    
                    // Impulse scalar
                    let j = -(1 + e) * velAlongNormal;
                    j /= (1 / p1.mass + 1 / p2.mass);

                    // Apply impulse (Newton's Third Law: Equal and opposite forces)
                    let impulseX = j * nx;
                    let impulseY = j * ny;

                    // Directly modify momentum (mx, my) by impulse J
                    p1.mx -= impulseX; 
                    p1.my -= impulseY;
                    p2.mx += impulseX;
                    p2.my += impulseY;
                }
            }
        }
    }

    // --- Render && Move Pass ---
    for (let i = 0; i < len; i++) {
        let p = particles[i];
        p.step();
        
        // Draw the particle respecting its individual size
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }

    requestAnimationFrame(update);
}

// Start immediately (Empty sandbox)
requestAnimationFrame(update);
