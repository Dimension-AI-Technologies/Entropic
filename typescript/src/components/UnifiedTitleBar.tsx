import React, { useEffect, useRef, useState } from 'react';
import ClaudeLogo from '../../assets/ClaudeLogo.png';

type ViewMode = 'project' | 'global';
type SpacingMode = 'wide' | 'normal' | 'compact';

interface UnifiedTitleBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  spacingMode: SpacingMode;
  onSpacingModeChange: (mode: SpacingMode) => void;
  onRefresh?: () => void;
  // Optional project-specific data for title
  selectedProjectName?: string;
  todoCount?: number;
  projectCount?: number;
}

export function UnifiedTitleBar({
  viewMode,
  onViewModeChange,
  spacingMode,
  onSpacingModeChange,
  onRefresh,
  selectedProjectName,
  todoCount,
  projectCount
}: UnifiedTitleBarProps) {
  console.log('[UnifiedTitleBar] Rendering, viewMode:', viewMode);

  // Animation state (same as AnimatedBackground)
  const [throbSpeed, setThrobSpeed] = useState(4);
  const [rotationSpeed, setRotationSpeed] = useState(30);
  const [currentThrob, setCurrentThrob] = useState(1);
  const [currentRotation, setCurrentRotation] = useState(0);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());
  const throbPhaseRef = useRef<number>(0);
  const rotationPhaseRef = useRef<number>(0);

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

  // Update animation speeds stochastically
  const updateSpeeds = () => {
    // Occasionally update throb speed (log-normal distribution)
    if (Math.random() < 0.02) { // 2% chance per frame
      const newThrobSpeed = randomLogNormal(1.2, 0.3); // Mean ~3.3s, varies from 1s to 10s
      setThrobSpeed(Math.min(10, Math.max(1, newThrobSpeed)));
    }

    // Occasionally update rotation speed (normal distribution)
    if (Math.random() < 0.02) { // 2% chance per frame
      const newRotationSpeed = randomNormal(20, 10); // Mean 20s, std dev 10s
      setRotationSpeed(Math.min(60, Math.max(5, Math.abs(newRotationSpeed))));
    }
  };

  // Animation loop
  const animate = () => {
    const now = Date.now();
    const deltaTime = (now - lastUpdateRef.current) / 1000; // Convert to seconds
    lastUpdateRef.current = now;

    // Update throb
    throbPhaseRef.current += (deltaTime / throbSpeed) * Math.PI * 2;
    const throbScale = 1 + Math.sin(throbPhaseRef.current) * 0.05; // 5% scale variation (smaller for title bar)
    setCurrentThrob(throbScale);

    // Update rotation
    rotationPhaseRef.current += (deltaTime / rotationSpeed) * 360;
    setCurrentRotation(rotationPhaseRef.current % 360);

    // Update speeds stochastically
    updateSpeeds();

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [throbSpeed, rotationSpeed]);

  return (
    <div className="unified-title-bar">
      <div className="unified-title-bar-content">
        {/* Left: Refresh and Screenshot buttons */}
        <div className="title-bar-left">
          {onRefresh && (
            <button 
              className="refresh-btn" 
              onClick={onRefresh}
              title="Refresh projects and todos"
            >
              ↻
            </button>
          )}
          <button 
            className="screenshot-btn" 
            onClick={() => window.electronAPI?.takeScreenshot?.()}
            title="Take screenshot"
          >
            📸
          </button>
        </div>

        {/* Center: Project View button + Claude logo + Global View button */}
        <div className="title-bar-center">
          <button
            className={`view-toggle-btn ${viewMode === 'project' ? 'active' : ''}`}
            onClick={() => onViewModeChange('project')}
            title="View individual project todos"
          >
            Project View
          </button>
          
          <img 
            src={ClaudeLogo} 
            alt="Claude" 
            className="claude-logo" 
            style={{
              transform: `scale(${currentThrob}) rotate(${currentRotation}deg)`,
              transition: 'none' // No CSS transitions, we're animating manually
            }}
          />
          
          <button
            className={`view-toggle-btn ${viewMode === 'global' ? 'active' : ''}`}
            onClick={() => onViewModeChange('global')}
            title="View all active todos across projects"
          >
            Global View
          </button>
        </div>

        {/* Right: Spacing controls only */}
        <div className="title-bar-right">

          {/* Spacing controls */}
          <div className="title-bar-spacing-controls">
            <label className="spacing-label" title="Adjust the spacing between rows">SPACING:</label>
            <div className="spacing-buttons">
              <button
                className="spacing-btn spacing-cycle-btn active"
                onClick={() => {
                  const modes: SpacingMode[] = ['wide', 'normal', 'compact'];
                  const currentIndex = modes.indexOf(spacingMode);
                  const nextIndex = (currentIndex + 1) % modes.length;
                  onSpacingModeChange(modes[nextIndex]);
                }}
                title="Click to cycle through spacing modes: Wide → Normal → Compact"
              >
                {spacingMode === 'wide' ? 'Wide' : spacingMode === 'normal' ? 'Normal' : 'Compact'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}