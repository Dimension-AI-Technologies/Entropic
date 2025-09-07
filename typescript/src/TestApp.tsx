import React from 'react';

function TestApp() {
  console.error('[TESTAPP] TestApp component rendering!');
  return (
    <div style={{ padding: '20px', backgroundColor: '#282c34', color: 'white', height: '100vh' }}>
      <h1>Test App is Working!</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
}

export default TestApp;