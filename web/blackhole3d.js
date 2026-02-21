/**
 * 3D True Interstellar Black Hole Simulation
 * Uses Three.js for 3D rendering and Custom WebGL Shaders for Gravitational Lensing.
 */

// HUD elements
const particlesVal = document.getElementById('particlesVal');
const consumedVal = document.getElementById('consumedVal');
const fpsVal = document.getElementById('fpsVal');

// HUD Toggle
const toggleHudBtn = document.getElementById('toggleHudBtn');
const hud = document.getElementById('hud');
if (toggleHudBtn && hud) {
    toggleHudBtn.addEventListener('click', () => {
        hud.classList.toggle('hidden');
    });
}

// Simulation Constants
const G = 1.0;
const M = 5e6;
const DT = 0.005;
const EVENT_HORIZON_RADIUS = 50.0;
const CONSTANT_PARTICLES = 10000; // Distinct particles instead of massive gas fluid
const RE = 52.0; // Einstein radius tightly hugs the shadow

// State
let particlesConsumed = 0;

// Three.js Setup
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, 150, 600); // Tilted view by default

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 2000;
controls.minDistance = 100;

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------
// Particle Physics Data
// ------------------------------------------------------------------
// We use a completely flat array for maximum performance.
// [x, y, z, mx, my, mz, consumed]
const particleData = new Float32Array(CONSTANT_PARTICLES * 7);

// Three.js geometry attributes
const positions = new Float32Array(CONSTANT_PARTICLES * 3);
const velocities = new Float32Array(CONSTANT_PARTICLES * 3); // Used simply for color/doppler in shader

function spawnParticle(index, isInitial) {
    let angle = Math.random() * 2 * Math.PI;
    
    let maxR = isInitial ? 1500 : 400; // Wide scatter initially
    let minR = isInitial ? 100 : 51.5;   // Touch the event horizon perfectly before vanishing
    // Bias random distribution towards the inner edge, but less so for the initial scatter
    let r = minR + Math.pow(Math.random(), isInitial ? 1.0 : 2.5) * (maxR - minR);
    
    // Position
    let px = Math.cos(angle) * r;
    // Add some 3D thickness (noise in Y), tighter towards center
    let thickness = (r / maxR) * 10.0 + 2.0; 
    let py = (Math.random() - 0.5) * thickness; 
    let pz = Math.sin(angle) * r;

    // Exact circular velocity v = sqrt(GM/r)
    let orbitSpeed = Math.sqrt((G * M) / r) * (isInitial ? 0.7 : 1.0);
    
    let velAngle = angle + (Math.PI / 2); // 90 degrees offset for orbit
    
    let mass = 2.0;
    let mx = Math.cos(velAngle) * orbitSpeed * mass;
    let my = (Math.random() - 0.5) * (orbitSpeed * 0.1); // slight vertical wobble
    let mz = Math.sin(velAngle) * orbitSpeed * mass;

    // Jitter
    mx *= (0.98 + Math.random() * 0.04);
    mz *= (0.98 + Math.random() * 0.04);

    let offset = index * 7;
    particleData[offset] = px;
    particleData[offset+1] = py;
    particleData[offset+2] = pz;
    particleData[offset+3] = mx;
    particleData[offset+4] = my;
    particleData[offset+5] = mz;
    particleData[offset+6] = 0; // consumed = false
}

for (let i = 0; i < CONSTANT_PARTICLES; i++) {
    spawnParticle(i, true);
}

// ------------------------------------------------------------------
// Custom Shaders (The Interstellar Lensing Magic)
// ------------------------------------------------------------------

const vertexShader = `
    uniform float r_einstein;
    uniform float r_shadow;
    uniform float isSecondary;

    attribute vec3 velocity;
    varying vec3 vVelocity;
    varying float vDoppler;
    varying float vIntensity;

    void main() {
        vVelocity = velocity;

        vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
        // Prevent division by zero
        float depth = max(-viewPos.z, 0.1); 
        
        vec4 bhViewPos = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float bhDepth = -bhViewPos.z;

        // PROJECT TO LENS PLANE: 
        // This is the absolute key to true 3D optics. Particles closer to camera 
        // have a wider projected spread at the black hole depth.
        vec2 u = viewPos.xy - bhViewPos.xy; 
        float ratio = bhDepth / depth;
        vec2 u_lens = u * ratio;
        
        float beta = length(u_lens);
        beta = max(beta, 0.001); 
        vec2 dir = u_lens / beta;
        
        float r = beta; // Unlensed by default
        vIntensity = 1.0;

        if (isSecondary > 0.5) {
            // SECONDARY IMAGE (The halos under the black hole)
            if (depth > bhDepth) { 
                r = 0.5 * (sqrt(beta*beta + 4.0 * r_einstein * r_einstein) - beta);
                r *= 0.98; // Fine-tune to hug the shadow
                dir = -dir; 
                vIntensity = 0.3; // Halos inherently dimmer
                
                if (r < r_shadow * 0.95) {
                    vIntensity = 0.0; // Cull inside shadow
                }
            } else {
                vIntensity = 0.0; 
            }
        } else {
            // PRIMARY IMAGE
            if (depth > bhDepth) {
                // Light passing over/around the black hole
                r = 0.5 * (beta + sqrt(beta*beta + 4.0 * r_einstein * r_einstein));
            }
        }

        // Apply warped coordinates in the lens plane
        vec2 finalXY = bhViewPos.xy + dir * r;
        
        // Force Z to match black hole so Three.js renders them perfectly flat on top of the shadow
        vec4 finalViewPos = vec4(finalXY, bhViewPos.z, 1.0);

        vec3 viewVel = normalize(normalMatrix * velocity);
        vDoppler = viewVel.z; 

        gl_Position = projectionMatrix * finalViewPos;
        
        // Scale point size inversely with actual depth to restore true 3D perspective sizing!
        float baseSize = 4.0;
        gl_PointSize = baseSize * (1000.0 / depth); // Use actual depth for realistic scaling
    }
`;

const fragmentShader = `
    varying float vDoppler;
    varying float vVelocity;
    varying float vIntensity;

    void main() {
        if (vIntensity <= 0.01) discard;

        // Base color (Hot accretion disk)
        vec3 color = vec3(1.0, 0.6, 0.2); 

        // DOPPLER SHIFT
        float dopplerEffect = vDoppler * 2.5; 
        
        float brightness = 1.0 + dopplerEffect;
        brightness = clamp(brightness, 0.05, 5.0);

        if (dopplerEffect > 0.0) {
            color = mix(color, vec3(0.8, 0.9, 1.0), dopplerEffect * 0.9);
        } else {
            color = mix(color, vec3(0.5, 0.1, 0.0), -dopplerEffect * 0.9);
        }

        // Extremely soft, fat point for maximum volumetric light bleeding
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distSq = dot(coord, coord);
        if(distSq > 0.25) discard;
        
        // Sharper Gaussian falloff for distinct bright points
        float alpha = exp(-distSq * 10.0) * brightness * vIntensity;

        gl_FragColor = vec4(color, alpha);
    }
`;

// ------------------------------------------------------------------
// Three.js Objects setup
// ------------------------------------------------------------------
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

// Primary Material
const materialPrimary = new THREE.ShaderMaterial({
    uniforms: {
        r_einstein: { value: RE },
        r_shadow: { value: EVENT_HORIZON_RADIUS },
        isSecondary: { value: 0.0 }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true
});

// Secondary Material (The Lensed Halos)
const materialSecondary = new THREE.ShaderMaterial({
    uniforms: {
        r_einstein: { value: RE },
        r_shadow: { value: EVENT_HORIZON_RADIUS },
        isSecondary: { value: 1.0 }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false, // Don't write depth, let everything stack
    transparent: true
});

// We create TWO point clouds sharing the SAME geometry data!
// This means we only run the physics loop once globally, and the GPU handles 
// rendering the primary and lensed ghost perfectly.
const pointsPrimary = new THREE.Points(geometry, materialPrimary);
const pointsSecondary = new THREE.Points(geometry, materialSecondary);

scene.add(pointsPrimary);
scene.add(pointsSecondary);

// --- The Black Hole Shadow ---
const shadowGeo = new THREE.SphereGeometry(EVENT_HORIZON_RADIUS * 0.95, 32, 32);
const shadowMat = new THREE.MeshBasicMaterial({ 
    color: 0x000000,
    depthTest: false, // Disable depth testing completely
    depthWrite: false // Do not write to depth buffer
});
const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
// Draw shadow FIRST (render order 0 or lower), then particles over it (render order > 0)
shadowMesh.renderOrder = -1; 
pointsPrimary.renderOrder = 1;
pointsSecondary.renderOrder = 2;
scene.add(shadowMesh);

// --- Photon Ring Glow (Simple sprite behind shadow) ---
// To give it that nice purple/white edge glow
const canvasGlow = document.createElement('canvas');
canvasGlow.width = 256;
canvasGlow.height = 256;
const ctxGlow = canvasGlow.getContext('2d');
const gradient = ctxGlow.createRadialGradient(128, 128, 50, 128, 128, 128);
gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Middle is fully transparent so the shadow remains perfectly black!
gradient.addColorStop(0.1, 'rgba(255, 200, 100, 0.4)');
gradient.addColorStop(0.4, 'rgba(100, 50, 200, 0.1)');
gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
ctxGlow.fillStyle = gradient;
ctxGlow.fillRect(0, 0, 256, 256);

const glowTex = new THREE.CanvasTexture(canvasGlow);
const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true });
const glowSprite = new THREE.Sprite(glowMat);
glowSprite.scale.set(EVENT_HORIZON_RADIUS * 4.5, EVENT_HORIZON_RADIUS * 4.5, 1);
glowSprite.renderOrder = -2; // Deepest background glow
scene.add(glowSprite);

// ------------------------------------------------------------------
// Main Loop
// ------------------------------------------------------------------
let lastFpsTime = performance.now();
let framesThisSecond = 0;

function updatePhysics() {
    let posArr = geometry.attributes.position.array;
    let velArr = geometry.attributes.velocity.array;
    let mass = 2.0;

    for (let i = 0; i < CONSTANT_PARTICLES; i++) {
        let offset = i * 7;
        let consumed = particleData[offset+6];

        if (consumed) continue;

        let px = particleData[offset];
        let py = particleData[offset+1];
        let pz = particleData[offset+2];
        let mx = particleData[offset+3];
        let my = particleData[offset+4];
        let mz = particleData[offset+5];

        let distSq = px*px + py*py + pz*pz;
        let hyp = Math.sqrt(distSq);

        if (hyp < EVENT_HORIZON_RADIUS) {
            particleData[offset+6] = 1; // consumed
            particlesConsumed++;
            // Respawn
            spawnParticle(i, false);
            continue;
        }

        // 3D Newtonian Gravity F = GmM / r^2
        let force = (G * mass * M) / distSq;
        
        // Direction vector towards (0,0,0)
        let dx = -px / hyp;
        let dy = -py / hyp;
        let dz = -pz / hyp;

        let fx = force * dx;
        let fy = force * dy;
        let fz = force * dz;

        mx += fx * DT;
        my += fy * DT;
        mz += fz * DT;

        px += (mx / mass) * DT;
        py += (my / mass) * DT;
        pz += (mz / mass) * DT;

        // Write back
        particleData[offset] = px;
        particleData[offset+1] = py;
        particleData[offset+2] = pz;
        particleData[offset+3] = mx;
        particleData[offset+4] = my;
        particleData[offset+5] = mz;

        // Update Three.js Arrays
        let pOffset = i * 3;
        posArr[pOffset] = px;
        posArr[pOffset+1] = py;
        posArr[pOffset+2] = pz;
        
        velArr[pOffset] = mx / mass;
        velArr[pOffset+1] = my / mass;
        velArr[pOffset+2] = mz / mass;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.velocity.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);

    updatePhysics();

    controls.update();

    // The glow sprite should always face camera, Sprites do this automatically
    
    renderer.render(scene, camera);

    // FPS
    framesThisSecond++;
    let now = performance.now();
    if (now - lastFpsTime >= 1000) {
        fpsVal.innerText = framesThisSecond;
        particlesVal.innerText = CONSTANT_PARTICLES; 
        consumedVal.innerText = particlesConsumed;
        framesThisSecond = 0;
        lastFpsTime = now;
    }
}

animate();
