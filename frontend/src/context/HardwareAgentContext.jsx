import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const HardwareAgentContext = createContext(null);

const HARDWARE_AGENT_URL =
  import.meta.env.VITE_HARDWARE_AGENT_URL ||
  'http://localhost:5090/hubs/hardware-agent';

export function HardwareAgentProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HARDWARE_AGENT_URL)
      .withAutomaticReconnect()
      .build();

    const refreshInfo = async () => {
      if (cancelled) return;

      try {
        const info = await connection.invoke('GetInfo');

        if (!cancelled) {
          setAgents(info ? [info] : []);
          setIsAvailable(true);
        }
      } catch {
        if (!cancelled) {
          setAgents([]);
          setIsAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    };

    // Initial connection
    connection.onreconnecting(() => {
      if (!cancelled) {
        setIsConnecting(true);
        setIsAvailable(false);
      }
    });

    // Successfully connected/reconnected
    connection.onreconnected(async () => {
      if (!cancelled) {
        setIsConnecting(false);
      }

      await refreshInfo();
    });

    // Connection completely lost
    connection.onclose(() => {
      if (!cancelled) {
        setAgents([]);
        setIsAvailable(false);
        setIsConnecting(false);
      }
    });

    connection
      .start()
      .then(async () => {
        if (cancelled) return;

        setIsConnecting(false);
        await refreshInfo();
      })
      .catch(() => {
        if (!cancelled) {
          setAgents([]);
          setIsAvailable(false);
          setIsConnecting(false);
        }
      });

    return () => {
      cancelled = true;
      connection.stop();
    };
  }, []);

  const value = useMemo(
    () => ({
      isConnecting,
      isAvailable,
      agents,
      macAddresses: agents
        .map(agent => agent.macId)
        .filter(Boolean),
    }),
    [agents, isConnecting, isAvailable]
  );

  useEffect(() => {
    window.__hardwareAgentAvailable = isAvailable;
  }, [isAvailable]);

  return (
    <HardwareAgentContext.Provider value={value}>
      {children}
    </HardwareAgentContext.Provider>
  );
}

export function useHardwareAgent() {
  const context = useContext(HardwareAgentContext);

  if (!context) {
    throw new Error(
      'useHardwareAgent must be used within HardwareAgentProvider'
    );
  }

  return context;
}