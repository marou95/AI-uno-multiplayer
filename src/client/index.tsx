import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  // StrictMode can sometimes cause double-invocations in dev which confuses Colyseus connection logic if not careful
  // We keep it for best practices but useStore ensures singleton behavior
  <React.StrictMode>
    <App />
  </React.StrictMode>
);