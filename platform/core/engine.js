class SimulationEngine {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.isRunning = false;
        this.animationId = null;
        this.lastTime = 0;
        this.particles = [];
    }

    start(updateFn, drawFn) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        
        const loop = (timestamp) => {
            if (!this.isRunning) return;
            
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            // Clear canvas
            this.ctx.fillStyle = this.config.backgroundColor || 'rgb(20, 20, 20)';
            this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

            updateFn(deltaTime, this);
            drawFn(this.ctx, this);

            this.animationId = requestAnimationFrame(loop);
        };

        this.animationId = requestAnimationFrame(loop);
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    addParticle(particle) {
        this.particles.push(particle);
    }

    clearParticles() {
        this.particles = [];
    }
}

export default SimulationEngine;
