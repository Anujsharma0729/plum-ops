import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Only mount React when the page has a #root element.
// public/index.html (marketing page) has no #root → React stays dormant.
// public/app.html has #root → React mounts normally.
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
              }
