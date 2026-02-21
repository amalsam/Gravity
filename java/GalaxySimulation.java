

import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * An auto-populating spiral galaxy simulation based on the existing Gravity
 * engine.
 * Instead of starting empty, this populates thousands of stars into stable
 * orbits
 * by calculating perfect perpendicular orbital velocity based on 2D Newtonian
 * gravity.
 */
public class GalaxySimulation extends JPanel implements Runnable {

    // ---------- Window / simulation constants --------------------------------
    private static final int WIDTH = 1500;
    private static final int HEIGHT = 800;
    private static final int TARGET_FPS = 100;

    // Physics parameters from Gravity.py
    private static final double G = 0.1;
    private static final double M = 10e7;
    private static final double DT = 0.001;

    // Central attractors
    private final Point attractor = new Point(WIDTH / 2, HEIGHT / 2);

    // ---------- State --------------------------------------------------------
    private final List<GalaxyStar> stars = new ArrayList<>();
    private final Random rng = new Random();

    // Performance tracking
    private long lastFrameTime = System.nanoTime();
    private int fps = 0;

    // Off-screen buffers for smooth rendering (double buffering)
    private BufferedImage bufferDraw;
    private BufferedImage bufferDisplay;

    // =========================================================================
    // Inner Class: GalaxyStar
    // =========================================================================
    /**
     * Specialized star class incorporating Color to give a realistic galaxy effect.
     */
    private class GalaxyStar {
        double x, y;
        double mass = 2.0;
        double momentumX, momentumY;
        Color color;

        public GalaxyStar(double x, double y, double mx, double my, Color color) {
            this.x = x;
            this.y = y;
            this.momentumX = mx;
            this.momentumY = my;
            this.color = color;
        }

        public void move(double x2, double y2) {
            double dx = x - x2;
            double dy = y - y2;
            double hyp = Math.sqrt(dx * dx + dy * dy);

            if (hyp < 1)
                return;

            // Using the Gravity.py python logic exactly (force is 1/r)
            double theta = Math.atan2(y2 - y, x2 - x);
            double force = (G * mass * M) / hyp;

            double forceX = force * Math.cos(theta);
            double forceY = force * Math.sin(theta);

            momentumX += forceX * DT;
            momentumY += forceY * DT;

            x += (momentumX / mass) * DT;
            y += (momentumY / mass) * DT;
        }
    }

    // =========================================================================
    // Construction & wiring
    // =========================================================================

    public GalaxySimulation() {
        setPreferredSize(new Dimension(WIDTH, HEIGHT));
        setBackground(Color.BLACK);
        bufferDraw = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        bufferDisplay = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);

        generateGalaxy();
    }

    private void generateGalaxy() {
        int numStars = 8000;
        int arms = 3; // Number of spiral arms
        double armSpread = 0.8; // How spread out the arms are
        double maxRadius = Math.min(WIDTH, HEIGHT) / 2.0 - 50;

        // In 2D gravity where Force = GMm/r,
        // Centripetal force = mv^2/r
        // GMm/r = mv^2/r => v^2 = GM => v = sqrt(GM)
        // This means exact orbital velocity is CONSTANT regardless of radius!
        double velocityMag = Math.sqrt(G * M);
        double momentumMag = velocityMag * 2.0; // p = mv, with m=2

        for (int i = 0; i < numStars; i++) {
            // Distance from center (squared distribution clusters more in the center)
            double rString = rng.nextDouble();
            double r = 10 + rString * rString * maxRadius;

            // Base angle depending which arm we're on
            double armAngle = (rng.nextInt(arms) * (2 * Math.PI) / arms);

            // The further out, the more it spirals around (logarithmic spiral)
            double spiralOffset = Math.log(r) * 1.5;

            // Add some jitter so they aren't perfectly on lines
            double jitter = (rng.nextDouble() - 0.5) * armSpread;

            double angle = armAngle + spiralOffset + jitter;

            // Position
            double px = attractor.x + Math.cos(angle) * r;
            double py = attractor.y + Math.sin(angle) * r;

            // Calculate perpendicular orbital velocity (tangent vector)
            // Adding PI/2 to rotate velocity vector 90 degrees for circular orbit
            double velAngle = angle + (Math.PI / 2);

            double mx = Math.cos(velAngle) * momentumMag;
            double my = Math.sin(velAngle) * momentumMag;

            // Give a tiny dash of chaos to the starting momentum so it's not perfectly
            // uniform
            mx *= (0.95 + rng.nextDouble() * 0.1);
            my *= (0.95 + rng.nextDouble() * 0.1);

            // Color gradient based on distance
            // Core is bright blue-white, mid is yellow-orange, outer is red-purple
            Color c;
            double distRatio = r / maxRadius;
            if (distRatio < 0.2) {
                c = new Color(200, 220, 255); // Blue-white
            } else if (distRatio < 0.5) {
                c = new Color(255, 200, 100); // Yellowish
            } else if (distRatio < 0.8) {
                c = new Color(255, 100, 50); // Red-orange
            } else {
                c = new Color(150, 50, 150); // Purple
            }

            // Diminish brightness slightly based on random noise
            int brightnessDrop = rng.nextInt(50);
            c = new Color(
                    Math.max(0, c.getRed() - brightnessDrop),
                    Math.max(0, c.getGreen() - brightnessDrop),
                    Math.max(0, c.getBlue() - brightnessDrop));

            stars.add(new GalaxyStar(px, py, mx, my, c));
        }
    }

    // =========================================================================
    // Game loop
    // =========================================================================

    @Override
    public void run() {
        long targetNs = 1_000_000_000L / TARGET_FPS;

        while (true) {
            long start = System.nanoTime();

            // --- Update & render to off-screen buffer -----------------------
            Graphics2D g2 = bufferDraw.createGraphics();
            // Use antialiasing selectively if desired, but pixel plotting is fine without
            // it

            // Try to add a very slight motion blur trail effect using an alpha black
            // overlay
            g2.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.4f));
            g2.setColor(new Color(5, 5, 10)); // Deep dark space color
            g2.fillRect(0, 0, WIDTH, HEIGHT);

            // Switch back to solid drawing for stars
            g2.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 1.0f));

            for (GalaxyStar p : stars) {
                p.move(attractor.x, attractor.y);
                int px = (int) p.x;
                int py = (int) p.y;

                if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
                    g2.setColor(p.color);
                    // Core stars draw bigger
                    int size = (Math.abs(px - attractor.x) < 50 && Math.abs(py - attractor.y) < 50) ? 2 : 1;
                    g2.fillRect(px, py, size, size);
                }
            }

            // Black hole (Attractor) in the center
            g2.setColor(Color.BLACK);
            g2.fillOval(attractor.x - 5, attractor.y - 5, 10, 10);

            // Event horizon glow
            g2.setColor(new Color(255, 255, 255, 50));
            g2.fillOval(attractor.x - 12, attractor.y - 12, 24, 24);

            // HUD text
            g2.setColor(Color.WHITE);
            g2.setFont(new Font("SansSerif", Font.PLAIN, 16));
            g2.drawString("Galaxy Stars : " + stars.size(), 20, 30);
            g2.drawString("FPS          : " + fps, 20, 50);

            g2.dispose();

            // --- Swap buffers and push to screen --------------------------------------
            synchronized (this) {
                BufferedImage temp = bufferDisplay;
                bufferDisplay = bufferDraw;
                bufferDraw = temp;
            }
            repaint();

            // --- FPS calculation -------------------------------------------
            long now = System.nanoTime();
            long elapsed = now - lastFrameTime;
            if (elapsed > 0)
                fps = (int) (1_000_000_000L / elapsed);
            lastFrameTime = now;

            // --- Cap to target FPS ------------------------------------------
            long sleepNs = targetNs - (now - start);
            if (sleepNs > 0) {
                try {
                    Thread.sleep(sleepNs / 1_000_000, (int) (sleepNs % 1_000_000));
                } catch (InterruptedException ignored) {
                }
            }
        }
    }

    // =========================================================================
    // Painting
    // =========================================================================

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        synchronized (this) {
            if (bufferDisplay != null) {
                g.drawImage(bufferDisplay, 0, 0, null);
            }
        }
    }

    // =========================================================================
    // Entry point
    // =========================================================================

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Spiral Galaxy Simulation");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

            GalaxySimulation sim = new GalaxySimulation();
            frame.add(sim);
            frame.pack();
            frame.setLocationRelativeTo(null); // Center on screen
            frame.setResizable(false);
            frame.setVisible(true);

            // Start the simulation on a dedicated thread
            Thread t = new Thread(sim, "galaxy-loop");
            t.setDaemon(true);
            t.start();
        });
    }
}
