using Microsoft.AspNetCore.SignalR;

namespace PharmacyApi.Hubs;

/// <summary>SignalR rendezvous point for locally installed hardware agents and the POS web client.</summary>
public sealed class HardwareAgentHub(HardwareAgentRegistry registry) : Hub
{
    public IReadOnlyCollection<HardwareAgentInfo> GetConnectedAgents() => registry.ConnectedAgents;

    public async Task RegisterAgent(HardwareAgentRegistration registration)
    {
        if (string.IsNullOrWhiteSpace(registration.AgentId) || string.IsNullOrWhiteSpace(registration.MachineName))
            throw new HubException("AgentId and MachineName are required.");

        var agent = registry.Register(Context.ConnectionId, registration.AgentId, registration.MachineName, registration.MacAddresses ?? []);
        await Clients.All.SendAsync("HardwareAgentConnected", agent);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var agent = registry.Remove(Context.ConnectionId);
        if (agent is not null) await Clients.All.SendAsync("HardwareAgentDisconnected", agent.AgentId);
        await base.OnDisconnectedAsync(exception);
    }
}

public sealed record HardwareAgentRegistration(string AgentId, string MachineName, IReadOnlyList<string>? MacAddresses);
