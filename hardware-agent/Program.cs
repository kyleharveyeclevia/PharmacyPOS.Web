using PharmacyHardwareAgent.Hubs;
using Serilog;

// Only this app's own web page is allowed to connect to the hub — a wildcard
// origin would let ANY website open in the same browser (not just ours) read
// this machine's MAC/hostname/username or trigger a print, since SignalR
// itself can't tell connections apart by who's asking, only CORS can. Add
// other trusted origins here if the web app is ever served from somewhere
// other than the Vite dev server.
var AllowedOrigins = new[] { "http://localhost:5173" };

// Default only — actual value is set from appsettings.json's "LocalPort" or
// --local-port below, so it can't be known at compile time as a const.
var localApiPort = 5090;

var deviceName = GetArg(args, "--name") ?? Environment.MachineName;
var location = GetArg(args, "--location") ?? "unspecified";

var builder = WebApplication.CreateBuilder(args);

// appsettings.json's "LocalPort" is the base value (rarely changes per
// machine); --local-port on the command line overrides it for a one-off run.
var configuredPort = builder.Configuration.GetValue<int?>("LocalPort");
if (configuredPort is int and (<= 0 or > 65535))
{
    Console.WriteLine($"Invalid LocalPort '{configuredPort}' in appsettings.json — must be between 1 and 65535. Exiting.");
    return;
}
if (configuredPort is int validConfiguredPort) localApiPort = validConfiguredPort;

var localPortArg = GetArg(args, "--local-port");
if (localPortArg is not null)
{
    if (!int.TryParse(localPortArg, out var parsedPort) || parsedPort is <= 0 or > 65535)
    {
        Console.WriteLine($"Invalid --local-port '{localPortArg}' — must be a number between 1 and 65535. Exiting.");
        return;
    }
    localApiPort = parsedPort;
}

var macId = AgentIdentity.GetPrimaryMacAddress();
if (macId is null)
{
    Console.WriteLine("Could not determine a MAC address for this machine. Exiting.");
    return;
}

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Error()
    .WriteTo.File(
        path: Path.Combine(AppContext.BaseDirectory, "logs", "hardware-agent-.log"),
        rollingInterval: RollingInterval.Day,
        restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Error)
    .CreateLogger();
builder.Host.UseSerilog();

// Loopback-only — nothing outside this machine can reach it.
builder.WebHost.UseUrls($"http://localhost:{localApiPort}");

builder.Services.AddSingleton(new AgentIdentity(macId, deviceName, location));
builder.Services.AddSignalR();
builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
    p.WithOrigins(AllowedOrigins).AllowAnyMethod().AllowAnyHeader().AllowCredentials()));

var app = builder.Build();
app.UseCors("Frontend");
app.MapHub<HardwareAgentHub>("/hubs/hardware-agent");

Console.WriteLine("Agent starting.");
Console.WriteLine($"  MAC ID:     {macId}");
Console.WriteLine($"  Name:       {deviceName}");
Console.WriteLine($"  Location:   {location}");
Console.WriteLine($"  Local port: {localApiPort}");
Console.WriteLine($"Hub endpoint: http://localhost:{localApiPort}/hubs/hardware-agent");
Console.WriteLine("Ready. Press Ctrl+C to exit.");

app.Run();

static string? GetArg(string[] args, string name)
{
    var idx = Array.IndexOf(args, name);
    return idx >= 0 && idx + 1 < args.Length ? args[idx + 1] : null;
}
