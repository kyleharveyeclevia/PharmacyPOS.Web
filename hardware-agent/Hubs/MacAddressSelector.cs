using System.Net.NetworkInformation;

namespace PharmacyHardwareAgent.Hubs;

internal sealed record MacAdapter(string Id, string Name, string Description,
    NetworkInterfaceType Type, OperationalStatus Status, byte[] Address);

internal static class MacAddressSelector
{
    internal static IEnumerable<MacAdapter> ReadAdapters()
    {
        foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces())
        {
            MacAdapter candidate;
            try
            {
                candidate = new(adapter.Id, adapter.Name, adapter.Description,
                    adapter.NetworkInterfaceType, adapter.OperationalStatus,
                    adapter.GetPhysicalAddress().GetAddressBytes());
            }
            catch (NetworkInformationException) { continue; }
            yield return candidate;
        }
    }

    internal static string? Select(IEnumerable<MacAdapter> adapters)
    {
        var adapter = adapters
            .Where(a => a.Type is not NetworkInterfaceType.Loopback and not NetworkInterfaceType.Tunnel)
            .Where(a => a.Status != OperationalStatus.NotPresent)
            // Validate every candidate before selecting one: WAN miniports can be Up with no MAC.
            .Where(a => IsValid(a.Address))
            .OrderBy(a => IsVirtual(a))
            .ThenByDescending(a => a.Status == OperationalStatus.Up)
            .ThenByDescending(a => a.Type == NetworkInterfaceType.Ethernet)
            .ThenBy(a => a.Id, StringComparer.Ordinal)
            .FirstOrDefault();
        return adapter is null ? null : Format(adapter.Address);
    }

    internal static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var compact = value.Trim().Replace(":", "").Replace("-", "");
        if (compact.Length != 12 || !compact.All(Uri.IsHexDigit)) return null;
        var bytes = Convert.FromHexString(compact);
        return IsValid(bytes) ? Format(bytes) : null;
    }

    private static bool IsValid(byte[] bytes) => bytes.Length == 6
        && bytes.Any(b => b != 0) && (bytes[0] & 1) == 0;

    private static string Format(byte[] bytes) => string.Join(":", bytes.Select(b => b.ToString("X2")));

    private static bool IsVirtual(MacAdapter adapter)
    {
        var description = adapter.Name + " " + adapter.Description;
        string[] markers = ["virtual", "vmware", "hyper-v", "vethernet", "tap-", "vpn",
            "tailscale", "miniport", "kernel debug", "filter", "packet scheduler", "bluetooth"];
        return markers.Any(marker => description.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }
}
