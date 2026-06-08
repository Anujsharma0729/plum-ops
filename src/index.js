import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootEl = document.getElementById('root');

// Only mount React when the user clicked "View Demo" (?app=1)
// On the plain marketing page load, React stays dormant
if (rootEl && window.location.search.includes('app=1')) {
  rootEl.style.display = 'block';
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
