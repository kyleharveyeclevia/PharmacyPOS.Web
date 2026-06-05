import { Navigate } from 'react-router-dom';
import { isTerminalActivated } from '../services/terminalService';

export default function TerminalGuard({ children }) {
  if (!isTerminalActivated()) {
    return <Navigate to="/terminal-setup" replace />;
  }

  return children;
}