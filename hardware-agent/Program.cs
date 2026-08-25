using System.Net.NetworkInformation;
using Microsoft.AspNetCore.SignalR.Client;

var serverUrl = args.FirstOrDefault() ?? "http://localhost:57087/hubs/hardware-agent";
var agentId = GetStableAgentId();
var connection = new HubConnectionBuilder().WithUrl(serverUrl).WithAutomaticReconnect().Build();
connection.Reconnected += async _ => await RegisterAsync();

Console.WriteLine($"Pharmacy Hardware Agent ({agentId})");
Console.WriteLine($"Connecting to {serverUrl}");
while (true)
{
    try
    {
        await connection.StartAsync();
        await RegisterAsync();
        Console.WriteLine("Connected. Press Ctrl+C to stop.");
        await Task.Delay(Timeout.InfiniteTimeSpan);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Connection failed: {ex.Message}. Retrying in 5 seconds...");
        await Task.Delay(TimeSpan.FromSeconds(5));
    }
}

async Task RegisterAsync()
{
    var macAddresses = NetworkInterface.GetAllNetworkInterfaces()
        .Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
        .Select(n => n.GetPhysicalAddress().ToString()).Where(mac => mac.Length == 12)
        .Select(mac => string.Join(':', Enumerable.Range(0, 6).Select(i => mac.Substring(i * 2, 2)))).ToArray();
    await connection.InvokeAsync("RegisterAgent", new { AgentId = agentId, MachineName = Environment.MachineName, MacAddresses = macAddresses });
    Console.WriteLine($"Reported MAC address(es): {string.Join(", ", macAddresses)}");
}

static string GetStableAgentId()
{
    var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PharmacyHardwareAgent", "agent-id.txt");
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    if (File.Exists(path)) return File.ReadAllText(path).Trim();
    var id = Guid.NewGuid().ToString("N");
    File.WriteAllText(path, id);
    return id;
}
