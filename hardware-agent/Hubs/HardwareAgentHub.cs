using Microsoft.AspNetCore.SignalR;

namespace PharmacyHardwareAgent.Hubs;

/// <summary>
/// SignalR hub hosted BY the agent itself, on this POS machine's loopback
/// interface. The React frontend connects to it directly
/// (ws://localhost:{LocalPort}/hubs/hardware-agent) — there is no
/// intermediary. The web API backend has no knowledge of, and no connection
/// to, this hub at all.
/// </summary>
public sealed class HardwareAgentHub(AgentIdentity identity) : Hub
{
    /// <summary>Called by the frontend right after it connects to learn this machine's identity.</summary>
    public AgentInfoDto GetInfo() => identity.ToDto();

    /// <summary>
    /// POST-equivalent invoked over the hub. Printing only ever makes sense on
    /// the machine the printer is physically attached to, which is exactly
    /// this one, so there's no need to route it anywhere else.
    /// Sample response only — actual printing isn't wired up yet.
    /// </summary>
    public PrintResultDto Print(PrintRequestDto request)
    {
        Console.WriteLine("Print started.");
        // TODO: send request.Text to request.Printer (or the default printer).
        Console.WriteLine("Print finished.");
        return new PrintResultDto(true, "success");
    }
}

public sealed record AgentInfoDto(string MacId, string DeviceName, string Location, string Hostname, string OsVersion, string LocalIp, string Username);
public sealed record PrintRequestDto(string Text, string? Printer);
public sealed record PrintResultDto(bool Success, string Message);
