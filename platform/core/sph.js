// 2D particle fluid — "double density relaxation" (Clavet, Beaudoin & Poulin,
// "Particle-based Viscoelastic Fluid Simulation", 2005). An SPH-style method:
// density is a kernel-weighted sum over neighbours, pressure pushes particles
// apart toward a rest density, and a near-pressure term stops clumping.
// It works in pixel/frame units and stays stable at real-time step sizes.
// A uniform grid keeps neighbour search roughly linear in particle count.

export const H = 22; // interaction radius (px)
const REST = 2;
const K = 0.012; // stiffness
const K_NEAR = 0.03; // near stiffness
const GRAVITY = 0.32; // px / frame²

export class Fluid {
  constructor(w, h, cap = 1500) {
    this.w = w;
    this.h = h;
    this.n = 0;
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.px = new Float32Array(cap);
    this.py = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.rho = new Float32Array(cap);
    this.next = new Int32Array(cap);
    this.gravity = [0, 1];
    this.viscosity = 0.15; // linear viscosity σ
  }

  add(x, y, vx = 0, vy = 0) {
    if (this.n >= this.cap) return false;
    const i = this.n++;
    this.x[i] = x + (Math.random() - 0.5) * 0.4;
    this.y[i] = y + (Math.random() - 0.5) * 0.4;
    this.vx[i] = vx;
    this.vy[i] = vy;
    return true;
  }

  clear() {
    this.n = 0;
  }

  block(x0, y0, cols, rows, spacing = H * 0.45) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.add(x0 + c * spacing, y0 + r * spacing);
  }

  buildGrid() {
    const cols = Math.ceil(this.w / H) + 2, rows = Math.ceil(this.h / H) + 2;
    if (!this.heads || this.heads.length !== cols * rows) this.heads = new Int32Array(cols * rows);
    this.heads.fill(-1);
    this.gc = cols;
    this.gr = rows;
    for (let i = 0; i < this.n; i++) {
      const cx = Math.min(cols - 1, Math.max(0, (this.x[i] / H) | 0));
      const cy = Math.min(rows - 1, Math.max(0, (this.y[i] / H) | 0));
      const k = cy * cols + cx;
      this.next[i] = this.heads[k];
      this.heads[k] = i;
    }
  }

  // Collect neighbours of i within H into a scratch list (j, q, ux, uy)
  neighbours(i, out) {
    out.length = 0;
    const xi = this.x[i], yi = this.y[i];
    const cx = Math.min(this.gc - 1, Math.max(0, (xi / H) | 0));
    const cy = Math.min(this.gr - 1, Math.max(0, (yi / H) | 0));
    for (let dy = -1; dy <= 1; dy++) {
      const yy = cy + dy;
      if (yy < 0 || yy >= this.gr) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx + dx;
        if (xx < 0 || xx >= this.gc) continue;
        for (let j = this.heads[yy * this.gc + xx]; j !== -1; j = this.next[j]) {
          if (j === i) continue;
          const rx = this.x[j] - xi, ry = this.y[j] - yi;
          const r2 = rx * rx + ry * ry;
          if (r2 >= H * H || r2 < 1e-6) continue;
          const r = Math.sqrt(r2);
          out.push(j, r / H, rx / r, ry / r);
        }
      }
    }
    return out;
  }

  step(push) {
    const { x, y, px, py, vx, vy, rho } = this;
    const n = this.n;
    const [gx, gy] = this.gravity;
    const nb = this._nb || (this._nb = []);

    // 1. External forces (+ optional pointer push)
    for (let i = 0; i < n; i++) {
      vx[i] += gx * GRAVITY;
      vy[i] += gy * GRAVITY;
      if (push) {
        const dx = x[i] - push.x, dy = y[i] - push.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < push.r * push.r) {
          const f = (1 - Math.sqrt(d2) / push.r) * push.strength;
          vx[i] += push.vx * f;
          vy[i] += push.vy * f;
        }
      }
    }

    // 2. Viscosity impulses
    this.buildGrid();
    const sigma = this.viscosity, beta = 0.02;
    for (let i = 0; i < n; i++) {
      this.neighbours(i, nb);
      for (let k = 0; k < nb.length; k += 4) {
        const j = nb[k];
        if (j < i) continue;
        const q = nb[k + 1], ux = nb[k + 2], uy = nb[k + 3];
        const u = (vx[i] - vx[j]) * ux + (vy[i] - vy[j]) * uy;
        if (u > 0) {
          const I = (1 - q) * (sigma * u + beta * u * u) * 0.5;
          vx[i] -= I * ux; vy[i] -= I * uy;
          vx[j] += I * ux; vy[j] += I * uy;
        }
      }
    }

    // 3. Advance to predicted positions
    for (let i = 0; i < n; i++) {
      px[i] = x[i]; py[i] = y[i];
      x[i] += vx[i]; y[i] += vy[i];
    }

    // 4. Double density relaxation
    this.buildGrid();
    for (let i = 0; i < n; i++) {
      this.neighbours(i, nb);
      let d = 0, dn = 0;
      for (let k = 0; k < nb.length; k += 4) {
        const t = 1 - nb[k + 1];
        d += t * t;
        dn += t * t * t;
      }
      rho[i] = d;
      const P = K * (d - REST), Pn = K_NEAR * dn;
      let dxi = 0, dyi = 0;
      for (let k = 0; k < nb.length; k += 4) {
        const j = nb[k], t = 1 - nb[k + 1];
        const D = (P * t + Pn * t * t) * 0.5 * H;
        const ux = nb[k + 2], uy = nb[k + 3];
        x[j] += D * ux; y[j] += D * uy;
        dxi -= D * ux; dyi -= D * uy;
      }
      x[i] += dxi; y[i] += dyi;
    }

    // 5. Walls, then velocity from the position change
    const m = 4;
    for (let i = 0; i < n; i++) {
      if (x[i] < m) x[i] = m;
      if (x[i] > this.w - m) x[i] = this.w - m;
      if (y[i] < m) y[i] = m;
      if (y[i] > this.h - m) y[i] = this.h - m;
      vx[i] = x[i] - px[i];
      vy[i] = y[i] - py[i];
      // keep things sane if a user flings particles hard
      const s2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (s2 > 400) { const s = 20 / Math.sqrt(s2); vx[i] *= s; vy[i] *= s; }
    }
  }

  stats() {
    let maxV = 0, avg = 0;
    for (let i = 0; i < this.n; i++) {
      maxV = Math.max(maxV, Math.hypot(this.vx[i], this.vy[i]));
      avg += this.rho[i];
    }
    return { maxV, avgRho: avg / Math.max(1, this.n) };
  }
}
