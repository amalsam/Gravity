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
let currentDT = 0.0003;
const BASE_DT = 0.0003;

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
        hintEl.innerHTML = "<strong>Left Side:</strong> Drag Camera <br> <strong>Right Side:</strong> Tap to Spawn";
        document.querySelector('.mobile-only-hint').style.display = 'block';
        hintEl.style.display = 'none';

        // Auto-hide UI on load for mobile
        if(particles.length === 0) {
            uiPanel.classList.add('hidden');
            uiPanel.style.pointerEvents = 'none';
        }
    } else {
        document.querySelector('.mobile-only-hint').style.display = 'none';
        hintEl.style.display = 'block';
        hintEl.innerHTML = "<strong>Keys 1-3 or Ctrl+Click</strong> to spawn";
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// UI Toggles
toggleUiBtn.addEventListener('click', () => {
    uiPanel.classList.toggle('hidden');
    // Prevent hidden UI from blocking touches
    if (uiPanel.classList.contains('hidden')) {
        uiPanel.style.pointerEvents = 'none';
    } else {
        uiPanel.style.pointerEvents = 'auto';
    }
});

// ------------------------------------------------------------------
// Particle Logic (True 3D)
// ------------------------------------------------------------------
let currentSpawnRadius = 10;

class Particle {
    constructor(x, y, z, radius = currentSpawnRadius) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = radius;
        this.mass = (radius / 10) * 2;
        
        this.g = G;
        this.mx = 0;
        this.my = 0;
        this.mz = 0;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    // Calculates the force inflicted BY exactly one other target in 3D
    applyForceFrom(otherParticle, Mstr) {
        let dx = otherParticle.x - this.x;
        let dy = otherParticle.y - this.y;
        let dz = otherParticle.z - this.z;
        let distSq = dx * dx + dy * dy + dz * dz;
        let hyp = Math.sqrt(distSq);

        let minDistance = this.radius + otherParticle.radius;

        // Gravity applies if they aren't touching
        if (hyp > minDistance) {
            let softening = 50; 
            let force = (this.g * this.mass * Mstr) / (distSq + softening); 
            
            this.mx += force * (dx / hyp) * currentDT;
            this.my += force * (dy / hyp) * currentDT;
            this.mz += force * (dz / hyp) * currentDT;
        }
    }

    step() {
        const drag = 0.9995;
        this.mx *= drag; this.my *= drag; this.mz *= drag;
        
        this.x += (this.mx / this.mass) * currentDT;
        this.y += (this.my / this.mass) * currentDT;
        this.z += (this.mz / this.mass) * currentDT;
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

function generateCircle(worldX, worldY, worldZ) {
    for (let i = 0; i < 10; i++) {
        let p = new Particle(
            worldX + (Math.random()-0.5)*40,
            worldY + (Math.random()-0.5)*40,
            worldZ + (Math.random()-0.5)*40,
            currentSpawnRadius
        );
        attemptAddParticle(p);
    }
}

let currentMode = 'single';
const modeBtns = { single: document.getElementById('btnSingle'), circle: document.getElementById('btnCircle') };
function setMode(mode) {
    currentMode = mode;
    Object.values(modeBtns).forEach(btn => btn?.classList.remove('active'));
    if(modeBtns[mode]) modeBtns[mode].classList.add('active');
}
if(modeBtns.single) modeBtns.single.addEventListener('click', () => setMode('single'));
if(modeBtns.circle) modeBtns.circle.addEventListener('click', () => setMode('circle'));

document.getElementById('btnClear')?.addEventListener('click', () => { particles = []; });

const sizeSlider = document.getElementById('sizeSlider');
const sizeVal = document.getElementById('sizeVal');
if(sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
        currentSpawnRadius = parseInt(e.target.value);
        if(sizeVal) sizeVal.innerText = currentSpawnRadius;
    });
}

const speedSlider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
if(speedSlider) {
    speedSlider.addEventListener('input', (e) => {
        let speedMult = parseFloat(e.target.value);
        currentDT = BASE_DT * speedMult;
        if(speedVal) speedVal.innerText = speedMult.toFixed(1);
    });
}

// Camera Globals & Raycasting
let camX, camY, camZ;
let fwdX, fwdY, fwdZ;
let rightX=1, rightY=0, rightZ=0;
let upX=0, upY=1, upZ=0;
const fov = 800;
let cameraAngleX = 0;
let cameraAngleY = 0;
let isDraggingCamera = false;
let lastMouseX = 0, lastMouseY = 0;

function handlePlacement(screenX, screenY) {
    const nx = screenX - width / 2;
    const ny = screenY - height / 2;

    let rayDirX = nx * rightX + ny * upX + fov * fwdX;
    let rayDirY = nx * rightY + ny * upY + fov * fwdY;
    let rayDirZ = nx * rightZ + ny * upZ + fov * fwdZ;
    let rayMag = Math.sqrt(rayDirX*rayDirX + rayDirY*rayDirY + rayDirZ*rayDirZ);
    rayDirX /= rayMag; rayDirY /= rayMag; rayDirZ /= rayMag;

    let absoluteTargetZ = 1000; 
    let t = (absoluteTargetZ - camZ) / rayDirZ;
    if (t < 0 || Math.abs(rayDirZ) < 0.001) t = 1000;

    let worldX = camX + t * rayDirX;
    let worldY = camY + t * rayDirY;
    let worldZ = camZ + t * rayDirZ;

    if (currentMode === 'single') attemptAddParticle(new Particle(worldX, worldY, worldZ, currentSpawnRadius));
    else if (currentMode === 'circle') generateCircle(worldX, worldY, worldZ);
}

// Desktop Mouse
window.addEventListener('mousedown', (e) => {
    if (e.target.tagName.toLowerCase() !== 'canvas') return;
    if (e.shiftKey || e.button === 1 || e.button === 2) {
        isDraggingCamera = true;
    } else {
        handlePlacement(e.clientX, e.clientY);
        isDraggingCamera = true; 
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});
window.addEventListener('mousemove', (e) => {
    if (isDraggingCamera) {
        cameraAngleX -= (e.clientX - lastMouseX) * 0.005;
        cameraAngleY += (e.clientY - lastMouseY) * 0.005;
        cameraAngleY = Math.max(-1.5, Math.min(1.5, cameraAngleY));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});
window.addEventListener('mouseup', () => { isDraggingCamera = false; });

// Mobile Touch (Split Screen Controls)
let leftTouchId = null;
let rightTouchId = null;
let lastLeftTouchX = 0;
let lastLeftTouchY = 0;

window.addEventListener('touchstart', (e) => {
    if (e.target.tagName.toLowerCase() !== 'canvas') return;
    e.preventDefault(); // Prevent scrolling
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        
        // Left half of screen: Camera Joystick
        if (touch.clientX < width / 2 && leftTouchId === null) {
            leftTouchId = touch.identifier;
            lastLeftTouchX = touch.clientX;
            lastLeftTouchY = touch.clientY;
        } 
        // Right half of screen: Spawn Particles
        else if (touch.clientX >= width / 2 && rightTouchId === null) {
            rightTouchId = touch.identifier;
            handlePlacement(touch.clientX, touch.clientY);
        }
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (e.target.tagName.toLowerCase() !== 'canvas') return;
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        
        // Handle Camera Rotation on Left side drag
        if (touch.identifier === leftTouchId) {
            cameraAngleX -= (touch.clientX - lastLeftTouchX) * 0.01;
            cameraAngleY += (touch.clientY - lastLeftTouchY) * 0.01;
            cameraAngleY = Math.max(-1.5, Math.min(1.5, cameraAngleY)); // Limit up/down
            lastLeftTouchX = touch.clientX;
            lastLeftTouchY = touch.clientY;
        }
        // Optional: Can enable drag-to-spawn on right side here if desired
        // else if (touch.identifier === rightTouchId) {
        //     handlePlacement(touch.clientX, touch.clientY);
        // }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        if (touch.identifier === leftTouchId) leftTouchId = null;
        if (touch.identifier === rightTouchId) rightTouchId = null;
    }
});
window.addEventListener('touchcancel', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        if (touch.identifier === leftTouchId) leftTouchId = null;
        if (touch.identifier === rightTouchId) rightTouchId = null;
    }
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

            // --- 3D Collision Handling ---
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let dz = p2.z - p1.z;
            let distSq = dx*dx + dy*dy + dz*dz;
            let minDistance = p1.radius + p2.radius;

            if (distSq < minDistance*minDistance && distSq > 0) {
                let dist = Math.sqrt(distSq);
                let overlap = minDistance - dist;
                let nx = dx / dist, ny = dy / dist, nz = dz / dist;
                
                let totalMass = p1.mass + p2.mass;
                let ratio1 = p2.mass / totalMass;
                let ratio2 = p1.mass / totalMass;

                p1.x -= nx * overlap * ratio1;
                p1.y -= ny * overlap * ratio1;
                p1.z -= nz * overlap * ratio1;
                
                p2.x += nx * overlap * ratio2;
                p2.y += ny * overlap * ratio2;
                p2.z += nz * overlap * ratio2;

                let v1x = p1.mx / p1.mass, v1y = p1.my / p1.mass, v1z = p1.mz / p1.mass;
                let v2x = p2.mx / p2.mass, v2y = p2.my / p2.mass, v2z = p2.mz / p2.mass;
                let rvx = v2x - v1x, rvy = v2y - v1y, rvz = v2z - v1z;
                let velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

                if (velAlongNormal < 0) {
                    let e = 0.8; 
                    let j_impulse = -(1 + e) * velAlongNormal;
                    j_impulse /= (1 / p1.mass + 1 / p2.mass);
                    
                    let impulseX = j_impulse * nx;
                    let impulseY = j_impulse * ny;
                    let impulseZ = j_impulse * nz;

                    p1.mx -= impulseX; 
                    p1.my -= impulseY;
                    p1.mz -= impulseZ;
                    p2.mx += impulseX;
                    p2.my += impulseY;
                    p2.mz += impulseZ;
                }
            }
        }
    }

    // --- 3D Camera & Rendering ---
    let centerTargetX = width / 2;
    let centerTargetY = height / 2;
    let centerTargetZ = 1000;
    
    let radius = 1500;
    camX = centerTargetX + radius * Math.cos(cameraAngleY) * Math.sin(cameraAngleX);
    camY = centerTargetY + radius * Math.sin(cameraAngleY);
    camZ = centerTargetZ + radius * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);

    fwdX = centerTargetX - camX;
    fwdY = centerTargetY - camY;
    fwdZ = centerTargetZ - camZ;
    let fwdMag = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
    fwdX /= fwdMag; fwdY /= fwdMag; fwdZ /= fwdMag;
    
    let tempUpX = 0, tempUpY = -1, tempUpZ = 0; // standard Y is down on canvas
    rightX = tempUpY * fwdZ - tempUpZ * fwdY;
    rightY = tempUpZ * fwdX - tempUpX * fwdZ;
    rightZ = tempUpX * fwdY - tempUpY * fwdX;
    let rightMag = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
    if(rightMag > 0) { rightX /= rightMag; rightY /= rightMag; rightZ /= rightMag; }

    upX = fwdY * rightZ - fwdZ * rightY;
    upY = fwdZ * rightX - fwdX * rightZ;
    upZ = fwdX * rightY - fwdY * rightX;

    for (let i = 0; i < len; i++) {
        let p = particles[i];
        p.step();
        p.distToCam = Math.sqrt((p.x-camX)**2 + (p.y-camY)**2 + (p.z-camZ)**2);
    }
    
    particles.sort((a, b) => b.distToCam - a.distToCam); // Painter's algorithm

    for (let i = 0; i < len; i++) {
        let p = particles[i];
        let dx = p.x - camX, dy = p.y - camY, dz = p.z - camZ;
        
        let depth = dx * fwdX + dy * fwdY + dz * fwdZ;
        if (depth < 10) continue; // Behind camera
        
        let scale = fov / depth; 
        let drawnRadius = p.radius * scale;
        if (drawnRadius < 0.2) continue; // Too small
        
        let projX = dx * rightX + dy * rightY + dz * rightZ;
        let projY = dx * upX    + dy * upY    + dz * upZ;

        let drawnX = width / 2 + projX * scale;
        let drawnY = height / 2 + projY * scale;

        ctx.globalAlpha = Math.max(0.1, Math.min(1.0, 1.2 - (depth / 3000))); 
        ctx.beginPath();
        ctx.arc(drawnX, drawnY, Math.max(drawnRadius, 1), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
    requestAnimationFrame(update);
}

requestAnimationFrame(update);
