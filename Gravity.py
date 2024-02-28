import math,random
from numba import njit
import pygame
import sys
from random import randrange

clock = pygame.time.Clock()
WIDTH = 1500
HEIGHT = 800
screen = pygame.display.set_mode((WIDTH, HEIGHT))

G = 0.1
M = 10e7
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

# colors = []

# # Adjust the range values to ensure a good variety of colors
# for r in range(0, 256, 10):  # Red component ranges from 100 to 255
#     for g in range(0, 256, 10):  # Green component ranges from 100 to 255
#         for b in range(0, 256, 10):  # Blue component ranges from 100 to 255
#             colors.append((b, g, r))

r0 = 10
pygame.init()
font = pygame.font.Font("freesansbold.ttf", 20)



def draw_text(surf, text, size, x, y): 
    text_surface = font.render(text, True, "white")     
    text_rect = text_surface.get_rect()
    text_rect.midtop = (x, y)
    surf.blit(text_surface, text_rect)

# color_iter = iter(colors)

class Particle:
    def __init__(self, x, y):
        # global color_iter
        # try:
        #     color = next(color_iter)
        # except:
        #     color_iter = iter(colors)
        #     color =next(color_iter)
        self.g = G
        self.mass = 2
        self.x = x
        self.y = y
        self.momentum_x = 500
        self.momentum_y = 500
        self.dt = 0.001
        self.color = WHITE
        #self.distance = 100 # distance from center initially sample number

    def move(self, x2, y2):
        pos = move_numba(self.x, self.y, self.momentum_x, self.momentum_y, self.mass, self.dt, x2, y2, self.g, M)
        self.x = pos[0]
        self.y = pos[1]
        self.momentum_x =pos[2]
        self.momentum_y =pos[3]
        self.distance = pos[4]
        
        # if self.distance> 255*2:
        #     self.color = ((0 ,100,0))
        # else:
        #     self.color = ((int(255-(self.distance/2)) ,100,0))
        
        return self.x,self.y
        

#using numba just in time ,this will speedup mathematical calculations
@njit(fastmath=True)
def move_numba(x, y, momentum_x, momentum_y, mass, dt, x2, y2, g, M):
    hyp = math.sqrt((x - x2) ** 2 + (y - y2) ** 2)
    if hyp <1:
        return x,y,momentum_x, momentum_y, hyp
    
    theta = math.atan2(y2 - y, x2 - x)
    force = (g * mass * M) / hyp        
    force_x = force * math.cos(theta)
    force_y = force * math.sin(theta)
    momentum_x += force_x * dt
    momentum_y += force_y * dt
    x += momentum_x / mass * dt
    y += momentum_y / mass * dt
    return x, y, momentum_x, momentum_y,hyp


particles = []

def generate_circle(centerX,centerY):
    for i in range(100):
        ang = random.uniform(0, 1) * 2 * math.pi
        hyp = math.sqrt(random.uniform(0, 1)) * 50
        adj = math.cos(ang) * hyp
        opp = math.sin(ang) * hyp
        x = centerX + adj
        y = centerY + opp
        p = Particle(x, y)
        particles.append(p)



def generate_line(y):
    for i in range(100):
        x = randrange(0, WIDTH)
        #y = 200
        p = Particle(x, y)
        particles.append(p)

def generate_line2(x):
    for i in range(100):
        y = randrange(0, HEIGHT)
        #y = 200
        p = Particle(x, y)
        particles.append(p)

    # for i in range(1000):
    #     x = randrange(0, WIDTH)
    #     y = 600
    #     p = Particle(x, y)
    #     particles.append(p)

    # for i in range(1000):
    #     x = randrange(0, WIDTH)
    #     y = 100
    #     p = Particle(x, y)
    #     particles.append(p)
    # for i in range(1000):
    #     x = randrange(0, WIDTH)
    #     y = 700
    #     p = Particle(x, y)
    #     particles.append(p)

# def generator():
#     for i in range(10000):
#         x = randrange(0, WIDTH)
#         y = randrange(0, HEIGHT)
#         p = Particle(x, y)
#         particles.append(p)


#generator()


def draw(screen):
    for particle in particles:
        pos = particle.move(obj1.x, obj1.y)
        # pos = particle.move(obj2.x, obj2.y)
        # pos = particle.move(obj3.x, obj3.y)
        pygame.draw.circle(screen, particle.color, (int(pos[0]), int(pos[1])), 1)




def main_loop():
    running = True
    
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
                pygame.quit()
                sys.exit()
            
                
        key =pygame.key.get_pressed()
        if key[pygame.K_LCTRL]:
            pos = pygame.mouse.get_pos()
            p = Particle(pos[0], pos[1])
            particles.append(p)

        if key[pygame.K_2]:
            pos = pygame.mouse.get_pos()
            generate_circle(pos[0], pos[1])
        if key[pygame.K_1]:
            pos = pygame.mouse.get_pos()
            generate_line(pos[1])
        if key[pygame.K_3]:
            pos = pygame.mouse.get_pos()
            generate_line2(pos[0])

            

        fps = int(clock.get_fps())
        screen.fill((20,20,20))
        draw(screen)
        central_mass = pygame.draw.circle(screen, "yellow", (obj1.x, obj1.y), 15)
        # pygame.draw.circle(screen, "yellow", (obj2.x, obj2.y), 15)
        # pygame.draw.circle(screen, "yellow", (obj3.x, obj3.y), 15)
        draw_text(screen,"particles : "+str(len(particles)),10,100,100)
        draw_text(screen,"Fps : "+str(fps),10,100,130)

        clock.tick(100)
        pygame.display.set_caption(str(fps))

        
        pygame.display.update()


if __name__ == "__main__":
    obj1 = pygame.Rect(WIDTH//2, HEIGHT // 2, 5, 5)
    obj2 = pygame.Rect(WIDTH - 500, HEIGHT // 2-200, 5, 5)
    obj3 =pygame.Rect(WIDTH//2, HEIGHT // 2+100, 5, 5)
    main_loop()
