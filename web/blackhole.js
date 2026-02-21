/**
 * High-Fidelity HTML5 Canvas Black Hole Simulation
 * Ported from Java 'BlackholeSimulation' with WebGL-like blending effects.
 */

const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for perf, we manage it

// HUD elements
const particlesVal = document.getElementById('particlesVal');
const consumedVal = document.getElementById('consumedVal');
const fpsVal = document.getElementById('fpsVal');
const mouseHint = document.getElementById('mouseHint');

// Simulation Constants
const TARGET_FPS = 60;
const G = 1.0;
const M = 5e6; 
const DT = 0.005; 
const EVENT_HORIZON_RADIUS = 50.0;
const CONSTANT_PARTICLES = 6000;

// Perspective variables for Gargantua equations
const TILT = 0.15; 
const SIN_TILT = Math.sin(TILT);
const COS_TILT = Math.cos(TILT);
const RE = 68.0; // Einstein radius
const R_SHADOW = 50.0; // Event horizon shadow

// State
let width, height;
let particles = [];
let particlesConsumed = 0;
let mouseInside = false;

// The Attractor
const blackholePos = { x: 0, y: 0 };

// Loop variables
let lastFrameTime = performance.now();
let framesThisSecond = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

// ------------------------------------------------------------------
// Resize Handling
// ------------------------------------------------------------------
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    if (!mouseInside) {
        blackholePos.x = width / 2;
        blackholePos.y = height / 2;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial setup

// ------------------------------------------------------------------
// Mouse & Touch Handling
// ------------------------------------------------------------------
function updatePos(clientX, clientY) {
    blackholePos.x = clientX;
    blackholePos.y = clientY;
    mouseInside = true;
    mouseHint.style.display = 'none';
}

window.addEventListener('mousemove', (e) => {
    updatePos(e.clientX, e.clientY);
});

window.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling on mobile
    if (e.touches.length > 0) {
        updatePos(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        updatePos(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

function handleLeave() {
    mouseInside = false;
    mouseHint.style.display = 'block';
    blackholePos.x = width / 2;
    blackholePos.y = height / 2;
}

window.addEventListener('mouseout', handleLeave);
window.addEventListener('touchend', handleLeave);
window.addEventListener('touchcancel', handleLeave);

// ------------------------------------------------------------------
// Particle Class
// ------------------------------------------------------------------
class BlackholeParticle {
    constructor(x, y, mx, my) {
        this.x = x;
        this.y = y;
        this.mass = 2.0;
        this.mx = mx;
        this.my = my;
        this.consumed = false;
    }

    move(centerX, centerY) {
        if (this.consumed) return;

        let dx = this.x - centerX;
        let dy = this.y - centerY;
        let distSq = dx * dx + dy * dy;
        let hyp = Math.sqrt(distSq);

        // Event Horizon
        if (hyp < EVENT_HORIZON_RADIUS) {
            this.consumed = true;
            particlesConsumed++;
            return;
        }

        // Pure Newtonian 1/r^2
        let force = (G * this.mass * M) / distSq;
        let theta = Math.atan2(centerY - this.y, centerX - this.x);

        let fx = force * Math.cos(theta);
        let fy = force * Math.sin(theta);

        this.mx += fx * DT;
        this.my += fy * DT;

        this.x += (this.mx / this.mass) * DT;
        this.y += (this.my / this.mass) * DT;
    }

    getSpeed() {
        return Math.sqrt(this.mx * this.mx + this.my * this.my) / this.mass;
    }
}

// ------------------------------------------------------------------
// Spawner
// ------------------------------------------------------------------
function spawnParticle(isInitial = false) {
    let angle = Math.random() * 2 * Math.PI;
    
    // If it's the initial start, scatter them across the entire screen so it looks like it's sweeping through space.
    // If it's respawning, spawn them in a disk a bit closer.
    let maxR = isInitial ? Math.max(width, height) : 800;
    let minR = isInitial ? 100 : 70;
    
    let r = minR + Math.pow(Math.random(), isInitial ? 1.0 : 1.5) * (maxR - minR);
    
    let px = blackholePos.x + Math.cos(angle) * r;
    let py = blackholePos.y + Math.sin(angle) * r;

    // Exact circular velocity v = sqrt(GM/r)
    // Reduce the initial orbital speed slightly for scattered particles so they fall in more dynamically
    let orbitSpeed = Math.sqrt((G * M) / r) * (isInitial ? 0.7 : 1.0);
    
    let velAngle = angle + (Math.PI / 2);
    
    let mx = Math.cos(velAngle) * orbitSpeed * 2.0;
    let my = Math.sin(velAngle) * orbitSpeed * 2.0;

    // Jitter momentum
    mx *= (0.98 + Math.random() * 0.04);
    my *= (0.98 + Math.random() * 0.04);

    particles.push(new BlackholeParticle(px, py, mx, my));
}

// Color mapper with Doppler Beaming
function getParticleColorStr(speed, isSecondary, vz) {
    // Determine base color purely on physical speed
    let r, g, b;
    if (speed > 220) {
        r=220; g=240; b=255;
    } else if (speed > 150) {
        r=255; g=230; b=180;
    } else if (speed > 100) {
        r=255; g=150; b=50;
    } else {
        r=180; g=60; b=30;
    }

    // Apply Relativistic Doppler Beaming
    // Approaching particles (vz > 0) get brighter and bluer
    // Receding particles (vz < 0) get dimmer and redder
    
    // Normalize vz roughly between -1.0 and 1.0 (assuming orbit speeds around 200)
    let dopplerFactor = (vz / 200.0); 
    
    // Brightness Modulation (Relativistic Beaming)
    // Approaching = up to 2.5x brighter, Receding = down to 0.1x dimmer
    let brightnessMultiplier = 1.0 + dopplerFactor * 1.5;
    if (brightnessMultiplier < 0.1) brightnessMultiplier = 0.1;

    // Color Shift (Doppler Shift)
    // Approaching = add blue, subtract red
    // Receding = add red, subtract blue
    let shiftAmt = dopplerFactor * 100;
    
    r = Math.min(255, Math.max(0, r - shiftAmt));
    b = Math.min(255, Math.max(0, b + shiftAmt * 1.5)); // Blue shifts harder

    // Alpha depends on if it's the lensed ghost or primary disk
    let baseAlpha = isSecondary ? 0.3 : 0.8; 
    let finalAlpha = baseAlpha * brightnessMultiplier;

    return `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${finalAlpha.toFixed(2)})`;
}

// ------------------------------------------------------------------
// Main Loop
// ------------------------------------------------------------------
function init() {
    for (let i = 0; i < CONSTANT_PARTICLES; i++) {
        spawnParticle(true); // Flag for initial scatter
    }
    requestAnimationFrame(update);
}

function update(timestamp) {
    // --- FPS Calculation ---
    framesThisSecond++;
    if (timestamp - lastFpsTime >= 1000) {
        currentFps = framesThisSecond;
        framesThisSecond = 0;
        lastFpsTime = timestamp;
        
        // Update HUD
        fpsVal.innerText = currentFps;
        particlesVal.innerText = particles.length;
        consumedVal.innerText = particlesConsumed;
    }

    // --- Physics Pass ---
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.move(blackholePos.x, blackholePos.y);

        if (p.consumed) {
            particles.splice(i, 1);
            spawnParticle(); 
        }
    }

    // --- Rendering Pass ---

    // 1. Clear with motion blur trail (Source-Over)
    // A slightly darker trail to make the additive glow pop harder
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
    ctx.fillRect(0, 0, width, height);

    // 2. Additive blending for gorgeous light stacking
    ctx.globalCompositeOperation = 'lighter';

    // --- PASS 1: Secondary Images (Gravitational Halos) ---
    for (let p of particles) {
        let px = p.x - blackholePos.x;
        let pz = p.y - blackholePos.y; 
        
        let u = px;
        let v = pz * SIN_TILT;
        let w = pz * COS_TILT; 
        
        if (w > 0) { // Behind
            let beta = Math.sqrt(u*u + v*v);
            if (beta < 0.1) beta = 0.1;
            
            let phi = Math.atan2(v, u);
            // Modified to pull the ghost closer to the shadow mimicking the Oseiskar tracing
            let r_minus = 0.5 * (Math.sqrt(beta*beta + 4 * RE * RE) - beta) * 0.9;
            
            if (r_minus > R_SHADOW * 0.9) {
                // Line of sight velocity: If it's moving towards +X on the screen while tilted, it's approaching. 
                // Since our orbit is counter-clockwise, left side approaches, right side recedes.
                let vz = -p.my * COS_TILT; 
                
                let renderX = blackholePos.x + r_minus * Math.cos(phi + Math.PI);
                let renderY = blackholePos.y + r_minus * Math.sin(phi + Math.PI);
                
                ctx.fillStyle = getParticleColorStr(p.getSpeed(), true, vz);
                ctx.fillRect(renderX, renderY, 2, 2);
            }
        }
    }

    // --- PASS 2: Black Hole Shadow & Photon Ring ---
    ctx.globalCompositeOperation = 'source-over'; // Must draw pure black over the trails
    
    ctx.beginPath();
    ctx.arc(blackholePos.x, blackholePos.y, R_SHADOW * 0.95, 0, Math.PI * 2); // Slightly smaller shadow to let the ring bleed in
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter'; // Back to additive for rings

    // Photon ring glow using Radial Gradient
    let glowRad = R_SHADOW * 2.0;
    let grad = ctx.createRadialGradient(
        blackholePos.x, blackholePos.y, R_SHADOW * 0.95, 
        blackholePos.x, blackholePos.y, glowRad
    );
    grad.addColorStop(0.0, 'rgba(255, 230, 200, 0.6)'); // Intense hot boundary
    grad.addColorStop(0.2, 'rgba(200, 150, 100, 0.3)'); // Orange/yellow burn
    grad.addColorStop(0.5, 'rgba(100, 50, 200, 0.05)');  // Purple extended glow
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    
    ctx.beginPath();
    ctx.arc(blackholePos.x, blackholePos.y, glowRad, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Sharp white edge exactly on the event horizon
    ctx.beginPath();
    ctx.arc(blackholePos.x, blackholePos.y, R_SHADOW * 0.95, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Redraw the black hole shadow over the gradient to ensure the center is perfectly black
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(blackholePos.x, blackholePos.y, R_SHADOW * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Back to additive blending for primary images (the main accretion disk)
    ctx.globalCompositeOperation = 'lighter';

    // --- PASS 3: Primary Images (Accretion Disk proper) ---
    for (let p of particles) {
        let px = p.x - blackholePos.x;
        let pz = p.y - blackholePos.y;
        
        let u = px;
        let v = pz * SIN_TILT;
        
        let beta = Math.sqrt(u*u + v*v);
        if (beta < 0.1) beta = 0.1;
        
        let phi = Math.atan2(v, u);
        
        let r_plus = 0.5 * (beta + Math.sqrt(beta*beta + 4 * RE * RE));
        
        let vz = -p.my * COS_TILT; // Approximation for Line of Sight
        
        let renderX = blackholePos.x + r_plus * Math.cos(phi);
        let renderY = blackholePos.y + r_plus * Math.sin(phi);
        
        let speed = p.getSpeed();
        ctx.fillStyle = getParticleColorStr(speed, false, vz);
        
        let size = speed > 220 ? 3 : 2; // Hotter particles draw slightly larger
        ctx.fillRect(renderX - size/2, renderY - size/2, size, size);
        
        // Aura for extremely fast particles
        if (speed > 220) {
            ctx.fillStyle = 'rgba(220, 240, 255, 0.1)';
            ctx.fillRect(renderX - 3, renderY - 3, 6, 6);
        }
    }

    requestAnimationFrame(update);
}

// Start
init();
