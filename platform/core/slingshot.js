// Gravity Slingshot — pure physics + levels (no DOM). Shared by the page and
// by the solver that proves every level (and every daily puzzle) is solvable.
//
// World is a 1000×1000 square. Bodies either sit still or follow prescribed
// circular orbits (kinematic), so a run is fully deterministic: the same
// launch always produces the same path, which keeps puzzles fair.

export const WORLD = 1000;
export const MAX_PULL = 150; // px of drag in world units
export const LAUNCH_SCALE = 3.4; // world px/s per px of pull
export const MAX_TIME = 14; // seconds before a probe is "lost in space"
export const DT = 1 / 240;
const SOFT2 = 64; // softening (8px)²

const planet = (x, y, gm, r, color = "#60a5fa", extra = {}) => ({ kind: "planet", x, y, gm, r, color, ...extra });
const star = (x, y, gm, r, extra = {}) => ({ kind: "star", x, y, gm, r, color: "#fbbf24", ...extra });
const hole = (x, y, gm, r = 16, extra = {}) => ({ kind: "blackhole", x, y, gm, r, color: "#c084fc", ...extra });
const orbiting = (cx, cy, R, period, phase = 0) => ({ cx, cy, R, w: (2 * Math.PI) / period, phase });
const rock = (x, y, r) => ({ x, y, r });

export const LEVELS = [
  {
    name: "First flight",
    hint: "Drag back from the probe, aim, and let go. Reach the ring.",
    start: { x: 140, y: 560 },
    target: { x: 860, y: 520, r: 34 },
    bodies: [planet(500, 340, 0.9e7, 44, "#60a5fa")],
    asteroids: [],
  },
  {
    name: "Around the bend",
    hint: "The planet is in the way. Let its gravity bend you around it.",
    start: { x: 140, y: 500 },
    target: { x: 860, y: 500, r: 32 },
    bodies: [planet(500, 500, 1.4e7, 70, "#34d399")],
    asteroids: [],
  },
  {
    name: "Gravity assist",
    hint: "Swing close past the planet to change direction for free.",
    start: { x: 150, y: 820 },
    target: { x: 180, y: 180, r: 30 },
    bodies: [planet(560, 500, 1.6e7, 58, "#f472b6")],
    asteroids: [rock(170, 500, 22), rock(230, 470, 18), rock(290, 520, 20), rock(120, 450, 16)],
  },
  {
    name: "Two wells",
    hint: "Thread the gap between two planets — or use both.",
    start: { x: 120, y: 500 },
    target: { x: 880, y: 500, r: 30 },
    bodies: [planet(480, 330, 1.3e7, 52, "#60a5fa"), planet(520, 680, 1.3e7, 52, "#fb923c")],
    asteroids: [rock(500, 505, 26)],
  },
  {
    name: "Far side",
    hint: "The target hides behind a world. Curve all the way around.",
    start: { x: 130, y: 500 },
    target: { x: 760, y: 500, r: 30 },
    bodies: [planet(560, 500, 1.8e7, 72, "#a78bfa")],
    asteroids: [],
  },
  {
    name: "Moonrise",
    hint: "A moon circles the planet. Timing matters now.",
    start: { x: 140, y: 760 },
    target: { x: 860, y: 260, r: 30 },
    bodies: [
      planet(500, 500, 1.4e7, 56, "#38bdf8"),
      planet(0, 0, 2.5e6, 16, "#d4d4d8", { orbit: orbiting(500, 500, 190, 6, 0.6) }),
    ],
    asteroids: [],
  },
  {
    name: "Binary",
    hint: "Two stars orbit each other. Find the quiet lane.",
    start: { x: 120, y: 860 },
    target: { x: 880, y: 140, r: 30 },
    bodies: [
      star(0, 0, 1.4e7, 34, { orbit: orbiting(500, 500, 110, 5, 0) }),
      star(0, 0, 1.4e7, 34, { orbit: orbiting(500, 500, 110, 5, Math.PI) }),
    ],
    asteroids: [],
  },
  {
    name: "Asteroid belt",
    hint: "One gap in the belt. Gravity can steer you to it.",
    start: { x: 140, y: 820 },
    target: { x: 500, y: 150, r: 30 },
    bodies: [planet(300, 520, 1.3e7, 50, "#fb923c")],
    asteroids: [
      rock(80, 380, 26), rock(150, 370, 24), rock(220, 385, 26), rock(290, 372, 24), rock(360, 380, 24),
      rock(560, 380, 24), rock(630, 372, 26), rock(700, 385, 24), rock(770, 375, 26), rock(840, 385, 24), rock(910, 378, 26),
    ],
  },
  {
    name: "Event horizon",
    hint: "Black holes pull hard. Skim past, don't fall in.",
    start: { x: 140, y: 500 },
    target: { x: 160, y: 200, r: 30 },
    bodies: [hole(560, 420, 2.6e7, 18)],
    asteroids: [rock(160, 340, 30), rock(240, 330, 26), rock(90, 320, 24)],
  },
  {
    name: "Slalom",
    hint: "Three planets, alternating. Weave through.",
    start: { x: 100, y: 500 },
    target: { x: 900, y: 500, r: 28 },
    bodies: [
      planet(300, 400, 1.1e7, 46, "#60a5fa"),
      planet(500, 610, 1.1e7, 46, "#f472b6"),
      planet(700, 400, 1.1e7, 46, "#34d399"),
    ],
    asteroids: [rock(500, 470, 24), rock(300, 560, 22), rock(700, 560, 22)],
  },
  {
    name: "Moving target",
    hint: "The target orbits a planet. Lead your shot.",
    start: { x: 130, y: 500 },
    target: { x: 0, y: 0, r: 30, orbit: orbiting(640, 500, 170, 7, Math.PI * 0.5) },
    bodies: [planet(640, 500, 1.2e7, 50, "#38bdf8")],
    asteroids: [],
  },
  {
    name: "Behind the sun",
    hint: "A star guards the target. Use its pull, not its surface.",
    start: { x: 120, y: 160 },
    target: { x: 860, y: 860, r: 28 },
    bodies: [star(560, 560, 2.4e7, 64)],
    asteroids: [rock(720, 760, 22), rock(780, 700, 20), rock(660, 820, 20)],
  },
  {
    name: "Narrow gate",
    hint: "A tiny gap between rocks. Precision counts.",
    start: { x: 120, y: 720 },
    target: { x: 860, y: 260, r: 26 },
    bodies: [planet(420, 380, 1.4e7, 52, "#a78bfa")],
    asteroids: [
      rock(700, 80, 30), rock(700, 150, 30), rock(700, 220, 30), rock(700, 290, 30),
      rock(700, 440, 30), rock(700, 510, 30), rock(700, 580, 30), rock(700, 650, 30), rock(700, 720, 30), rock(700, 790, 30), rock(700, 860, 30), rock(700, 930, 30),
    ],
  },
  {
    name: "Twin moons",
    hint: "Two moons, two rhythms. Wait for your window.",
    start: { x: 130, y: 500 },
    target: { x: 880, y: 500, r: 28 },
    bodies: [
      planet(500, 500, 1.6e7, 54, "#fb923c"),
      planet(0, 0, 3e6, 16, "#d4d4d8", { orbit: orbiting(500, 500, 150, 4, 0) }),
      planet(0, 0, 3e6, 16, "#a1a1aa", { orbit: orbiting(500, 500, 260, 7.5, 2) }),
    ],
    asteroids: [],
  },
  {
    name: "Singularity",
    hint: "A black hole between two worlds. The final test.",
    start: { x: 120, y: 860 },
    target: { x: 880, y: 140, r: 26 },
    bodies: [
      hole(500, 500, 2.4e7, 18),
      planet(0, 0, 6e6, 30, "#38bdf8", { orbit: orbiting(500, 500, 230, 8, 0.8) }),
      planet(0, 0, 6e6, 30, "#f472b6", { orbit: orbiting(500, 500, 230, 8, 0.8 + Math.PI) }),
    ],
    asteroids: [rock(820, 260, 22), rock(740, 180, 22)],
  },
];

// ── Kinematics ──────────────────────────────────────────────────────────────
export function posAt(obj, t) {
  if (!obj.orbit) return [obj.x, obj.y];
  const o = obj.orbit;
  const a = o.phase + o.w * t;
  return [o.cx + o.R * Math.cos(a), o.cy + o.R * Math.sin(a)];
}

function accel(level, x, y, t, out) {
  let ax = 0, ay = 0;
  for (const b of level.bodies) {
    const [bx, by] = posAt(b, t);
    const dx = bx - x, dy = by - y;
    const d2 = dx * dx + dy * dy + SOFT2;
    const inv = b.gm / (d2 * Math.sqrt(d2));
    ax += dx * inv;
    ay += dy * inv;
  }
  out[0] = ax;
  out[1] = ay;
}

// Advance a probe state {x,y,vx,vy,t} by one DT (velocity Verlet) and
// classify the outcome. Returns null while still flying.
const A = [0, 0];
export function stepProbe(level, s) {
  accel(level, s.x, s.y, s.t, A);
  const ax0 = A[0], ay0 = A[1];
  s.x += s.vx * DT + 0.5 * ax0 * DT * DT;
  s.y += s.vy * DT + 0.5 * ay0 * DT * DT;
  s.t += DT;
  accel(level, s.x, s.y, s.t, A);
  s.vx += 0.5 * (ax0 + A[0]) * DT;
  s.vy += 0.5 * (ay0 + A[1]) * DT;

  const [tx, ty] = posAt(level.target, s.t);
  const td = Math.hypot(s.x - tx, s.y - ty);
  if (td < s.minDist) s.minDist = td;
  if (td < level.target.r) return "hit";
  for (const b of level.bodies) {
    const [bx, by] = posAt(b, s.t);
    if (Math.hypot(s.x - bx, s.y - by) < b.r) return b.kind === "blackhole" ? "swallowed" : "crash";
  }
  for (const r of level.asteroids) {
    if (Math.hypot(s.x - r.x, s.y - r.y) < r.r) return "crash";
  }
  if (s.x < -400 || s.x > WORLD + 400 || s.y < -400 || s.y > WORLD + 400) return "lost";
  if (s.t - (s.t0 || 0) > MAX_TIME) return "lost";
  return null;
}

export const launchVelocity = (pullX, pullY) => {
  const len = Math.hypot(pullX, pullY);
  const k = len > MAX_PULL ? MAX_PULL / len : 1;
  return [pullX * k * LAUNCH_SCALE, pullY * k * LAUNCH_SCALE];
};

export const newProbe = (level, vx, vy, t0 = 0) => ({ x: level.start.x, y: level.start.y, vx, vy, t: t0, t0, minDist: Infinity });

export function simulate(level, vx, vy, { record = false } = {}) {
  const s = newProbe(level, vx, vy);
  const path = record ? [[s.x, s.y]] : null;
  let result = null, i = 0;
  while (!result) {
    result = stepProbe(level, s);
    if (record && ++i % 4 === 0) path.push([s.x, s.y]);
  }
  return { result, t: s.t, minDist: s.minDist, path };
}

// Brute force over launch angle and power. Used to prove levels are solvable.
export function solve(level, { angles = 180, powers = 14 } = {}) {
  const wins = [];
  for (let i = 0; i < angles; i++) {
    const a = (i / angles) * Math.PI * 2;
    for (let j = 1; j <= powers; j++) {
      const pull = (j / powers) * MAX_PULL;
      const [vx, vy] = launchVelocity(Math.cos(a) * pull, Math.sin(a) * pull);
      if (simulate(level, vx, vy).result === "hit") wins.push({ a, pull });
    }
  }
  return { wins: wins.length, total: angles * powers, sample: wins[0] };
}

// ── Daily puzzle ────────────────────────────────────────────────────────────
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const todayKey = (d = new Date()) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

const COLORS = ["#60a5fa", "#34d399", "#f472b6", "#fb923c", "#a78bfa", "#38bdf8"];

// Deterministic per UTC date: everyone gets the same puzzle. Candidates are
// generated until one is solvable but not trivial (2–18% of shots win).
export function dailyLevel(key = todayKey()) {
  const base = Number(key.replace(/-/g, ""));
  for (let attempt = 0; attempt < 60; attempt++) {
    const rnd = mulberry32(base * 31 + attempt);
    const r = (a, b) => a + rnd() * (b - a);
    const flip = rnd() < 0.5;
    const start = { x: r(100, 180), y: flip ? r(700, 880) : r(120, 300) };
    const target = { x: r(780, 900), y: flip ? r(120, 320) : r(680, 880), r: 28 };
    const bodies = [];
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const roll = rnd();
      if (roll < 0.12) bodies.push(hole(r(380, 620), r(300, 700), r(1.8e7, 2.6e7)));
      else bodies.push(planet(r(330, 680), r(260, 740), r(0.9e7, 1.7e7), Math.round(r(40, 64)), COLORS[i % COLORS.length]));
    }
    if (rnd() < 0.45) {
      const host = bodies[0];
      bodies.push(planet(0, 0, r(2e6, 4e6), 16, "#d4d4d8", { orbit: orbiting(host.x, host.y, r(140, 220), r(4, 8), r(0, 6.28)) }));
    }
    const asteroids = [];
    const nr = Math.floor(rnd() * 5);
    for (let i = 0; i < nr; i++) asteroids.push(rock(r(250, 800), r(150, 850), Math.round(r(16, 28))));
    const level = { name: `Daily · ${key}`, hint: "Today's puzzle — the same for everyone.", start, target, bodies, asteroids, daily: true };

    // Reject overlapping placements
    const clear = (x, y, pad) =>
      bodies.every((b) => !b.orbit ? Math.hypot(b.x - x, b.y - y) > b.r + pad : true) &&
      asteroids.every((a) => Math.hypot(a.x - x, a.y - y) > a.r + pad);
    if (!clear(start.x, start.y, 60) || !clear(target.x, target.y, 50)) continue;

    const { wins, total } = solve(level, { angles: 120, powers: 10 });
    const frac = wins / total;
    if (frac > 0.004 && frac < 0.06) return level;
  }
  return LEVELS[4];
}

export const starsFor = (launches) => (launches <= 1 ? 3 : launches === 2 ? 2 : 1);
