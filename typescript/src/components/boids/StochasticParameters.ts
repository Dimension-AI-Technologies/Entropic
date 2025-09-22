// Stochastic parameter management for boid system
import { BOID_CONFIG_BASE } from './config';

export class StochasticParameters {
  private baseValues: typeof BOID_CONFIG_BASE;
  private currentValues: typeof BOID_CONFIG_BASE;
  private meanReversionRate = 0.01;
  private volatility = 0.02;

  constructor() {
    this.baseValues = { ...BOID_CONFIG_BASE };
    this.currentValues = { ...BOID_CONFIG_BASE };
  }

  update() {
    // Apply mean-reverting stochastic process to flocking parameters
    const params = ['ALIGNMENT_FORCE', 'COHESION_FORCE', 'SEPARATION_FORCE', 'WANDER_FORCE'] as const;

    params.forEach(param => {
      const base = this.baseValues[param];
      const current = this.currentValues[param];

      // Ornstein-Uhlenbeck process for mean reversion
      const drift = this.meanReversionRate * (base - current);
      const diffusion = this.volatility * base * (Math.random() - 0.5) * 2;

      this.currentValues[param] = Math.max(0, current + drift + diffusion);
    });

    // Occasionally make larger jumps
    if (Math.random() < 0.005) { // 0.5% chance
      const param = params[Math.floor(Math.random() * params.length)];
      this.currentValues[param] = this.baseValues[param] * (0.5 + Math.random() * 1.5);
    }
  }

  get() {
    return this.currentValues;
  }
}

// Singleton instance
export const stochasticParams = new StochasticParameters();