
/**
 * Represents a single particle attracted to a central mass via Newtonian
 * gravity.
 * Mirrors the Python Particle class and move_numba function from Gravity.py.
 */
public class Particle {

    // Gravitational constant (matches Python G = 0.1)
    private static final double G = 0.1;
    // Central mass (matches Python M = 10e7)
    private static final double M = 10e7;
    // Time step (matches Python dt = 0.001)
    private static final double DT = 0.001;
    // Particle mass (matches Python self.mass = 2)
    private static final double MASS = 2.0;

    public double x;
    public double y;
    // Momentum (matches Python momentum_x/y = 500)
    public double momentumX = 500;
    public double momentumY = 500;
    public double distance = 0;

    public Particle(double x, double y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Update position/momentum toward the attractor at (x2, y2).
     * Mirrors the move_numba function exactly.
     */
    public void move(double x2, double y2) {
        double dx = x - x2;
        double dy = y - y2;
        double hyp = Math.sqrt(dx * dx + dy * dy);

        if (hyp < 1) {
            distance = hyp;
            return;
        }

        double theta = Math.atan2(y2 - y, x2 - x);
        double force = (G * MASS * M) / hyp;
        double forceX = force * Math.cos(theta);
        double forceY = force * Math.sin(theta);

        momentumX += forceX * DT;
        momentumY += forceY * DT;
        x += momentumX / MASS * DT;
        y += momentumY / MASS * DT;
        distance = hyp;
    }
}
