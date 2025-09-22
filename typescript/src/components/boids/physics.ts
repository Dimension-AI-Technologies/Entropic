// Boid physics and movement calculations
import type { Boid } from './types';
import { stochasticParams } from './StochasticParameters';

// Calculate distance between two points or boids
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Calculate spawn probability based on flock size
export const calculateSpawnProbability = (flockSize: number): number => {
  const config = stochasticParams.get();
  if (flockSize >= config.MAX_BOIDS) return 0;
  return config.SPAWN_PROBABILITY_BASE * Math.exp(-config.SPAWN_PROBABILITY_DECAY * flockSize);
};

// Calculate detach probability based on flock size
export const calculateDetachProbability = (flockSize: number): number => {
  const config = stochasticParams.get();
  if (flockSize === 0) return 0;
  return Math.min(config.DETACH_PROBABILITY_MAX, flockSize * config.DETACH_PROBABILITY_SCALE);
};

// Check collision with central logo
export const checkLogoCollision = (boid: Boid, centerX: number, centerY: number): boolean => {
  const dx = boid.x - centerX;
  const dy = boid.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < stochasticParams.get().LOGO_DETECTION_RADIUS;
};

// Apply bounce force from logo
export const applyLogoBounce = (boid: Boid, centerX: number, centerY: number) => {
  const dx = boid.x - centerX;
  const dy = boid.y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0) {
    const config = stochasticParams.get();
    const force = config.LOGO_BOUNCE_FORCE / dist;
    boid.vx += (dx / dist) * force;
    boid.vy += (dy / dist) * force;

    // Add some randomness to make bounces more organic
    boid.vx += (Math.random() - 0.5) * 0.5;
    boid.vy += (Math.random() - 0.5) * 0.5;
  }
};

// Apply flocking behavior to a boid
export const applyFlockingBehavior = (boid: Boid, boids: Boid[], config: any) => {
  let alignmentX = 0, alignmentY = 0, alignmentCount = 0;
  let cohesionX = 0, cohesionY = 0, cohesionCount = 0;
  let separationX = 0, separationY = 0;

  boids.forEach(other => {
    if (other.id === boid.id || other.leavingScreen) return;

    const d = distance(boid, other);

    // Alignment
    if (d < config.ALIGNMENT_RADIUS) {
      alignmentX += other.vx;
      alignmentY += other.vy;
      alignmentCount++;
    }

    // Cohesion
    if (d < config.COHESION_RADIUS) {
      cohesionX += other.x;
      cohesionY += other.y;
      cohesionCount++;
    }

    // Separation
    if (d < config.SEPARATION_RADIUS && d > 0) {
      const diff = config.SEPARATION_RADIUS - d;
      separationX += (boid.x - other.x) / d * diff;
      separationY += (boid.y - other.y) / d * diff;
    }
  });

  // Apply alignment force
  if (alignmentCount > 0) {
    boid.vx += (alignmentX / alignmentCount - boid.vx) * config.ALIGNMENT_FORCE;
    boid.vy += (alignmentY / alignmentCount - boid.vy) * config.ALIGNMENT_FORCE;
  }

  // Apply cohesion force
  if (cohesionCount > 0) {
    const targetX = cohesionX / cohesionCount;
    const targetY = cohesionY / cohesionCount;
    boid.vx += (targetX - boid.x) * config.COHESION_FORCE / 100;
    boid.vy += (targetY - boid.y) * config.COHESION_FORCE / 100;
  }

  // Apply separation force
  boid.vx += separationX * config.SEPARATION_FORCE;
  boid.vy += separationY * config.SEPARATION_FORCE;

  // Apply wander force
  boid.vx += (Math.random() - 0.5) * config.WANDER_FORCE;
  boid.vy += (Math.random() - 0.5) * config.WANDER_FORCE;

  // Apply speed limits
  const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
  if (speed > config.MAX_SPEED) {
    boid.vx = (boid.vx / speed) * config.MAX_SPEED;
    boid.vy = (boid.vy / speed) * config.MAX_SPEED;
  }

  // Update position
  boid.x += boid.vx;
  boid.y += boid.vy;

  // Wrap around edges
  const { innerWidth, innerHeight } = window;
  if (boid.x < -50) boid.x = innerWidth + 50;
  if (boid.x > innerWidth + 50) boid.x = -50;
  if (boid.y < -50) boid.y = innerHeight + 50;
  if (boid.y > innerHeight + 50) boid.y = -50;
};