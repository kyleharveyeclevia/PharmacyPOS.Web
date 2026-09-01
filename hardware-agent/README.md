# Pharmacy Hardware Agent

This is a lightweight .NET 8 process installed and run on each POS machine. It reads the active network adapter's MAC address and self-hosts a SignalR hub on `localhost` that the POS **frontend, running on that same machine, connects to directly**.

The Pharmacy web API backend has no involvement in this at all — it never talks to the agent, and the agent never talks to it. The only connection is browser <-> agent, both on `localhost`.

## Run locally

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj
```

By default the hub is hosted at `http://localhost:5090/hubs/hardware-agent`. Override the port via `appsettings.json`'s `LocalPort`, or per-run with `--local-port`:

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj -- --local-port 5091 --name "Register 1" --location "Front counter"
```

## Web-app listener

The React `HardwareAgentProvider` connects straight to the agent's hub (`http://localhost:5090/hubs/hardware-agent` by default — see `VITE_HARDWARE_AGENT_URL` in the frontend) and calls `GetInfo()` to learn this machine's identity. Use `useHardwareAgent()` anywhere in the app:

```jsx
const { isAvailable, macAddresses, agents } = useHardwareAgent();
```

`macAddresses` contains the MAC ID reported by this machine's agent. `TerminalGuard` requires the agent to be reachable before users can reach the login page or any protected POS page.

## Production note

The hub only ever listens on the loopback interface and is intentionally unauthenticated, since only a browser on the same machine can reach it. CORS is locked to the Vite dev origin (`http://localhost:5173`) — add any other trusted origin the web app is served from before deploying.
