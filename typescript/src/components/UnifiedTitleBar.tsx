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
  const [spacingMenuVisible, setSpacingMenuVisible] = useState(false);
  const [spacingMenuPos, setSpacingMenuPos] = useState<{top:number; right:number}>({top:0,right:0});
  const spacingHoldRef = useRef<number | null>(null);
  const spacingMenuRef = useRef<HTMLDivElement>(null);
  
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
    const onDocDown = (e: MouseEvent) => {
      if (spacingMenuVisible && spacingMenuRef.current && !spacingMenuRef.current.contains(e.target as Node)) {
        setSpacingMenuVisible(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSpacingMenuVisible(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [spacingMenuVisible]);

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
                if (!window.electronAPI?.takeScreenshot) {
                  console.warn('electronAPI.takeScreenshot not available');
                  (window as any).__addToast?.('Screenshot unavailable');
                  return;
                }
                const res = await window.electronAPI.takeScreenshot();
                if (res.success) { (window as any).__addToast?.('Screenshot saved'); } else { (window as any).__addToast?.('Screenshot failed'); }
              } catch (e) {
                console.error('Screenshot error', e);
                (window as any).__addToast?.('Screenshot failed');
              }
            }}
            title="Take screenshot (saved to Desktop)"
          >
            {/* Simple camera-lens icon (white) */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5"/>
              <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5"/>
              <circle cx="9" cy="9" r="1.5" fill="white"/>
            </svg>
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

        {/* Right: Spacing control (cycle + menu) */}
        <div className="title-bar-right">
          <div className="title-bar-spacing-controls">
            <div className="spacing-buttons">
              <button
                className="spacing-btn spacing-cycle-btn active"
                onMouseDown={(e) => {
                  if (spacingHoldRef.current) clearTimeout(spacingHoldRef.current);
                  spacingHoldRef.current = window.setTimeout(() => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const top = rect.bottom;
                    const right = Math.max(6, window.innerWidth - rect.right + 6);
                    setSpacingMenuPos({ top, right });
                    setSpacingMenuVisible(true);
                  }, 400);
                }}
                onMouseUp={() => {
                  if (spacingHoldRef.current) {
                    clearTimeout(spacingHoldRef.current);
                    spacingHoldRef.current = null;
                    if (!spacingMenuVisible) {
                      const modes: SpacingMode[] = ['wide', 'normal', 'compact'];
                      const currentIndex = modes.indexOf(spacingMode);
                      const nextIndex = (currentIndex + 1) % modes.length;
                      onSpacingModeChange(modes[nextIndex]);
                    }
                  }
                }}
                onMouseLeave={() => { if (spacingHoldRef.current) { clearTimeout(spacingHoldRef.current); spacingHoldRef.current = null; } }}
                onContextMenu={(e) => { e.preventDefault(); if (spacingHoldRef.current) { clearTimeout(spacingHoldRef.current); spacingHoldRef.current = null; } const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const top = rect.bottom; const right = Math.max(6, window.innerWidth - rect.right + 6); setSpacingMenuPos({ top, right }); setSpacingMenuVisible(true); }}
                title="Click to cycle spacing • Hold/Right-click to choose"
              >
                {spacingMode === 'wide' ? 'Wide' : spacingMode === 'normal' ? 'Normal' : 'Compact'}
              </button>
              {spacingMenuVisible && (
                <div ref={spacingMenuRef} style={{ position: 'fixed', top: spacingMenuPos.top, right: spacingMenuPos.right, background: '#2f3136', color: '#e6e7e8', border: '1px solid #3b3e44', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 9999, minWidth: 150, padding: 6 }}>
                  {(['wide','normal','compact'] as SpacingMode[]).map(m => (
                    <button key={m} onClick={() => { onSpacingModeChange(m); setSpacingMenuVisible(false); }} className={`spacing-btn ${spacingMode === m ? 'active' : ''}`} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }}>
                      {m === 'wide' ? 'Wide' : m === 'normal' ? 'Normal' : 'Compact'}{spacingMode === m ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
