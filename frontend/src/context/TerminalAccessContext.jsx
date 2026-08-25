import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { terminalsApi } from '../services/api.js';
import { useHardwareAgent } from './HardwareAgentContext.jsx';

const TerminalAccessContext = createContext(null);

export function TerminalAccessProvider({ children }) {
  const { isAvailable, isConnecting, macAddresses } = useHardwareAgent();
  const [terminal, setTerminal] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkTerminal() {
      if (isConnecting) return;
      if (!isAvailable || !macAddresses.length) { if (!cancelled) { setTerminal(null); setIsChecking(false); } return; }
      setIsChecking(true);
      for (const macAddress of macAddresses) {
        try {
          const { data } = await terminalsApi.byMac(macAddress);
          if (data.Success && !cancelled) { setTerminal({ ...data.Data, macAddress }); setIsChecking(false); return; }
        } catch { /* try next adapter */ }
      }
      if (!cancelled) { setTerminal(null); setIsChecking(false); }
    }
    checkTerminal();
    return () => { cancelled = true; };
  }, [isAvailable, isConnecting, macAddresses.join(',')]);

  const value = useMemo(() => ({ terminal, isChecking, hasAccess: !!terminal }), [terminal, isChecking]);
  return <TerminalAccessContext.Provider value={value}>{children}</TerminalAccessContext.Provider>;
}

export function useTerminalAccess() {
  const context = useContext(TerminalAccessContext);
  if (!context) throw new Error('useTerminalAccess must be used within TerminalAccessProvider');
  return context;
}
