# Pharmacy Hardware Agent

This is a lightweight .NET 8 process installed and run on each POS machine. It reads a valid network adapter MAC address and self-hosts a SignalR hub on `localhost` that the POS **frontend, running on that same machine, connects to directly**.

The Pharmacy web API backend has no involvement in this at all — it never talks to the agent, and the agent never talks to it. The only connection is browser <-> agent, both on `localhost`.

## Run locally

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj
```

By default the hub is hosted at `http://localhost:5090/hubs/hardware-agent`. Override the port via `appsettings.json`'s `LocalPort`, or per-run with `--local-port`:

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj -- --local-port 5091 --name "Register 1" --location "Front counter"
```

## MAC address detection

The agent checks each adapter's address before selecting one. Active WAN
miniports and VPN interfaces with no MAC no longer hide a working Wi-Fi adapter.
Physical adapters are preferred, then active connections, then Ethernet over
Wi-Fi. A disconnected adapter can still identify an offline POS machine.
Loopback, tunnel, absent adapters, all-zero and multicast addresses are skipped.

To keep the terminal identity fixed when switching between Ethernet and Wi-Fi,
set `MacAddress` in `appsettings.json` to the MAC registered for this terminal,
or override it for a run:

```powershell
dotnet run --project hardware-agent/PharmacyHardwareAgent.csproj -- --mac-address AA:BB:CC:DD:EE:FF
```

Colon-separated, hyphen-separated, and 12-digit hexadecimal addresses are
accepted and normalized to uppercase colon-separated form. If no valid address
can be detected or configured, startup explains the problem and exits with code 1.

Run the regression checks with:

```powershell
dotnet run --project tests/PharmacyHardwareAgent.Tests/PharmacyHardwareAgent.Tests.csproj
```

## Web-app listener

The React `HardwareAgentProvider` connects straight to the agent's hub (`http://localhost:5090/hubs/hardware-agent` by default — see `VITE_HARDWARE_AGENT_URL` in the frontend) and calls `GetInfo()` to learn this machine's identity. Use `useHardwareAgent()` anywhere in the app:

```jsx
const { isAvailable, macAddresses, agents } = useHardwareAgent();
```

`macAddresses` contains the MAC ID reported by this machine's agent. `TerminalGuard` requires the agent to be reachable before users can reach the login page or any protected POS page.

## Production note

The hub only ever listens on the loopback interface and is intentionally unauthenticated, since only a browser on the same machine can reach it. CORS is locked to the Vite dev origin (`http://localhost:5173`) — add any other trusted origin the web app is served from before deploying.
