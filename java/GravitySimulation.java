
import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Java recreation of Gravity.py
 *
 * Controls (same as Python version):
 * CTRL (hold) – spawn a single particle at mouse position
 * 1 (hold) – spawn a horizontal line of particles at mouse Y
 * 2 (hold) – spawn a circle cluster of particles at mouse position
 * 3 (hold) – spawn a vertical line of particles at mouse X
 * ESC – quit
 *
 * Rendering is done with a BufferedImage (double-buffered) for smooth
 * animation.
 */
public class GravitySimulation extends JPanel implements Runnable {

    // ---------- Window / simulation constants --------------------------------
    private static final int WIDTH = 1500;
    private static final int HEIGHT = 800;
    private static final int TARGET_FPS = 100;

    // Central attractors (mirrors obj1 in Python)
    private final Point attractor = new Point(WIDTH / 2, HEIGHT / 2);

    // ---------- State --------------------------------------------------------
    private final List<Particle> particles = new ArrayList<>();
    private final Random rng = new Random();

    // Keyboard state
    private boolean keyCtrl = false;
    private boolean key1 = false;
    private boolean key2 = false;
    private boolean key3 = false;

    // Mouse position
    private int mouseX = WIDTH / 2;
    private int mouseY = HEIGHT / 2;

    // Performance tracking
    private long lastFrameTime = System.nanoTime();
    private int fps = 0;

    // Off-screen buffers for smooth rendering (double buffering)
    private BufferedImage bufferDraw;
    private BufferedImage bufferDisplay;

    // =========================================================================
    // Construction & wiring
    // =========================================================================

    public GravitySimulation() {
        setPreferredSize(new Dimension(WIDTH, HEIGHT));
        setBackground(Color.BLACK);
        bufferDraw = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        bufferDisplay = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);

        // --- Key listeners ---------------------------------------------------
        setFocusable(true);
        addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                switch (e.getKeyCode()) {
                    case KeyEvent.VK_CONTROL -> keyCtrl = true;
                    case KeyEvent.VK_1 -> key1 = true;
                    case KeyEvent.VK_2 -> key2 = true;
                    case KeyEvent.VK_3 -> key3 = true;
                    case KeyEvent.VK_ESCAPE -> System.exit(0);
                }
            }

            @Override
            public void keyReleased(KeyEvent e) {
                switch (e.getKeyCode()) {
                    case KeyEvent.VK_CONTROL -> keyCtrl = false;
                    case KeyEvent.VK_1 -> key1 = false;
                    case KeyEvent.VK_2 -> key2 = false;
                    case KeyEvent.VK_3 -> key3 = false;
                }
            }
        });

        // --- Mouse listener --------------------------------------------------
        addMouseMotionListener(new MouseMotionAdapter() {
            @Override
            public void mouseMoved(MouseEvent e) {
                updateMouse(e);
            }

            @Override
            public void mouseDragged(MouseEvent e) {
                updateMouse(e);
            }
        });
    }

    private void updateMouse(MouseEvent e) {
        mouseX = e.getX();
        mouseY = e.getY();
    }

    // =========================================================================
    // Particle generators (mirrors Python functions)
    // =========================================================================

    /**
     * Mirrors generate_circle() — 100 particles uniformly inside a circle of r=50
     */
    private void generateCircle(int cx, int cy) {
        for (int i = 0; i < 100; i++) {
            double ang = rng.nextDouble() * 2 * Math.PI;
            double hyp = Math.sqrt(rng.nextDouble()) * 50;
            double x = cx + Math.cos(ang) * hyp;
            double y = cy + Math.sin(ang) * hyp;
            particles.add(new Particle(x, y));
        }
    }

    /** Mirrors generate_line() — 100 particles spread across width at given Y */
    private void generateLine(int y) {
        for (int i = 0; i < 100; i++) {
            int x = rng.nextInt(WIDTH);
            particles.add(new Particle(x, y));
        }
    }

    /** Mirrors generate_line2() — 100 particles spread across height at given X */
    private void generateLine2(int x) {
        for (int i = 0; i < 100; i++) {
            int y = rng.nextInt(HEIGHT);
            particles.add(new Particle(x, y));
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

            // --- Handle input ------------------------------------------------
            if (keyCtrl)
                particles.add(new Particle(mouseX, mouseY));
            if (key1)
                generateLine(mouseY);
            if (key2)
                generateCircle(mouseX, mouseY);
            if (key3)
                generateLine2(mouseX);

            // --- Update & render to off-screen buffer -----------------------
            Graphics2D g2 = bufferDraw.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                    RenderingHints.VALUE_ANTIALIAS_ON);

            // Background (20,20,20) – matches Python screen.fill((20,20,20))
            g2.setColor(new Color(20, 20, 20));
            g2.fillRect(0, 0, WIDTH, HEIGHT);

            // Move and draw particles
            g2.setColor(Color.WHITE);
            for (Particle p : particles) {
                p.move(attractor.x, attractor.y);
                int px = (int) p.x;
                int py = (int) p.y;
                // Only draw if on screen
                if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
                    g2.fillRect(px, py, 1, 1); // 1-pixel dot, same as r=1 circle
                }
            }

            // Central attractor — yellow circle, r=15 (matches Python)
            g2.setColor(Color.YELLOW);
            int ar = 15;
            g2.fillOval(attractor.x - ar, attractor.y - ar, ar * 2, ar * 2);

            // HUD text
            g2.setColor(Color.WHITE);
            g2.setFont(new Font("SansSerif", Font.PLAIN, 18));
            g2.drawString("Particles : " + particles.size(), 20, 40);
            g2.drawString("FPS       : " + fps, 20, 65);
            g2.drawString("Controls: Ctrl=particle  1=h-line  2=circle  3=v-line", 20, HEIGHT - 20);

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
            JFrame frame = new JFrame("Gravity Simulation");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

            GravitySimulation sim = new GravitySimulation();
            frame.add(sim);
            frame.pack();
            frame.setLocationRelativeTo(null);
            frame.setResizable(false);
            frame.setVisible(true);

            // Start the simulation on a dedicated thread
            Thread t = new Thread(sim, "gravity-loop");
            t.setDaemon(true);
            t.start();
        });
    }
}
