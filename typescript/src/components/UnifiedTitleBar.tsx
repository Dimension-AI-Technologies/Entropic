import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // Animation state - only track speed changes, not frame-by-frame values
  const [throbSpeed, setThrobSpeed] = useState(4);
  const [rotationSpeed, setRotationSpeed] = useState(30);
  
  // Use refs for animation values to avoid React state updates on every frame
  const logoRef = useRef<HTMLImageElement>(null);
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
    const throbScale = 1 + Math.sin(throbPhaseRef.current) * 0.05; // 5% scale variation (smaller for title bar)
    currentThrobRef.current = throbScale;

    // Update rotation
    rotationPhaseRef.current += (deltaTime / rotationSpeed) * 360;
    currentRotationRef.current = rotationPhaseRef.current % 360;

    // Directly update DOM element instead of React state
    if (logoRef.current) {
      logoRef.current.style.transform = `scale(${currentThrobRef.current}) rotate(${currentRotationRef.current}deg)`;
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
            onClick={async () => {
              try {
                const res = await window.electronAPI?.takeScreenshot?.();
                if (!res) return;
                if (res.success) {
                  alert(`Screenshot saved to\n${res.path}`);
                } else {
                  alert(`Screenshot failed${res.error ? `: ${res.error}` : ''}`);
                }
              } catch (e) {
                console.error('Screenshot error', e);
                alert('Screenshot failed');
              }
            }}
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
            ref={logoRef}
            src={ClaudeLogo} 
            alt="Claude" 
            className="claude-logo" 
            style={{
              transform: 'scale(1) rotate(0deg)', // Initial transform
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
