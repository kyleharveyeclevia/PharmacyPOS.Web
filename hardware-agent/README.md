# Pharmacy Hardware Agent

This is a lightweight .NET 8 process installed and run on each POS machine. It reads the active network adapters' MAC addresses and registers them with the Pharmacy API over SignalR.

## Run locally

Start the API first, then run:

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj
```

The default API hub URL is `https://localhost:57086/hubs/hardware-agent`. To point at a deployed API, pass the hub URL as the first argument:

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj -- https://pos.example.com/hubs/hardware-agent
```

The agent creates a persistent identifier in `%LocalAppData%\PharmacyHardwareAgent\agent-id.txt`, reconnects automatically, and re-registers after reconnecting.

## Web-app listener

The React `HardwareAgentProvider` subscribes to `HardwareAgentConnected` and `HardwareAgentDisconnected` and requests the current list through `GetConnectedAgents`. Use `useHardwareAgent()` anywhere in the app:

```jsx
const { isAvailable, macAddresses, agents } = useHardwareAgent();
```

`macAddresses` contains the MAC IDs reported by the connected agents. `TerminalGuard` requires an available agent before users can reach the login page or any protected POS page.

## Production note

The hub currently assumes agents can reach the API and is intentionally unauthenticated for initial local deployment. Before exposing it beyond a trusted private network, protect agent registration with an agent credential or mutual TLS and authorize browser clients appropriately.
