// Boid lifecycle management (creation, animation, removal)
import type { Boid } from './types';
import { stochasticParams } from './StochasticParameters';

// Create a new boid at a random edge position
export const createBoid = (): Boid | null => {
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number, vx: number, vy: number;

  const baseSpeed = 0.5 + Math.random() * 1.5;
  const angle = Math.random() * Math.PI * 2;

  switch (edge) {
    case 0: // Top edge
      x = Math.random() * window.innerWidth;
      y = -10;
      vx = Math.cos(angle) * baseSpeed;
      vy = Math.abs(Math.sin(angle)) * baseSpeed; // Move downward
      break;
    case 1: // Right edge
      x = window.innerWidth + 10;
      y = Math.random() * window.innerHeight;
      vx = -Math.abs(Math.cos(angle)) * baseSpeed; // Move leftward
      vy = Math.sin(angle) * baseSpeed;
      break;
    case 2: // Bottom edge
      x = Math.random() * window.innerWidth;
      y = window.innerHeight + 10;
      vx = Math.cos(angle) * baseSpeed;
      vy = -Math.abs(Math.sin(angle)) * baseSpeed; // Move upward
      break;
    case 3: // Left edge
      x = -10;
      y = Math.random() * window.innerHeight;
      vx = Math.abs(Math.cos(angle)) * baseSpeed; // Move rightward
      vy = Math.sin(angle) * baseSpeed;
      break;
    default:
      return null;
  }

  return {
    id: `boid-${Date.now()}-${Math.random()}`,
    x,
    y,
    vx,
    vy,
    size: 20 + Math.random() * 15,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 2,
    throbPhase: Math.random() * Math.PI * 2,
    throbSpeed: 0.05 + Math.random() * 0.05,
    opacity: 0,
    enteringScreen: true,
    leavingScreen: false
  };
};

// Update boid animation states (throb, rotation, opacity)
export const updateBoidAnimation = (boid: Boid): boolean => {
  // Update throb and rotation
  boid.throbPhase += boid.throbSpeed;
  boid.rotation += boid.rotationSpeed;

  // Occasionally change rotation speed
  if (Math.random() < 0.005) {
    boid.rotationSpeed = (Math.random() - 0.5) * 2;
  }

  // Handle entering/leaving animations
  if (boid.enteringScreen) {
    boid.opacity = Math.min(1, boid.opacity + 0.02);
    if (boid.opacity >= 1) {
      boid.enteringScreen = false;
      console.log('Boid fully entered:', boid.id, 'Opacity:', boid.opacity);
    }
    return true; // Continue existing
  } else if (boid.leavingScreen) {
    boid.opacity = Math.max(0, boid.opacity - 0.02);
    if (boid.opacity <= 0) {
      return false; // Should be removed
    }
    // Speed up when leaving
    boid.x += boid.vx * 2;
    boid.y += boid.vy * 2;
    return true; // Continue existing
  }

  return true; // Continue existing
};

// Check if a boid should start leaving
export const shouldStartLeaving = (boid: Boid, detachProbability: number): boolean => {
  return !boid.leavingScreen && !boid.enteringScreen && Math.random() < detachProbability / 60;
};