
import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * A Black Hole simulation where the mouse pointer acts as an incredibly massive
 * object that consumes particles.
 */
public class BlackholeSimulation extends JPanel implements Runnable {

    // ---------- Window / simulation constants --------------------------------
    private static final int WIDTH = 1500;
    private static final int HEIGHT = 800;
    private static final int TARGET_FPS = 100;

    // Physics parameters
    private static final double G = 1.0;
    private static final double M = 5e6; // Adjusted for 1/r^2 stable orbits
    private static final double DT = 0.005; // Slightly faster time step
    private static final double EVENT_HORIZON_RADIUS = 50.0;

    // State
    private final List<BlackholeParticle> particles = new ArrayList<>();
    private final Random rng = new Random();

    // Mouse pointer (The Black Hole)
    private Point blackholePos = new Point(WIDTH / 2, HEIGHT / 2);
    private boolean mouseInside = true;

    // Performance tracking
    private long lastFrameTime = System.nanoTime();
    private int fps = 0;
    private int particlesConsumed = 0;

    // Off-screen buffers for smooth rendering (double buffering)
    private BufferedImage bufferDraw;
    private BufferedImage bufferDisplay;

    // =========================================================================
    // Inner Class: BlackholeParticle
    // =========================================================================
    /**
     * Specialized particle class for the accretion disk
     */
    private class BlackholeParticle {
        double x, y;
        double mass = 2.0;
        double momentumX, momentumY;
        boolean consumed = false;

        public BlackholeParticle(double x, double y, double mx, double my) {
            this.x = x;
            this.y = y;
            this.momentumX = mx;
            this.momentumY = my;
        }

        public void move(double x2, double y2) {
            if (consumed)
                return;

            double dx = x - x2;
            double dy = y - y2;
            double distanceSq = dx * dx + dy * dy;
            double hyp = Math.sqrt(distanceSq);

            // Event horizon check
            if (hyp < EVENT_HORIZON_RADIUS) {
                consumed = true;
                particlesConsumed++;
                return;
            }

            // Using pure Newtonian gravity formula 1/r^2
            double force = (G * mass * M) / distanceSq;
            double theta = Math.atan2(y2 - y, x2 - x);

            double forceX = force * Math.cos(theta);
            double forceY = force * Math.sin(theta);

            momentumX += forceX * DT;
            momentumY += forceY * DT;

            x += (momentumX / mass) * DT;
            y += (momentumY / mass) * DT;
        }

        public double getSpeed() {
            return Math.sqrt(momentumX * momentumX + momentumY * momentumY) / mass;
        }
    }

    // =========================================================================
    // Construction & wiring
    // =========================================================================

    public BlackholeSimulation() {
        setPreferredSize(new Dimension(WIDTH, HEIGHT));
        setBackground(Color.BLACK);
        bufferDraw = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        bufferDisplay = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);

        // Initial population
        for (int i = 0; i < 5000; i++) {
            spawnParticle();
        }

        // --- Mouse listeners --------------------------------------------------
        addMouseMotionListener(new MouseMotionAdapter() {
            @Override
            public void mouseMoved(MouseEvent e) {
                blackholePos.x = e.getX();
                blackholePos.y = e.getY();
            }

            @Override
            public void mouseDragged(MouseEvent e) {
                blackholePos.x = e.getX();
                blackholePos.y = e.getY();
            }
        });

        addMouseListener(new MouseAdapter() {
            @Override
            public void mouseEntered(MouseEvent e) {
                mouseInside = true;
            }

            @Override
            public void mouseExited(MouseEvent e) {
                // If mouse leaves, park the black hole in the center so it doesn't get stuck on
                // edges
                mouseInside = false;
                blackholePos.x = WIDTH / 2;
                blackholePos.y = HEIGHT / 2;
            }
        });
    }

    private void spawnParticle() {
        double angle = rng.nextDouble() * 2 * Math.PI;

        // Spawn particles in a disk from R=70 to R=800, concentrating near the center
        double r = 70 + Math.pow(rng.nextDouble(), 1.5) * 730;

        double px = blackholePos.x + Math.cos(angle) * r;
        double py = blackholePos.y + Math.sin(angle) * r;

        // Exact circular orbital velocity: v = sqrt(GM/r)
        double orbitSpeed = Math.sqrt((G * M) / r);

        // Tangential velocity vector
        double velAngle = angle + (Math.PI / 2); // 90 degrees offset for orbit

        // Minor randomness so the disk has thickness and mixing
        double mx = Math.cos(velAngle) * orbitSpeed * 2.0; // mass is 2.0
        double my = Math.sin(velAngle) * orbitSpeed * 2.0;

        // Tiny jitter in momentum
        mx *= (0.98 + rng.nextDouble() * 0.04);
        my *= (0.98 + rng.nextDouble() * 0.04);

        particles.add(new BlackholeParticle(px, py, mx, my));
    }

    private Color getParticleColor(double speed, boolean isSecondary) {
        int r, g, b;
        if (speed > 220) {
            r = 220;
            g = 240;
            b = 255; // Blue-white
        } else if (speed > 150) {
            r = 255;
            g = 230;
            b = 180; // Yellow-white
        } else if (speed > 100) {
            r = 255;
            g = 150;
            b = 50; // Orange
        } else {
            r = 180;
            g = 60;
            b = 30; // Deep red
        }

        int alpha = isSecondary ? 100 : 255; // Ghostly halos
        return new Color(r, g, b, alpha);
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

            // Use an alpha composite to create a motion blur/trail effect
            g2.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.2f));
            g2.setColor(Color.BLACK);
            g2.fillRect(0, 0, WIDTH, HEIGHT);

            // Switch back to solid drawing for particles
            g2.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 1.0f));

            // Perspective variables for real Gargantua equations
            double tilt = 0.15; // Tilted disk
            double sinTilt = Math.sin(tilt);
            double cosTilt = Math.cos(tilt);
            double RE = 68.0; // Einstein radius
            double R_SHADOW = 50.0; // Event horizon shadow

            int activeCount = 0;
            for (BlackholeParticle p : particles) {
                p.move(blackholePos.x, blackholePos.y);
                if (!p.consumed)
                    activeCount++;
            }

            // Remove consumed and respawn
            for (int i = particles.size() - 1; i >= 0; i--) {
                if (particles.get(i).consumed) {
                    particles.remove(i);
                    spawnParticle();
                }
            }

            // --- PASS 1: Secondary Images (Behind the Black Hole Shadow) ---
            for (BlackholeParticle p : particles) {
                double px = p.x - blackholePos.x;
                double pz = p.y - blackholePos.y; // The 2D Y axis acts as our 3D Z axis (depth)

                double u = px;
                double v = pz * sinTilt;
                double w = pz * cosTilt; // w > 0 means behind

                if (w > 0) {
                    double beta = Math.sqrt(u * u + v * v);
                    if (beta < 0.1)
                        beta = 0.1;

                    double phi = Math.atan2(v, u);
                    // Secondary image radius (microlensing formula)
                    double r_minus = 0.5 * (Math.sqrt(beta * beta + 4 * RE * RE) - beta);

                    // Only draw if outside the shadow, otherwise it's blocked
                    if (r_minus > R_SHADOW) {
                        double renderX = blackholePos.x + r_minus * Math.cos(phi + Math.PI);
                        double renderY = blackholePos.y + r_minus * Math.sin(phi + Math.PI);

                        double speed = p.getSpeed();
                        Color c = getParticleColor(speed, true);
                        g2.setColor(c);
                        g2.fillRect((int) renderX, (int) renderY, 2, 2);
                    }
                }
            }

            // --- PASS 2: Black Hole Shadow ---
            // Draw a pure black circle to represent the light-trapping shadow
            g2.setColor(Color.BLACK);
            g2.fillOval((int) (blackholePos.x - R_SHADOW), (int) (blackholePos.y - R_SHADOW), (int) (R_SHADOW * 2),
                    (int) (R_SHADOW * 2));

            // Draw photon ring glow around the edge of the shadow
            g2.setColor(new Color(255, 230, 200, 80));
            g2.setStroke(new BasicStroke(3.0f));
            g2.drawOval((int) (blackholePos.x - R_SHADOW), (int) (blackholePos.y - R_SHADOW), (int) (R_SHADOW * 2),
                    (int) (R_SHADOW * 2));
            g2.setColor(new Color(255, 255, 255, 150));
            g2.setStroke(new BasicStroke(1.0f));
            g2.drawOval((int) (blackholePos.x - R_SHADOW), (int) (blackholePos.y - R_SHADOW), (int) (R_SHADOW * 2),
                    (int) (R_SHADOW * 2));

            // --- PASS 3: Primary Images (In Front of the Black Hole Shadow) ---
            for (BlackholeParticle p : particles) {
                double px = p.x - blackholePos.x;
                double pz = p.y - blackholePos.y;

                double u = px;
                double v = pz * sinTilt;
                double w = pz * cosTilt;

                double beta = Math.sqrt(u * u + v * v);
                if (beta < 0.1)
                    beta = 0.1;

                double phi = Math.atan2(v, u);

                // Primary image radius (microlensing formula)
                double r_plus = 0.5 * (beta + Math.sqrt(beta * beta + 4 * RE * RE));

                double renderX = blackholePos.x + r_plus * Math.cos(phi);
                double renderY = blackholePos.y + r_plus * Math.sin(phi);

                double speed = p.getSpeed();
                Color c = getParticleColor(speed, false);

                // For extremely fast particles near the event horizon, give them a bright core
                if (speed > 220) {
                    g2.setColor(new Color(c.getRed(), c.getGreen(), c.getBlue(), 100));
                    g2.fillRect((int) renderX - 1, (int) renderY - 1, 4, 4);
                }

                g2.setColor(c);
                g2.fillRect((int) renderX, (int) renderY, 2, 2);
            }

            // --- HUD --------------------------------------------------------
            g2.setColor(Color.WHITE);
            g2.setFont(new Font("Monospaced", Font.BOLD, 14));
            g2.drawString(String.format("BH Mass        : %.1e", M), 20, 30);
            g2.drawString(String.format("Particles      : %d", activeCount), 20, 50);
            g2.drawString(String.format("Matter Consumed: %d", particlesConsumed), 20, 70);
            g2.drawString(String.format("FPS            : %d", fps), 20, 90);
            if (!mouseInside) {
                g2.drawString("MOVE MOUSE INTO WINDOW", WIDTH / 2 - 100, 30);
            }

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
            JFrame frame = new JFrame("Interactive Black Hole Simulation");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

            BlackholeSimulation sim = new BlackholeSimulation();
            frame.add(sim);
            frame.pack();
            frame.setLocationRelativeTo(null); // Center on screen
            frame.setResizable(false);
            frame.setVisible(true);

            // Start the simulation on a dedicated thread
            Thread t = new Thread(sim, "blackhole-loop");
            t.setDaemon(true);
            t.start();
        });
    }
}
