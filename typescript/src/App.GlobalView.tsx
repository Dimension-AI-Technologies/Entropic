import React, { useState, useEffect } from 'react';
import './App.css';
import { DIContainer } from './services/DIContainer';
import { Project as MVVMProject } from './models/Project';

interface GlobalViewProps {
  spacingMode?: 'wide' | 'normal' | 'compact';
}

export function GlobalView({ spacingMode }: GlobalViewProps) {
  const [projects, setProjects] = useState<MVVMProject[]>([]);
  
  // Get ViewModels from container
  const container = DIContainer.getInstance();
  const projectsViewModel = container.getProjectsViewModel();
  
  // Subscribe to ViewModel changes
  useEffect(() => {
    const updateProjects = () => {
      setProjects(projectsViewModel.getProjects());
    };
    
    // Initial load
    updateProjects();
    
    // Subscribe to changes
    const unsubscribe = projectsViewModel.onChange(updateProjects);
    
    return unsubscribe;
  }, [projectsViewModel]);
  
  console.log('[GlobalView] Rendering with', projects.length, 'MVVM projects');
  return (
    <div className="global-view" style={{ padding: '20px', color: 'white', textAlign: 'center' }}>
      <h2>Global View</h2>
      <p>MVVM refactoring in progress...</p>
      <p>Use Project View to see the new MVVM architecture in action.</p>
    </div>
  );
}