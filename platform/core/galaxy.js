// Galaxy Collider — Toomre & Toomre (1972) style restricted N-body model.
// Each galaxy is a massive core (point mass, softened) with a disk of massless
// test stars on circular orbits. The two cores attract each other; every star
// feels both cores. An approximate dynamical-friction drag on the cores lets
// them lose orbital energy on close passes and eventually merge.
//
// Units: G = 1, disk radius = 1, mass of galaxy A = 1.
// One time unit ≈ 87 million years for a Milky Way–sized galaxy.

export const MYR_PER_UNIT = 87;
export const DT = 0.01;
export const MAX_STEPS = 9000;
const EPS2_CORE = 0.04;
const EPS2_STAR = 0.0225;

export const PRESETS = {
  mwand: { name: "Milky Way + Andromeda", short: "Andromeda", q: 0.8, rp: 1.2, ia: 30, ib: 60, sa: 1, sb: 1 },
  antennae: { name: "The Antennae", q: 1, rp: 1.0, ia: 60, ib: 60, sa: 1, sb: 1 },
  mice: { name: "The Mice", q: 1, rp: 1.6, ia: 20, ib: 35, sa: 1, sb: 1 },
  flyby: { name: "Minor flyby", short: "Flyby", q: 0.3, rp: 2.4, ia: 15, ib: 40, sa: 1, sb: 1 },
  retro: { name: "Retrograde", q: 1, rp: 1.2, ia: 20, ib: 20, sa: -1, sb: 1 },
};

export const DEFAULT_PARAMS = { ...PRESETS.antennae, preset: "antennae" };

export function encodeParams(p) {
  return `q=${p.q}&rp=${p.rp}&ia=${p.ia}&ib=${p.ib}&sa=${p.sa}&sb=${p.sb}`;
}

export function decodeParams(str) {
  const sp = new URLSearchParams(str.replace(/^#/, ""));
  const num = (k, lo, hi, d) => {
    const v = parseFloat(sp.get(k));
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
  };
  if (!sp.has("q")) return null;
  return {
    q: num("q", 0.2, 1, 1),
    rp: num("rp", 0.6, 3, 1.2),
    ia: num("ia", 0, 90, 30),
    ib: num("ib", 0, 90, 30),
    sa: sp.get("sa") === "-1" ? -1 : 1,
    sb: sp.get("sb") === "-1" ? -1 : 1,
    preset: "custom",
  };
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Collision {
  constructor(params, starsPerGalaxy = 6000, seed = 7) {
    this.params = params;
    this.n = starsPerGalaxy;
    this.seed = seed;
    this.pos = new Float32Array(this.n * 2 * 3);
    this.vel = new Float32Array(this.n * 2 * 3);
    this.owner = new Uint8Array(this.n * 2);
    this.radius0 = new Float32Array(this.n * 2);
    this.reset();
  }

  reset() {
    const p = this.params;
    const rnd = mulberry32(this.seed);
    const M1 = 1, M2 = p.q, M = M1 + M2;
    this.mass = [M1, M2];

    // Bound, near-parabolic encounter in the x–z plane with pericentre ≈ rp.
    // (Mergers in nature are usually bound pairs; 0.82 × escape speed.)
    const r0 = 7, e = 0.82;
    const v = e * Math.sqrt((2 * M) / r0);
    // Angular momentum for pericentre rp on this orbit: from energy + L conservation
    const E = 0.5 * v * v - M / r0;
    const L = p.rp * Math.sqrt(2 * (E + M / p.rp));
    const vt = L / r0;
    const vr = -Math.sqrt(Math.max(0, v * v - vt * vt));
    // Relative position/velocity of B with respect to A
    const rel = [r0, 0, 0];
    const relv = [vr, 0, vt];
    // Centre-of-mass frame
    const fA = -M2 / M, fB = M1 / M;
    this.core = [
      { x: rel[0] * fA, y: 0, z: rel[2] * fA, vx: relv[0] * fA, vy: 0, vz: relv[2] * fA },
      { x: rel[0] * fB, y: 0, z: rel[2] * fB, vx: relv[0] * fB, vy: 0, vz: relv[2] * fB },
    ];

    const disks = [
      { inc: (p.ia * Math.PI) / 180, spin: p.sa, m: M1, scale: 1 },
      { inc: (p.ib * Math.PI) / 180, spin: p.sb, m: M2, scale: Math.max(0.55, Math.sqrt(p.q)) },
    ];

    let i = 0;
    for (let g = 0; g < 2; g++) {
      const d = disks[g];
      const c = this.core[g];
      const ci = Math.cos(d.inc), si = Math.sin(d.inc);
      for (let k = 0; k < this.n; k++, i++) {
        // Surface density falling with radius; a few rings for structure
        const r = d.scale * (0.12 + 0.88 * Math.pow(rnd(), 0.75));
        const th = rnd() * Math.PI * 2;
        const vc = Math.sqrt((d.m * r * r) / Math.pow(r * r + EPS2_STAR, 1.5)) * d.spin;
        // Disk in its own x–z plane, then tilted about the x axis
        let x = r * Math.cos(th), y = (rnd() - 0.5) * 0.02 * r, z = r * Math.sin(th);
        let vx = -vc * Math.sin(th), vy = 0, vz = vc * Math.cos(th);
        const y2 = y * ci - z * si, z2 = y * si + z * ci;
        const vy2 = vy * ci - vz * si, vz2 = vy * si + vz * ci;
        const o = i * 3;
        this.pos[o] = c.x + x;
        this.pos[o + 1] = c.y + y2;
        this.pos[o + 2] = c.z + z2;
        this.vel[o] = c.vx + vx;
        this.vel[o + 1] = c.vy + vy2;
        this.vel[o + 2] = c.vz + vz2;
        this.owner[i] = g;
        this.radius0[i] = r / d.scale;
      }
    }

    this.steps = 0;
    this.sep = r0;
    this.prevSep = r0;
    this.closing = true;
    this.passages = 0;
    this.merged = false;
    this.mergeCount = 0;
    this.events = [];
  }

  get time() {
    return this.steps * DT;
  }

  step() {
    const [A, B] = this.core;
    const [M1, M2] = this.mass;

    // Core–core gravity + dynamical friction (only when close)
    const dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z;
    const r2 = dx * dx + dy * dy + dz * dz;
    const r = Math.sqrt(r2);
    const inv = 1 / Math.pow(r2 + EPS2_CORE, 1.5);
    const dvx = B.vx - A.vx, dvy = B.vy - A.vy, dvz = B.vz - A.vz;
    const fric = 0.5 * Math.exp(-r2 / 0.8);
    A.vx += (M2 * dx * inv + fric * dvx * (M2 / (M1 + M2))) * DT;
    A.vy += (M2 * dy * inv + fric * dvy * (M2 / (M1 + M2))) * DT;
    A.vz += (M2 * dz * inv + fric * dvz * (M2 / (M1 + M2))) * DT;
    B.vx += (-M1 * dx * inv - fric * dvx * (M1 / (M1 + M2))) * DT;
    B.vy += (-M1 * dy * inv - fric * dvy * (M1 / (M1 + M2))) * DT;
    B.vz += (-M1 * dz * inv - fric * dvz * (M1 / (M1 + M2))) * DT;
    for (const c of this.core) {
      c.x += c.vx * DT;
      c.y += c.vy * DT;
      c.z += c.vz * DT;
    }

    // Stars feel both cores
    const pos = this.pos, vel = this.vel, N = this.n * 2;
    const ax = A.x, ay = A.y, az = A.z, bx = B.x, by = B.y, bz = B.z;
    for (let i = 0, o = 0; i < N; i++, o += 3) {
      const x = pos[o], y = pos[o + 1], z = pos[o + 2];
      let ex = ax - x, ey = ay - y, ez = az - z;
      let d2 = ex * ex + ey * ey + ez * ez + EPS2_STAR;
      let f = M1 / (d2 * Math.sqrt(d2));
      let gx = ex * f, gy = ey * f, gz = ez * f;
      ex = bx - x; ey = by - y; ez = bz - z;
      d2 = ex * ex + ey * ey + ez * ez + EPS2_STAR;
      f = M2 / (d2 * Math.sqrt(d2));
      gx += ex * f; gy += ey * f; gz += ez * f;
      vel[o] += gx * DT;
      vel[o + 1] += gy * DT;
      vel[o + 2] += gz * DT;
      pos[o] = x + vel[o] * DT;
      pos[o + 1] = y + vel[o + 1] * DT;
      pos[o + 2] = z + vel[o + 2] * DT;
    }

    this.steps++;
    this.trackEvents(r);
  }

  // Share of stars more than 1.8 disk radii from their own core
  strippedFraction() {
    let far = 0;
    const N = this.n * 2;
    for (let i = 0; i < N; i++) {
      const c = this.core[this.owner[i]], o = i * 3;
      const dx = this.pos[o] - c.x, dy = this.pos[o + 1] - c.y, dz = this.pos[o + 2] - c.z;
      if (dx * dx + dy * dy + dz * dz > 3.24) far++;
    }
    return far / N;
  }

  trackEvents(r) {
    if (this.closing && r > this.prevSep && this.steps > 5) {
      this.passages++;
      this.closing = false;
      if (!this.merged && this.passages <= 2 && this.prevSep > 0.25) {
        const label = this.passages === 1 ? "First close pass" : "Second close pass";
        this.events.push({ step: this.steps, text: `${label} — the cores came within ${(this.prevSep * 15).toFixed(0)} kpc.` });
        if (this.passages === 1) this.tailsAt = this.steps + 250;
        if (this.passages === 2) this.events.push({ step: this.steps + 1, text: "The cores are spiralling together, losing energy to friction." });
      }
    } else if (!this.closing && r < this.prevSep) {
      this.closing = true;
    }
    if (this.tailsAt && this.steps === this.tailsAt) {
      const f = this.strippedFraction();
      this.events.push({
        step: this.steps,
        text: f > 0.04
          ? `Tidal tails are forming — ${Math.round(f * 100)}% of stars flung out of their disks.`
          : "A gentle encounter: the disks were only mildly disturbed.",
      });
    }
    if (!this.merged) {
      this.mergeCount = r < 0.18 ? this.mergeCount + 1 : 0;
      if (this.mergeCount > 120) {
        this.merged = true;
        this.events.push({ step: this.steps, text: "The cores have merged into a single galaxy." });
      }
    }
    this.prevSep = r;
    this.sep = r;
  }
}
