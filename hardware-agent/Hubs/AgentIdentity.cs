using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;

namespace PharmacyHardwareAgent.Hubs;

/// <summary>Registered as a singleton so the hub can read this machine's identity on every request.</summary>
public sealed class AgentIdentity(string macId, string deviceName, string location)
{
    public string MacId { get; } = macId;
    public string DeviceName { get; } = deviceName;
    public string Location { get; } = location;

    public AgentInfoDto ToDto() => new(
        MacId: MacId,
        DeviceName: DeviceName,
        Location: Location,
        // Re-read live rather than cache — e.g. local IP or logged-in user can
        // change while the agent keeps running.
        Hostname: Environment.MachineName,
        OsVersion: RuntimeInformation.OSDescription,
        LocalIp: GetLocalIPv4Address(),
        Username: Environment.UserName);

    /// <summary>
    /// Selects a valid MAC before choosing an adapter. Prefers physical adapters,
    /// then active connections, then Ethernet. An offline adapter can still identify the machine.
    /// </summary>
    public static string? GetPrimaryMacAddress()
    {
        return MacAddressSelector.Select(MacAddressSelector.ReadAdapters());
    }

    /// <summary>First non-loopback IPv4 address on an up interface — the machine's LAN-facing address.</summary>
    private static string GetLocalIPv4Address()
    {
        var address = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up)
            .Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);

        return address?.Address.ToString() ?? "unknown";
    }
}
