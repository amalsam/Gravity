/**
 * Shared Canvas Rendering Utilities
 */

export const drawCircle = (ctx, x, y, radius, color, alpha = 1.0) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(radius, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
};

export const clearCanvas = (ctx, width, height, bgColor = 'rgb(20, 20, 20)', alpha = 1.0) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
};

export const applyCameraProjection = (particle, cam, fwd, right, up, fov) => {
    let dx = particle.x - cam.x;
    let dy = particle.y - cam.y;
    let dz = particle.z - cam.z;
    
    let depth = dx * fwd.x + dy * fwd.y + dz * fwd.z;
    if (depth < 10) return null; // Behind camera
    
    let scale = fov / depth; 
    let drawnRadius = particle.radius * scale;
    if (drawnRadius < 0.2) return null; // Too small
    
    let projX = dx * right.x + dy * right.y + dz * right.z;
    let projY = dx * up.x    + dy * up.y    + dz * up.z;

    return {
        drawnX: projX * scale,
        drawnY: projY * scale,
        drawnRadius,
        depth
    };
};
