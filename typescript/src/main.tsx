import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import AppMinimal from './AppMinimal';
// import TestApp from './TestApp';
import './index.css';

console.log('[MAIN] Starting React app...');
const rootElement = document.getElementById('root');
console.log('[MAIN] Root element found:', !!rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  console.log('[MAIN] Created React root, rendering App...');
  try {
    root.render(<App />);
    console.log('[MAIN] Render invoked successfully');
  } catch (error) {
    console.error('[MAIN] ERROR during render:', error);
  }
} else {
  console.error('[MAIN] ERROR: No root element found!');
}
