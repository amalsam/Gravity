// Single source of truth for every simulation on Stacklor Lab.
// Drives the home page, navigation, footer, metadata, sitemap, structured
// data (JSON-LD) and /llms.txt. Slugs are public URLs — never rename one.

export const categories = [
  {
    id: "gravity",
    name: "Gravity & orbits",
    blurb: "Newton's law of gravitation, from a single star to thousands of interacting bodies.",
  },
  {
    id: "chaos",
    name: "Chaos",
    blurb: "Deterministic systems where a tiny change in the start produces a completely different future.",
  },
  {
    id: "emergence",
    name: "Emergence",
    blurb: "Simple local rules that add up to complex group behaviour nobody programmed directly.",
  },
  {
    id: "fields",
    name: "Fields & fluids",
    blurb: "Continuous quantities — electric potential, pressure, velocity — computed in real time.",
  },
];

export const simulations = [
  {
    slug: "slingshot",
    name: "Gravity Slingshot",
    short: "Slingshot",
    category: "gravity",
    accent: "#a3e635",
    tech: "2D Game",
    isNew: true,
    tagline: "A puzzle game: bend your probe's path around planets to hit the target.",
    title: "Gravity Slingshot – Orbit Puzzle Game with Real Physics",
    description:
      "Free gravity puzzle game in your browser. Drag to launch a probe, use planets, moons and black holes for gravity assists, and reach the target in as few launches as possible. 15 levels plus a daily puzzle.",
    summary:
      "Gravity Slingshot is a physics puzzle game built on Newton's law of gravitation. Your probe is pulled by every planet, star and black hole on screen, so the straight line is rarely the right shot. You win by bending the path — the same gravity-assist technique NASA used to send Voyager past Jupiter and Saturn. Every level is deterministic and proven solvable, and the daily puzzle is the same for every player.",
    keywords: ["gravity game", "orbit puzzle game", "gravity assist simulator", "physics puzzle game", "slingshot game"],
    howTo: [
      "Drag backwards from anywhere on the canvas and release to launch the probe — the further you pull, the faster it goes.",
      "Watch the dotted preview: it shows where gravity will bend your path for the first moments of flight.",
      "Reach the glowing ring. One launch earns three stars, two launches earn two, more earn one.",
      "Clear a level to unlock the next, or try the daily puzzle — the same for everyone each day.",
    ],
    concepts: ["Gravity assist", "Newton's law of universal gravitation", "Orbital trajectories", "Velocity Verlet integration"],
    faq: [
      {
        q: "What is a gravity assist?",
        a: "A gravity assist (or slingshot) uses a planet's gravity to change a spacecraft's speed and direction without using fuel. Voyager 2 used gravity assists at Jupiter, Saturn and Uranus to reach Neptune.",
      },
      {
        q: "Is every level solvable?",
        a: "Yes. Each level, and each day's daily puzzle, is checked by a solver that simulates thousands of launch angles and strengths and only accepts levels where some shots reach the target.",
      },
      {
        q: "Why doesn't the probe go straight?",
        a: "Every body pulls on the probe with a force that grows as it gets closer (inverse-square law), so its path curves toward planets, stars and especially black holes.",
      },
    ],
  },
  {
    slug: "galaxy",
    name: "Galaxy Collider",
    short: "Galaxy Collider",
    category: "gravity",
    accent: "#e879f9",
    tech: "3D WebGL",
    isNew: true,
    tagline: "Smash two spiral galaxies together and watch tidal tails form.",
    title: "Galaxy Collision Simulation – Milky Way & Andromeda in 3D",
    description:
      "Interactive 3D galaxy collision simulation. Collide two spiral galaxies, tune mass, tilt and spin, and watch tidal tails, bridges and a final merger unfold over billions of years. Share your collision with a link.",
    summary:
      "Galaxy Collider recreates the classic Toomre & Toomre (1972) experiment: each galaxy is a massive core surrounded by a disk of stars, and the two cores fall toward each other. Stars feel both cores, so during a close pass they are flung into long tidal tails and bridges like those seen in the Antennae and Mice galaxies. An approximate dynamical-friction term drains orbital energy so the cores eventually merge into one galaxy — a likely, though not certain, fate for the Milky Way and Andromeda over the next several billion years.",
    keywords: ["galaxy collision simulation", "galaxy merger simulator", "milky way andromeda collision", "tidal tails", "antennae galaxies"],
    howTo: [
      "Pick a preset — Milky Way + Andromeda, the Antennae, the Mice, a minor flyby or a retrograde collision — or set your own mass ratio, closest approach and disk tilts.",
      "Press play and drag to orbit the camera; scroll or pinch to zoom. Scrub the timeline to rewind.",
      "Flip a galaxy to spin backwards (retrograde) and compare how much weaker its tidal tails are.",
      "Press Share to copy a link that recreates your exact collision.",
    ],
    concepts: ["Galaxy mergers", "Tidal tails", "Restricted N-body simulation", "Dynamical friction", "Retrograde vs prograde encounters"],
    faq: [
      {
        q: "Will the Milky Way collide with Andromeda?",
        a: "Andromeda is approaching at about 110 km/s. Current estimates give roughly even odds of a merger within the next 5–10 billion years. Stars almost never hit each other; the galaxies' shapes are rearranged by gravity.",
      },
      {
        q: "What causes tidal tails?",
        a: "During a close pass, stars on the near side of a disk are pulled harder than the core and stars on the far side are pulled less. That stretch flings stars out into long, curved tails. Disks spinning in the same direction as the encounter (prograde) form the strongest tails.",
      },
      {
        q: "How accurate is this simulation?",
        a: "It follows the Toomre & Toomre approach: stars are test particles moving under the gravity of two cores, which is enough to reproduce tails and bridges. Full research simulations also model dark matter halos, gas and star formation.",
      },
    ],
  },
  {
    slug: "gravity",
    name: "Gravity Engine",
    short: "Gravity",
    category: "gravity",
    accent: "#60a5fa",
    tech: "2D Canvas",
    tagline: "Stream particles into a star and watch orbits form.",
    title: "Gravity Simulator – Interactive 2D Orbital Mechanics",
    description:
      "Free online gravity simulator. Drag to stream particles toward a central star and watch Newtonian gravity bend them into elliptical orbits, slingshots and escapes in real time.",
    summary:
      "A 2D gravity simulator built on Newton's law of universal gravitation. Every particle is pulled toward a central star with a force proportional to the star's mass, and its velocity and position are updated each frame with semi-implicit Euler integration. Depending on how fast and where you spawn particles, they fall in, settle into elliptical orbits or escape.",
    keywords: ["gravity simulator", "orbit simulator", "orbital mechanics simulation", "newtonian gravity", "physics sandbox"],
    howTo: [
      "Press and drag anywhere on the canvas to stream particles toward the star.",
      "Choose a brush — single, circle, horizontal line or vertical line — to change how particles spawn.",
      "On a keyboard, hold 1, 2 or 3 for rapid-fire line, cluster and column patterns; Ctrl-click adds one particle.",
      "Use Clear particles to start over.",
    ],
    concepts: ["Newton's law of universal gravitation", "Orbital velocity", "Escape velocity", "Euler integration"],
    faq: [
      {
        q: "How does this gravity simulator work?",
        a: "Each particle feels a gravitational pull toward the central star, F = G·M·m / r². Every frame the simulation turns that force into acceleration, updates the particle's velocity, then its position (semi-implicit Euler integration). Repeating this 60 times a second produces orbits.",
      },
      {
        q: "Why do some particles orbit and others escape?",
        a: "A particle that moves at roughly the circular orbital speed √(GM/r) for its distance settles into an orbit. Slower particles spiral inward; particles faster than escape velocity √(2GM/r) fly off and never return.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. The simulator runs entirely in your browser on desktop or mobile, with no download or sign-up.",
      },
    ],
  },
  {
    slug: "blackhole",
    name: "3D Black Hole",
    short: "Black Hole",
    category: "gravity",
    accent: "#c084fc",
    tech: "3D WebGL",
    tagline: "An accretion disk bent by gravitational lensing.",
    title: "Black Hole Simulation – Interactive 3D Accretion Disk & Lensing",
    description:
      "Interactive 3D black hole simulation in WebGL. Orbit a glowing accretion disk of 10,000 particles and see gravitational lensing, Doppler beaming and matter crossing the event horizon.",
    summary:
      "A real-time 3D black hole rendered with Three.js and WebGL. Thousands of particles orbit in an accretion disk; those that cross the event horizon (the Schwarzschild radius) are swallowed. The renderer approximates gravitational lensing — light from behind the hole bent into an Einstein ring — and relativistic Doppler beaming, which makes the side of the disk moving toward you brighter.",
    keywords: ["black hole simulation", "3D black hole", "accretion disk", "gravitational lensing", "Einstein ring", "WebGL physics"],
    howTo: [
      "Drag with one finger or the mouse to orbit the camera around the black hole.",
      "Scroll or pinch with two fingers to zoom in toward the event horizon.",
      "Watch the Eaten counter climb as particles cross the event horizon; each one respawns at the outer edge of the disk.",
    ],
    concepts: ["Schwarzschild radius", "Event horizon", "Gravitational lensing", "Relativistic Doppler beaming", "Accretion disk"],
    faq: [
      {
        q: "What is the Schwarzschild radius?",
        a: "It is the radius of the event horizon of a non-rotating black hole, r_s = 2GM / c². Anything that crosses it — including light — cannot escape. In this simulation, particles that cross it are removed and counted as eaten.",
      },
      {
        q: "Why is one side of the accretion disk brighter?",
        a: "Relativistic Doppler beaming. Gas orbiting toward the viewer at a large fraction of light speed appears brighter and bluer; gas moving away appears dimmer and redder.",
      },
      {
        q: "Is this an accurate black hole?",
        a: "It is a real-time approximation for intuition and education. Lensing and beaming are modelled visually rather than by full general-relativistic ray tracing, so it runs smoothly in a browser.",
      },
    ],
  },
  {
    slug: "nparticle",
    name: "N-Particle Sandbox",
    short: "N-Particle",
    category: "gravity",
    accent: "#34d399",
    tech: "3D Canvas",
    tagline: "Every particle pulls on every other — O(N²) gravity in 3D.",
    title: "N-Body Simulation – 3D Particle Gravity Sandbox",
    description:
      "Interactive 3D N-body gravity simulation in your browser. Spawn particles or bursts, tune mass and time dilation, and watch clusters, binaries and orbits emerge from pairwise O(N²) forces.",
    summary:
      "A 3D N-body sandbox where every particle attracts every other particle. With N bodies that is N·(N−1)/2 pairwise force calculations per frame, which is why this kind of simulation is described as O(N²). A softening term keeps close encounters numerically stable, and over time the system clumps into clusters, binary pairs and orbiting groups.",
    keywords: ["n-body simulation", "particle gravity simulation", "3D particle simulator", "gravitational clustering", "O(N^2) simulation"],
    howTo: [
      "Click or tap on the canvas to spawn a particle; switch to Burst to spawn a cluster.",
      "Drag to orbit the camera, right-drag or two-finger drag to pan, and scroll or pinch to zoom.",
      "Change particle size and mass, or slow time down with time dilation.",
    ],
    concepts: ["N-body problem", "Pairwise gravitational force", "Softening length", "Computational complexity"],
    faq: [
      {
        q: "What is an N-body simulation?",
        a: "A simulation of N objects that all attract each other gravitationally. There is no general closed-form solution for three or more bodies, so the motion is computed step by step numerically.",
      },
      {
        q: "Why is it called O(N²)?",
        a: "Each of the N particles computes the force from every other particle, so the work per frame grows with the square of the particle count. Doubling the particles roughly quadruples the work.",
      },
      {
        q: "What does the softening parameter do?",
        a: "It adds a small constant ε to the distance in the force law, F ∝ 1 / (r² + ε²), so two particles passing very close do not produce an infinite force and fling each other away.",
      },
    ],
  },
  {
    slug: "solar",
    name: "Solar System",
    short: "Solar System",
    category: "gravity",
    accent: "#fbbf24",
    tech: "2D Canvas",
    tagline: "All eight planets on their real orbits, sped up.",
    title: "Solar System Simulator – 8 Planets & Kepler's Laws",
    description:
      "Interactive solar system simulator with all eight planets on real orbital data. Speed up time, follow any planet and see Kepler's laws of planetary motion in action.",
    summary:
      "A 2D model of the solar system with Mercury through Neptune on orbits derived from real orbital periods and distances. Speed up time to watch inner planets lap outer ones, or follow a single planet. Kepler's three laws — elliptical orbits, equal areas in equal times, and T² ∝ a³ — are all visible.",
    keywords: ["solar system simulator", "planet orbit simulation", "kepler's laws", "orbital period", "solar system model"],
    howTo: [
      "Use Time speed to fast-forward the orbits.",
      "Choose a planet under Follow to keep it centred, or the Sun for the whole system.",
      "Toggle orbit paths and planet labels.",
    ],
    concepts: ["Kepler's laws of planetary motion", "Orbital period", "Semi-major axis", "Elliptical orbits"],
    faq: [
      {
        q: "What are Kepler's three laws?",
        a: "1) Planets move on ellipses with the Sun at one focus. 2) A line from the Sun to a planet sweeps out equal areas in equal times, so planets move faster near the Sun. 3) The square of a planet's orbital period is proportional to the cube of its average distance from the Sun (T² ∝ a³).",
      },
      {
        q: "Is the solar system shown to scale?",
        a: "Orbital periods follow real data, so relative speeds are accurate. Planet sizes and distances are compressed so that all eight planets fit on one screen.",
      },
    ],
  },
  {
    slug: "attractor",
    name: "Strange Attractors",
    short: "Attractors",
    category: "chaos",
    accent: "#fb923c",
    tech: "3D Chaos",
    tagline: "Lorenz, Rössler and Thomas attractors traced in light.",
    title: "Lorenz Attractor Simulation – Strange Attractors & Chaos Theory",
    description:
      "Interactive Lorenz, Rössler and Thomas strange attractor simulation. Watch chaos theory unfold as RK4 integration traces glowing 3D trails that slowly rotate as they draw.",
    summary:
      "Strange attractors are the shapes that chaotic systems settle onto. This simulation integrates three classic systems of differential equations — Lorenz, Rössler and Thomas — with fourth-order Runge–Kutta (RK4) and draws the trajectory as a glowing 3D trail. The path never repeats and never crosses itself, yet it stays confined to a recognisable shape.",
    keywords: ["lorenz attractor", "strange attractor", "chaos theory simulation", "rossler attractor", "butterfly effect", "RK4"],
    howTo: [
      "Pick an attractor: Lorenz, Rössler or Thomas.",
      "Adjust trail length and integration speed.",
      "Turn auto-rotate on or off to inspect the 3D shape, and reset the trail to start again.",
    ],
    concepts: ["Chaos theory", "Lorenz system", "Butterfly effect", "Runge–Kutta (RK4) integration"],
    faq: [
      {
        q: "What is the Lorenz attractor?",
        a: "A set of three differential equations Edward Lorenz derived from a simplified model of atmospheric convection in 1963: dx/dt = σ(y − x), dy/dt = x(ρ − z) − y, dz/dt = xy − βz. With σ = 10, ρ = 28 and β = 8/3 its solutions trace the famous butterfly-shaped attractor.",
      },
      {
        q: "What makes an attractor 'strange'?",
        a: "Its trajectories are chaotic — nearby starting points diverge exponentially — yet they stay on a bounded shape with a fractal structure. That sensitive dependence on initial conditions is the butterfly effect.",
      },
      {
        q: "Why use RK4 integration?",
        a: "Fourth-order Runge–Kutta samples the slope four times per step, which is far more accurate than simple Euler steps for the same step size and keeps the chaotic trajectory on the attractor.",
      },
    ],
  },
  {
    slug: "pendulum",
    name: "Magnetic Pendulum",
    short: "Pendulum",
    category: "chaos",
    accent: "#22d3ee",
    tech: "2D Fractal",
    tagline: "A pendulum over magnets paints a fractal map of fate.",
    title: "Magnetic Pendulum Simulation – Fractal Basins of Attraction",
    description:
      "Interactive magnetic pendulum chaos simulation. A damped pendulum swings above magnets; the map shows which one it settles on from every starting point, revealing a fractal basin of attraction.",
    summary:
      "A damped pendulum swings above a ring of magnets and eventually comes to rest over one of them. Colour every starting point by the magnet it ends up on and you get a basin-of-attraction map — smooth near each magnet, but fractal along the boundaries, where a starting shift of a fraction of a pixel changes the outcome.",
    keywords: ["magnetic pendulum", "fractal basin of attraction", "chaos simulation", "sensitive dependence on initial conditions"],
    howTo: [
      "Choose 3, 4 or 5 magnets and set the damping (friction) and magnet strength.",
      "Pick a resolution for the basin map — higher is sharper but takes longer to compute.",
      "Press Recompute to redraw the fractal for the new settings.",
    ],
    concepts: ["Basin of attraction", "Fractal boundaries", "Damped motion", "Sensitive dependence on initial conditions"],
    faq: [
      {
        q: "Why is the magnetic pendulum chaotic?",
        a: "Near the boundaries between magnets, the pendulum passes close to several of them, and each pass amplifies tiny differences in its path. Two almost identical starting points can end on different magnets.",
      },
      {
        q: "What is a basin of attraction?",
        a: "The set of all starting positions that end up at the same resting state — here, the same magnet. Each colour in the map is one basin; their tangled boundary is a fractal.",
      },
    ],
  },
  {
    slug: "evolution",
    name: "Evolution Lab",
    short: "Evolution",
    category: "emergence",
    accent: "#2dd4bf",
    tech: "2D Ecosystem",
    isNew: true,
    tagline: "Natural selection you can watch: predators, prey and an arms race.",
    title: "Evolution Simulator – Natural Selection & Predator–Prey",
    description:
      "Interactive evolution simulator. Creatures with mutating genes for speed, size and sense compete for food while predators hunt them. Watch natural selection, population cycles and evolutionary arms races in real time.",
    summary:
      "Evolution Lab is an agent-based model of natural selection. Each creature has three genes — speed, size and sense range — and every gene has a cost: moving fast and being big burn energy, and sensing far drains a little more. Creatures that gather enough food reproduce, passing on slightly mutated genes. When predators arrive, prey that are faster or bigger than the predators survive more often, and the average genome shifts. No outcome is scripted: some runs evolve small, fast prey; others evolve large, armoured ones.",
    keywords: ["evolution simulator", "natural selection simulation", "predator prey simulation", "genetic algorithm simulation", "ecosystem simulator"],
    howTo: [
      "Watch the population grow; predators arrive automatically after a few generations.",
      "Tap or click any creature to follow it and see its genes, age, energy and number of offspring.",
      "Open the panel to see live population and trait charts, release more predators, trigger a famine, or change food and mutation rates.",
      "Speed up time to watch dozens of generations evolve in a few minutes.",
    ],
    concepts: ["Natural selection", "Mutation and heredity", "Predator–prey dynamics", "Evolutionary arms race", "Agent-based modelling"],
    faq: [
      {
        q: "How does natural selection work in this simulation?",
        a: "Creatures that find food and avoid predators live long enough to reproduce. Their children inherit their genes with small random mutations. Over generations, genes that help survival in the current environment become more common.",
      },
      {
        q: "Why do predator and prey numbers rise and fall in cycles?",
        a: "More prey feed more predators; more predators eat down the prey; then predators starve and prey recover. These are the cycles described by the Lotka–Volterra equations, here emerging from individual behaviour.",
      },
      {
        q: "Why does every run end differently?",
        a: "Mutations are random, so different runs discover different strategies — for example small and fast prey that outrun predators, or large prey that predators can't swallow.",
      },
    ],
  },
  {
    slug: "boids",
    name: "Boids Flocking",
    short: "Boids",
    category: "emergence",
    accent: "#fb7185",
    tech: "2D Canvas",
    tagline: "Three local rules, one murmuration.",
    title: "Boids Flocking Simulation – Emergent Swarm Behaviour",
    description:
      "Interactive boids flocking simulation based on Craig Reynolds' algorithm. Tune separation, alignment and cohesion, add a predator and watch emergent swarm behaviour appear.",
    summary:
      "Boids is Craig Reynolds' 1986 model of flocking. Each bird-like agent steers using only its neighbours within a visual radius, following three rules: separation (don't crowd), alignment (match heading) and cohesion (move toward the group). No agent knows the flock's shape — the murmuration emerges.",
    keywords: ["boids simulation", "flocking algorithm", "craig reynolds boids", "swarm simulation", "emergent behaviour"],
    howTo: [
      "Adjust separation, alignment and cohesion to see how each rule shapes the flock.",
      "Change the flock size and each boid's visual radius.",
      "Turn on the predator to make the flock scatter, and trails to see their paths.",
    ],
    concepts: ["Emergent behaviour", "Agent-based modelling", "Separation, alignment, cohesion", "Steering behaviours"],
    faq: [
      {
        q: "What are the three boids rules?",
        a: "Separation: steer away from neighbours that are too close. Alignment: steer toward the average heading of nearby neighbours. Cohesion: steer toward the average position of nearby neighbours.",
      },
      {
        q: "Who invented boids?",
        a: "Craig Reynolds, who presented the model at SIGGRAPH in 1987. Variants of it are used for crowds, schools of fish and flocks in film and games.",
      },
    ],
  },
  {
    slug: "sand",
    name: "Falling Sand",
    short: "Falling Sand",
    category: "emergence",
    accent: "#d6b88a",
    tech: "2D Automata",
    tagline: "Paint with sand, water, fire and stone.",
    title: "Falling Sand Game – Cellular Automata Sandbox",
    description:
      "Free falling sand game in your browser. Paint with sand, water, fire and stone and watch cellular automata rules make piles, pools and flames pixel by pixel.",
    summary:
      "A falling-sand sandbox built on cellular automata. The screen is a grid of cells; every frame each cell looks at its neighbours and follows a small rule for its material — sand falls and piles, water flows sideways, fire rises and burns out, stone stays put. Scanning the grid from the bottom up keeps falling material from moving twice in one frame.",
    keywords: ["falling sand game", "sand simulator", "cellular automata", "powder game", "pixel physics"],
    howTo: [
      "Choose sand, water, fire or stone — or Erase — and paint on the canvas by dragging.",
      "Change the brush size for broad strokes or fine detail.",
      "Clear the grid to start over.",
    ],
    concepts: ["Cellular automata", "Local update rules", "Granular flow"],
    faq: [
      {
        q: "How does a falling sand game work?",
        a: "The canvas is a grid where each cell holds a material. Every frame, each cell checks the cells around it and moves according to simple rules — sand drops down or diagonally, water also spreads sideways. Complex piles and flows emerge from those rules.",
      },
      {
        q: "Why scan from the bottom up?",
        a: "If the grid were updated top to bottom, a grain could fall into a cell that is processed again later in the same frame and drop several rows at once. Updating bottom-up moves each grain at most once per frame.",
      },
    ],
  },
  {
    slug: "efield",
    name: "Electric Field",
    short: "Electric Field",
    category: "fields",
    accent: "#facc15",
    tech: "2D Canvas",
    tagline: "Drop charges, see Coulomb field lines draw themselves.",
    title: "Electric Field Simulator – Coulomb Field Lines & Equipotentials",
    description:
      "Interactive electric field simulator. Place positive and negative charges and watch Coulomb field lines and equipotential lines update in real time.",
    summary:
      "An electric field visualiser built on Coulomb's law. Each charge produces a field E = kq / r², and by the superposition principle the total field at any point is the vector sum of every charge's contribution. Field lines start on positive charges and end on negative ones; equipotential lines cross them at right angles.",
    keywords: ["electric field simulator", "coulomb's law simulation", "electric field lines", "equipotential lines", "electrostatics"],
    howTo: [
      "Choose positive or negative, then click or tap to place a charge.",
      "Toggle field lines and equipotential lines on or off.",
      "Clear all charges to start a new arrangement.",
    ],
    concepts: ["Coulomb's law", "Superposition principle", "Field lines", "Equipotential surfaces"],
    faq: [
      {
        q: "What is Coulomb's law?",
        a: "The force between two point charges is F = k·q₁·q₂ / r²: proportional to the product of the charges and inversely proportional to the square of their distance. Like charges repel, opposite charges attract.",
      },
      {
        q: "Why do field lines never cross?",
        a: "The electric field has exactly one direction at each point. If two lines crossed, the field would point two ways at once, which is impossible.",
      },
    ],
  },
  {
    slug: "fluid",
    name: "Fluid SPH",
    short: "Fluid",
    category: "fields",
    accent: "#818cf8",
    tech: "2D SPH",
    tagline: "Real-time water from smoothed particle hydrodynamics.",
    title: "Fluid Simulation – Smoothed Particle Hydrodynamics (SPH)",
    description:
      "Real-time 2D fluid simulation using smoothed particle hydrodynamics. Pour water, change gravity and viscosity, and watch pressure and flow in your browser.",
    summary:
      "Smoothed particle hydrodynamics (SPH) models a fluid as many particles that each carry mass. A smoothing kernel turns nearby particles into a continuous density; density gives pressure, pressure gives force, and viscosity smooths out velocity differences. The result is water that splashes, settles and sloshes in real time.",
    keywords: ["fluid simulation", "sph simulation", "smoothed particle hydrodynamics", "water simulation", "real-time fluid"],
    howTo: [
      "Click or drag on the canvas to pour in fluid particles (up to 600).",
      "Set gravity to down, zero or up, and change the viscosity.",
      "Switch the colour mode between speed, density and flat.",
    ],
    concepts: ["Smoothed particle hydrodynamics", "Smoothing kernel", "Pressure and viscosity", "Lagrangian fluid simulation"],
    faq: [
      {
        q: "What is smoothed particle hydrodynamics?",
        a: "A mesh-free method that represents a fluid as particles. Quantities like density and pressure at any point are computed as a weighted sum over nearby particles, using a smoothing kernel that falls off with distance.",
      },
      {
        q: "What does viscosity change?",
        a: "Viscosity is a fluid's resistance to flow. Raising it makes neighbouring particles share velocity more strongly, so the fluid behaves more like honey than water.",
      },
    ],
  },
];

export const getSimulation = (slug) => simulations.find((s) => s.slug === slug);

export const simulationsByCategory = () =>
  categories.map((c) => ({ ...c, items: simulations.filter((s) => s.category === c.id) }));

export const relatedSimulations = (slug, count = 3) => {
  const sim = getSimulation(slug);
  const same = simulations.filter((s) => s.category === sim.category && s.slug !== slug);
  const other = simulations.filter((s) => s.category !== sim.category);
  return [...same, ...other].slice(0, count);
};
