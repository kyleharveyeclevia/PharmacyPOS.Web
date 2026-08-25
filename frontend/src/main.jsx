import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { HardwareAgentProvider } from './context/HardwareAgentContext.jsx';
import { TerminalAccessProvider } from './context/TerminalAccessContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HardwareAgentProvider>
      <TerminalAccessProvider><App /></TerminalAccessProvider>
    </HardwareAgentProvider>
  </React.StrictMode>
);
