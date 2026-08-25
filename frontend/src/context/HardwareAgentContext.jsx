import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const HardwareAgentContext = createContext(null);

export function HardwareAgentProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/hardware-agent')
      .withAutomaticReconnect()
      .build();

    const refreshAgents = async () => {
      try { setAgents(await connection.invoke('GetConnectedAgents')); }
      catch { setAgents([]); }
      finally { setIsConnecting(false); }
    };
    connection.on('HardwareAgentConnected', refreshAgents);
    connection.on('HardwareAgentDisconnected', refreshAgents);
    connection.onreconnected(refreshAgents);
    connection.start().then(refreshAgents).catch(() => setIsConnecting(false));

    return () => { connection.stop(); };
  }, []);

  const value = useMemo(() => ({
    isConnecting,
    agents,
    isAvailable: agents.length > 0,
    macAddresses: agents.flatMap(agent => agent.macAddresses ?? []),
  }), [agents, isConnecting]);

  useEffect(() => {
    window.__hardwareAgentAvailable = value.isAvailable;
  }, [value.isAvailable]);

  return <HardwareAgentContext.Provider value={value}>{children}</HardwareAgentContext.Provider>;
}

export function useHardwareAgent() {
  const context = useContext(HardwareAgentContext);
  if (!context) throw new Error('useHardwareAgent must be used within HardwareAgentProvider');
  return context;
}
