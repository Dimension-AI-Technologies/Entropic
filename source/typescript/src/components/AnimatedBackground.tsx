import React, { useEffect, useRef, useState, useCallback } from 'react';
import ClaudeLogo from '../../assets/ClaudeLogo.png';

export const LOGO_RADIUS = 100; // Export for use in BoidSystem

export const AnimatedBackground: React.FC = () => {
  // Animation state - only track speed changes, not frame-by-frame values
  const [throbSpeed, setThrobSpeed] = useState(4);
  const [rotationSpeed, setRotationSpeed] = useState(30);
  
  // Use refs for animation values to avoid React state updates on every frame
  const logoRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());
  const throbPhaseRef = useRef<number>(0);
  const rotationPhaseRef = useRef<number>(0);
  const currentThrobRef = useRef<number>(1);
  const currentRotationRef = useRef<number>(0);
  const lastSpeedUpdateRef = useRef<number>(Date.now());

  // Generate log-normal distributed random number
  const randomLogNormal = (mean: number, stdDev: number): number => {
    const normal = (Math.random() - 0.5) * 2 * stdDev + mean;
    return Math.exp(normal);
  };

  // Generate normal distributed random number (Box-Muller transform)
  const randomNormal = (mean: number, stdDev: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  };

  // Update animation speeds stochastically with throttling
  const updateSpeeds = useCallback(() => {
    const now = Date.now();
    
    // Throttle speed updates to once per second to reduce React renders
    if (now - lastSpeedUpdateRef.current < 1000) {
      return;
    }
    
    // Occasionally update throb speed (log-normal distribution)
    if (Math.random() < 0.02) { // 2% chance per check
      const newThrobSpeed = randomLogNormal(1.2, 0.3); // Mean ~3.3s, varies from 1s to 10s
      setThrobSpeed(Math.min(10, Math.max(1, newThrobSpeed)));
      lastSpeedUpdateRef.current = now;
    }

    // Occasionally update rotation speed (normal distribution)
    if (Math.random() < 0.02) { // 2% chance per check
      const newRotationSpeed = randomNormal(20, 10); // Mean 20s, std dev 10s
      setRotationSpeed(Math.min(60, Math.max(5, Math.abs(newRotationSpeed))));
      lastSpeedUpdateRef.current = now;
    }
  }, []);

  // Animation loop - directly manipulate DOM instead of React state
  const animate = useCallback(() => {
    const now = Date.now();
    const deltaTime = (now - lastUpdateRef.current) / 1000; // Convert to seconds
    lastUpdateRef.current = now;

    // Update throb
    throbPhaseRef.current += (deltaTime / throbSpeed) * Math.PI * 2;
    const throbScale = 1 + Math.sin(throbPhaseRef.current) * 0.1; // 10% scale variation
    currentThrobRef.current = throbScale;

    // Update rotation
    rotationPhaseRef.current += (deltaTime / rotationSpeed) * 360;
    currentRotationRef.current = rotationPhaseRef.current % 360;

    // Directly update DOM element instead of React state
    if (logoRef.current) {
      logoRef.current.style.transform = `translate(-50%, -50%) scale(${currentThrobRef.current}) rotate(${currentRotationRef.current}deg)`;
    }

    // Update speeds stochastically (throttled)
    updateSpeeds();

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [throbSpeed, rotationSpeed, updateSpeeds]);

  useEffect(() => {
    // Start animation after a small delay to ensure React has finished initial renders
    const startTimer = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(startTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  return (
    <div 
      ref={logoRef}
      className="animated-background-logo"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', // Initial transform
        width: '200px',
        height: '200px',
        backgroundImage: `url(${ClaudeLogo})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        opacity: 0.04,
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'none', // No CSS transitions, we're animating manually
      }}
    />
  );
};