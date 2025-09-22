// Boid type definitions

export interface Boid {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  throbPhase: number;
  throbSpeed: number;
  opacity: number;
  enteringScreen: boolean;
  leavingScreen: boolean;
}