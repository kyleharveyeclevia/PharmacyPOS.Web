using System.Collections.Concurrent;

namespace PharmacyApi.Hubs;

public sealed record HardwareAgentInfo(string AgentId, string MachineName, IReadOnlyList<string> MacAddresses, DateTimeOffset ConnectedAt, string ConnectionId);

public sealed class HardwareAgentRegistry
{
    private readonly ConcurrentDictionary<string, HardwareAgentInfo> _agents = new();
    public IReadOnlyCollection<HardwareAgentInfo> ConnectedAgents => _agents.Values.ToArray();

    public HardwareAgentInfo Register(string connectionId, string agentId, string machineName, IEnumerable<string> macAddresses)
    {
        var agent = new HardwareAgentInfo(agentId, machineName, macAddresses.Distinct().ToArray(), DateTimeOffset.UtcNow, connectionId);
        _agents[connectionId] = agent;
        return agent;
    }

    public HardwareAgentInfo? Remove(string connectionId) => _agents.TryRemove(connectionId, out var agent) ? agent : null;
}
