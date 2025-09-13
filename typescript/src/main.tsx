import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import AppMinimal from './AppMinimal';
// import TestApp from './TestApp';
import './index.css';

console.warn('[MAIN] Starting React app...');
console.error('[MAIN] Starting React app...');
const rootElement = document.getElementById('root');
console.warn('[MAIN] Root element:', rootElement);
console.error('[MAIN] Root element:', rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  console.error('[MAIN] Created React root, rendering App...');
  try {
    root.render(<App />);
    console.error('[MAIN] Render called successfully');
  } catch (error) {
    console.error('[MAIN] ERROR during render:', error);
  }
} else {
  console.error('[MAIN] ERROR: No root element found!');
}