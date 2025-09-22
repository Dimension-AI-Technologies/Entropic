import React, { useEffect, useRef, useState } from 'react';
import ClaudeLogo from '../../assets/ClaudeLogo.png';
import { LOGO_RADIUS } from './AnimatedBackground';
import type { Boid } from './boids/types';
import { stochasticParams } from './boids/StochasticParameters';
import {
  calculateSpawnProbability,
  calculateDetachProbability,
  checkLogoCollision,
  applyLogoBounce,
  applyFlockingBehavior
} from './boids/physics';
import {
  createBoid,
  updateBoidAnimation,
  shouldStartLeaving
} from './boids/lifecycle';

export const BoidSystem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const frameRef = useRef<number>();
  const [, forceUpdate] = useState({});

  // Update boid positions and behaviors
  const updateBoids = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const boids = boidsRef.current;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Update stochastic parameters
    stochasticParams.update();
    const BOID_CONFIG = stochasticParams.get();

    // Spawn new boids based on probability
    if (Math.random() < calculateSpawnProbability(boids.length) / 60) {
      const newBoid = createBoid();
      if (newBoid) {
        boids.push(newBoid);
        console.log('Spawned boid:', newBoid.id, 'Total boids:', boids.length);
      }
    }

    // Update each boid
    const boidsToRemove: string[] = [];

    boids.forEach(boid => {
      // Update animation states
      const shouldContinue = updateBoidAnimation(boid);
      if (!shouldContinue) {
        boidsToRemove.push(boid.id);
        return;
      }

      // Check for detachment if not already animating
      if (!boid.enteringScreen && !boid.leavingScreen) {
        const detachProbability = calculateDetachProbability(boids.length);
        if (shouldStartLeaving(boid, detachProbability)) {
          boid.leavingScreen = true;
        }
      }

      // Skip movement for leaving boids
      if (boid.leavingScreen) {
        return;
      }

      // Check collision with central logo and bounce
      if (checkLogoCollision(boid, centerX, centerY)) {
        applyLogoBounce(boid, centerX, centerY);
      }

      // Apply flocking behavior
      applyFlockingBehavior(boid, boids, BOID_CONFIG);
    });

    // Remove boids that have left the screen
    if (boidsToRemove.length > 0) {
      boidsRef.current = boids.filter(boid => !boidsToRemove.includes(boid.id));
      console.log('Removed boids:', boidsToRemove.length, 'Remaining:', boidsRef.current.length);
    }

    forceUpdate({});
    frameRef.current = requestAnimationFrame(updateBoids);
  };

  // Start animation loop
  useEffect(() => {
    frameRef.current = requestAnimationFrame(updateBoids);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="boid-system">
      {/* Central Claude logo */}
      <div
        className="logo-container"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: LOGO_RADIUS * 2,
          height: LOGO_RADIUS * 2,
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      >
        <img
          src={ClaudeLogo}
          alt="Claude"
          style={{
            width: '60%',
            height: '60%',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Render boids */}
      {boidsRef.current.map(boid => {
        const throbScale = 1 + Math.sin(boid.throbPhase) * 0.1;
        return (
          <div
            key={boid.id}
            className="boid"
            style={{
              position: 'absolute',
              left: boid.x - boid.size / 2,
              top: boid.y - boid.size / 2,
              width: boid.size,
              height: boid.size,
              borderRadius: '50%',
              backgroundColor: `rgba(255, 165, 0, ${boid.opacity})`,
              transform: `rotate(${boid.rotation}deg) scale(${throbScale})`,
              transition: 'none',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
        );
      })}
    </div>
  );
};