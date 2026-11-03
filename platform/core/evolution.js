// Evolution Lab — pure ecosystem model (no DOM).
// Prey and predators carry a genome (speed, size, sense). Every trait has a
// cost and a benefit, so selection pressure — not scripting — decides which
// traits spread:
//   speed  → reach food / escape sooner        but energy cost ∝ size³·speed²
//   size   → predators can't eat prey bigger than themselves, but costs size³
//   sense  → see food and danger from further   but a small constant drain

export const GENES = {
  speed: { min: 0.3, max: 3.2, label: "Speed" },
  size: { min: 0.5, max: 2.2, label: "Size" },
  sense: { min: 12, max: 140, label: "Sense" },
};

const PREY = { baseCost: 0.06, birthEnergy: 50, reproduce: 115, maxAge: 1700, foodEnergy: 26 };
const PRED = { baseCost: 0.08, birthEnergy: 90, reproduce: 240, maxAge: 2600, gain: 75 };
const CELL = 64;

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const radiusOf = (c) => 2.5 + 3 * c.g.size;

export class World {
  constructor(w, h, opts = {}, seed = Date.now() & 0xffffffff) {
    this.w = w;
    this.h = h;
    this.rnd = mulberry32(seed);
    this.opts = {
      food: 1, // abundance multiplier
      mutation: 0.08,
      autoPredators: true,
      predatorGen: 8,
      speedCost: 0.07,
      predCost: 0.4,
      regrow: 500000,
      digest: 200,
      predGain: 130,
      predRepro: 220,
      refuge: 15, // the last few prey can always find somewhere to hide
      migrateAfter: 1200, // ticks without predators before a new pack migrates in
      chase: 1.2,
      ...opts,
    };
    this.tick = 0;
    this.nextId = 1;
    this.prey = [];
    this.pred = [];
    this.food = [];
    this.history = [];
    this.events = [];
    this.maxGen = 0;
    this.predatorsIntroduced = false;
    this.famineUntil = 0;
    this.records = { speed: 0, peakPrey: 0 };
    this.lastMilestoneGen = 0;
    this.extinct = false;
    const area = w * h;
    for (let i = 0; i < Math.round(area / 7000); i++) this.spawnFood();
    const n = clamp(Math.round(area / 9000), 30, 70);
    for (let i = 0; i < n; i++) this.prey.push(this.makeCreature("prey", null));
  }

  get foodCap() {
    return Math.round(((this.w * this.h) / 2600) * this.opts.food);
  }

  spawnFood() {
    this.food.push({ x: this.rnd() * this.w, y: this.rnd() * this.h });
  }

  gauss() {
    const u = 1 - this.rnd(), v = this.rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  makeCreature(kind, parent, x, y) {
    const r = this.rnd;
    let g;
    if (parent) {
      const m = this.opts.mutation;
      g = {};
      for (const k of Object.keys(GENES)) {
        g[k] = clamp(parent.g[k] * Math.exp(this.gauss() * m), GENES[k].min, GENES[k].max);
      }
    } else {
      g = kind === "prey"
        ? { speed: 0.9 + r() * 0.4, size: 0.9 + r() * 0.3, sense: 40 + r() * 20 }
        : { speed: 1.2 + r() * 0.3, size: 1.25 + r() * 0.2, sense: 70 + r() * 20 };
    }
    const P = kind === "prey" ? PREY : PRED;
    const c = {
      id: this.nextId++,
      kind,
      g,
      x: x ?? r() * this.w,
      y: y ?? r() * this.h,
      a: r() * Math.PI * 2,
      energy: P.birthEnergy,
      age: 0,
      maxAge: P.maxAge * (0.75 + r() * 0.5),
      gen: parent ? parent.gen + 1 : 0,
      children: 0,
      parentId: parent ? parent.id : 0,
      born: this.tick,
    };
    return c;
  }

  emit(type, text) {
    this.eventSeq = (this.eventSeq || 0) + 1;
    this.events.push({ type, text, tick: this.tick, seq: this.eventSeq });
    if (this.events.length > 40) this.events.shift();
  }

  addPredators(n = 6) {
    for (let i = 0; i < n; i++) this.pred.push(this.makeCreature("pred", null));
    if (!this.predatorsIntroduced) this.emit("predators", "Predators have arrived. Watch how prey traits respond.");
    else this.emit("predators", `${n} predators released.`);
    this.predatorsIntroduced = true;
  }

  famine(seconds = 20) {
    this.food.splice(0, Math.floor(this.food.length * 0.85));
    this.famineUntil = this.tick + seconds * 60;
    this.emit("famine", "Famine: most food is gone and regrowth has slowed.");
  }

  buildGrid(list) {
    const cols = Math.ceil(this.w / CELL), rows = Math.ceil(this.h / CELL);
    const grid = new Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = [];
    for (const o of list) {
      const cx = clamp((o.x / CELL) | 0, 0, cols - 1), cy = clamp((o.y / CELL) | 0, 0, rows - 1);
      grid[cy * cols + cx].push(o);
    }
    return { grid, cols, rows };
  }

  nearest(G, x, y, range, filter) {
    const { grid, cols, rows } = G;
    const span = Math.ceil(range / CELL);
    const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
    let best = null, bd = range * range;
    for (let j = Math.max(0, cy - span); j <= Math.min(rows - 1, cy + span); j++) {
      for (let i = Math.max(0, cx - span); i <= Math.min(cols - 1, cx + span); i++) {
        for (const o of grid[j * cols + i]) {
          if (o.dead || (filter && !filter(o))) continue;
          const dx = o.x - x, dy = o.y - y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = o; }
        }
      }
    }
    return best;
  }

  move(c, tx, ty, away) {
    let want = c.a;
    if (tx != null) {
      want = Math.atan2(ty - c.y, tx - c.x) + (away ? Math.PI : 0);
    } else {
      want = c.a + (this.rnd() - 0.5) * 0.6;
    }
    let da = want - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += clamp(da, -0.35, 0.35);
    const sp = c.g.speed * (c.chasing ? this.opts.chase : 1);
    c.x += Math.cos(c.a) * sp;
    c.y += Math.sin(c.a) * sp;
    // soft walls
    if (c.x < 4) { c.x = 4; c.a = Math.PI - c.a; }
    if (c.x > this.w - 4) { c.x = this.w - 4; c.a = Math.PI - c.a; }
    if (c.y < 4) { c.y = 4; c.a = -c.a; }
    if (c.y > this.h - 4) { c.y = this.h - 4; c.a = -c.a; }
  }

  cost(c) {
    const P = c.kind === "prey" ? PREY : PRED;
    const z = c.g.size, s = c.g.speed;
    const k = c.kind === "pred" ? this.opts.speedCost * this.opts.predCost * (c.chasing ? 1.3 : 1) : this.opts.speedCost;
    return P.baseCost + k * s * s * (0.6 + 0.6 * z * z) + 0.0006 * c.g.sense;
  }

  step() {
    this.tick++;
    // Food regrowth
    const famine = this.tick < this.famineUntil;
    const rate = (famine ? 0.25 : 1) * this.opts.food * (this.w * this.h) / this.opts.regrow;
    let grow = rate;
    while (grow > 0 && this.food.length < this.foodCap) {
      if (grow >= 1 || this.rnd() < grow) this.spawnFood();
      grow -= 1;
    }

    const foodG = this.buildGrid(this.food);
    const preyG = this.buildGrid(this.prey);
    const predG = this.pred.length ? this.buildGrid(this.pred) : null;

    // Prey
    const babies = [];
    for (const c of this.prey) {
      if (c.dead) continue;
      const r = radiusOf(c);
      const threat = predG && this.nearest(predG, c.x, c.y, c.g.sense, (p) => p.g.size >= c.g.size * 0.95);
      if (threat) this.move(c, threat.x, threat.y, true);
      else {
        const f = this.nearest(foodG, c.x, c.y, c.g.sense);
        if (f) {
          this.move(c, f.x, f.y);
          if (Math.hypot(f.x - c.x, f.y - c.y) < r + 2) {
            f.dead = true;
            c.energy += PREY.foodEnergy * (0.7 + 0.3 * c.g.size);
          }
        } else this.move(c);
      }
      c.energy -= this.cost(c);
      c.age++;
      if (c.energy <= 0 || c.age > c.maxAge) { c.dead = true; continue; }
      if (c.energy > PREY.reproduce * (0.7 + 0.3 * c.g.size) && this.prey.length + babies.length < 650) {
        c.energy /= 2;
        c.children++;
        const kid = this.makeCreature("prey", c, c.x, c.y);
        kid.energy = c.energy;
        babies.push(kid);
      }
    }

    // Predators
    const predBabies = [];
    for (const p of this.pred) {
      if (p.dead) continue;
      const r = radiusOf(p);
      // Handling time: a fed predator digests before it hunts again
      const hungry = !(p.digest > 0) && this.prey.length > this.opts.refuge;
      if (!hungry) p.digest--;
      const target = hungry && this.nearest(preyG, p.x, p.y, p.g.sense, (q) => q.g.size < p.g.size);
      p.chasing = !!target;
      if (target) {
        this.move(p, target.x, target.y);
        if (Math.hypot(target.x - p.x, target.y - p.y) < r + radiusOf(target)) {
          target.dead = true;
          this.kills = (this.kills || 0) + 1;
          p.energy += this.opts.predGain * target.g.size;
          p.digest = this.opts.digest;
        }
      } else this.move(p);
      p.energy -= this.cost(p);
      p.age++;
      if (p.energy <= 0 || p.age > p.maxAge) { p.dead = true; continue; }
      if (p.energy > this.opts.predRepro && this.pred.length + predBabies.length < 120) {
        p.energy /= 2;
        p.children++;
        const kid = this.makeCreature("pred", p, p.x, p.y);
        kid.energy = p.energy;
        predBabies.push(kid);
      }
    }

    const hadPred = this.pred.length > 0;
    this.food = this.food.filter((f) => !f.dead);
    this.prey = this.prey.filter((c) => !c.dead).concat(babies);
    this.pred = this.pred.filter((c) => !c.dead).concat(predBabies);

    for (const b of babies) {
      if (b.gen > this.maxGen) this.maxGen = b.gen;
      if (b.g.speed > this.records.speed + 0.05 && this.tick > 600) {
        this.records.speed = b.g.speed;
        if (b.g.speed > 1.8 && this.tick - (this.lastRecordTick || 0) > 1800) {
          this.lastRecordTick = this.tick;
          this.emit("record", `New speed record: a creature evolved speed ${b.g.speed.toFixed(2)}.`);
        }
      }
    }

    // Story beats
    if (this.maxGen >= this.lastMilestoneGen + (this.lastMilestoneGen < 20 ? 10 : 25)) {
      this.lastMilestoneGen = this.maxGen - (this.maxGen % 5);
      this.emit("generation", `Generation ${this.maxGen} reached.`);
    }
    if (this.opts.autoPredators && !this.predatorsIntroduced && this.maxGen >= this.opts.predatorGen) this.addPredators(6);
    if (hadPred && this.pred.length === 0) {
      this.predatorsGoneAt = this.tick;
      this.emit("extinct", "Predators went extinct. Prey can relax — for now.");
    }
    if (this.opts.autoPredators && this.predatorsIntroduced && this.pred.length === 0 &&
        this.tick - (this.predatorsGoneAt ?? this.tick) > this.opts.migrateAfter && this.prey.length > 40) {
      for (let i = 0; i < 6; i++) this.pred.push(this.makeCreature("pred", null));
      this.predatorsGoneAt = undefined;
      this.emit("predators", "A new pack of predators migrated in.");
    }
    if (this.prey.length > this.records.peakPrey * 1.15 && this.prey.length > 120 && this.tick > 900) {
      this.records.peakPrey = this.prey.length;
      this.emit("boom", `Population boom: ${this.prey.length} prey.`);
    }
    if (this.prey.length === 0 && !this.extinct) {
      this.extinct = true;
      this.emit("extinct", "Life went extinct. Restart to try again.");
    }

    if (this.tick % 30 === 0) this.sample();
  }

  averages(list) {
    if (!list.length) return { speed: 0, size: 0, sense: 0 };
    let s = 0, z = 0, v = 0;
    for (const c of list) { s += c.g.speed; z += c.g.size; v += c.g.sense; }
    return { speed: s / list.length, size: z / list.length, sense: v / list.length };
  }

  sample() {
    const a = this.averages(this.prey);
    // Announce big shifts in the average prey genome
    if (this.prey.length > 10) {
      if (!this.announced) this.announced = { ...a };
      const words = { speed: ["faster", "slower"], size: ["bigger", "smaller"], sense: ["sharper-sighted", "shorter-sighted"] };
      for (const k of Object.keys(words)) {
        const from = this.announced[k], to = a[k];
        if (Math.abs(to - from) / from > 0.3) {
          const fmt = (v) => (k === "sense" ? Math.round(v) : v.toFixed(2));
          this.emit("trait", `Prey are evolving ${to > from ? words[k][0] : words[k][1]}: average ${GENES[k].label.toLowerCase()} ${fmt(from)} → ${fmt(to)}.`);
          this.announced[k] = to;
        }
      }
    }
    this.history.push({ t: this.tick, prey: this.prey.length, pred: this.pred.length, food: this.food.length, ...a });
    if (this.history.length > 480) this.history.shift();
  }

  findAt(x, y, radius = 14) {
    let best = null, bd = radius * radius;
    for (const c of this.prey.concat(this.pred)) {
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  resize(w, h) {
    const sx = w / this.w, sy = h / this.h;
    for (const o of [...this.food, ...this.prey, ...this.pred]) { o.x *= sx; o.y *= sy; }
    this.w = w;
    this.h = h;
  }
}
