/**
 * Mathematics and Physics Shared Utilities
 */

// Basic vector math
export const distanceSq = (x1, y1, z1, x2, y2, z2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return dx * dx + dy * dy + dz * dz;
};

export const applyGravity = (p1, p2, G, Mstr, dt, softening = 50) => {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let dz = p2.z - p1.z;
    
    let distSq = dx * dx + dy * dy + dz * dz;
    let hyp = Math.sqrt(distSq);

    let minDistance = p1.radius + p2.radius;

    if (hyp > minDistance) {
        let force = (G * p1.mass * Mstr) / (distSq + softening); 
        
        p1.mx += force * (dx / hyp) * dt;
        p1.my += force * (dy / hyp) * dt;
        p1.mz += force * (dz / hyp) * dt;
    }
};

export const handleCollision3D = (p1, p2, restitution = 0.8) => {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let dz = p2.z - p1.z;
    let distSq = dx * dx + dy * dy + dz * dz;
    let minDistance = p1.radius + p2.radius;

    if (distSq > 0 && distSq < minDistance * minDistance) {
        let dist = Math.sqrt(distSq);
        let overlap = minDistance - dist;
        let nx = dx / dist, ny = dy / dist, nz = dz / dist;
        
        let totalMass = p1.mass + p2.mass;
        let ratio1 = p2.mass / totalMass;
        let ratio2 = p1.mass / totalMass;

        // Positional correction
        p1.x -= nx * overlap * ratio1;
        p1.y -= ny * overlap * ratio1;
        p1.z -= nz * overlap * ratio1;
        
        p2.x += nx * overlap * ratio2;
        p2.y += ny * overlap * ratio2;
        p2.z += nz * overlap * ratio2;

        // Velocity impulse
        let v1x = p1.mx / p1.mass, v1y = p1.my / p1.mass, v1z = p1.mz / p1.mass;
        let v2x = p2.mx / p2.mass, v2y = p2.my / p2.mass, v2z = p2.mz / p2.mass;
        let rvx = v2x - v1x, rvy = v2y - v1y, rvz = v2z - v1z;
        let velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

        if (velAlongNormal < 0) {
            let j_impulse = -(1 + restitution) * velAlongNormal;
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
};
