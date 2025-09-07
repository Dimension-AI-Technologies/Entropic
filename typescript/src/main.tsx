import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import AppMinimal from './AppMinimal';
// import TestApp from './TestApp';
import './index.css';

console.error('[MAIN] Starting React app...');
const rootElement = document.getElementById('root');
console.error('[MAIN] Root element:', rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  console.error('[MAIN] Created React root, rendering App...');
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.error('[MAIN] Render called successfully');
  } catch (error) {
    console.error('[MAIN] ERROR during render:', error);
  }
} else {
  console.error('[MAIN] ERROR: No root element found!');
}