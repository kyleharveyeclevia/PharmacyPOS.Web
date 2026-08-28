using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Serilog;
using Serilog.Events;

public class Program
{
    // Default only — actual value is set from --local-port (or falls back to
    // this) in Main, so it can't be known at compile time as a const.
    private static int LocalApiPort = 5090;

    // Set once at startup by Main, then read via the Get*() methods below
    // instead of being threaded through every method's parameters.
    private static string _macId = "";
    private static string _deviceName = "";
    private static string _location = "";

    private static string GetMacId() => _macId;
    private static string GetDeviceName() => _deviceName;
    private static string GetLocation() => _location;

    public static async Task Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Error()
            .WriteTo.File(
                path: Path.Combine(AppContext.BaseDirectory, "logs", "hardware-agent-.log"),
                rollingInterval: RollingInterval.Day,
                restrictedToMinimumLevel: LogEventLevel.Error)
            .CreateLogger();

        AppDomain.CurrentDomain.ProcessExit += (_, _) => Log.CloseAndFlush();

        var deviceName = GetArg(args, "--name") ?? Environment.MachineName;
        var location = GetArg(args, "--location") ?? "unspecified";

        // appsettings.json's "LocalPort" is the base value (rarely changes per
        // machine); --local-port on the command line overrides it for a
        // one-off run. Falls back to the 5090 default if neither is set.
        var config = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
            .Build();

        var configuredPort = config.GetValue<int?>("LocalPort");
        if (configuredPort is int and (<= 0 or > 65535))
        {
            Console.WriteLine($"Invalid LocalPort '{configuredPort}' in appsettings.json — must be between 1 and 65535. Exiting.");
            return;
        }
        if (configuredPort is int validConfiguredPort)
        {
            LocalApiPort = validConfiguredPort;
        }

        var localPortArg = GetArg(args, "--local-port");
        if (localPortArg is not null)
        {
            if (!int.TryParse(localPortArg, out var parsedPort) || parsedPort is <= 0 or > 65535)
            {
                Console.WriteLine($"Invalid --local-port '{localPortArg}' — must be a number between 1 and 65535. Exiting.");
                return;
            }
            LocalApiPort = parsedPort;
        }

        var macId = GetPrimaryMacAddress();
        if (macId is null)
        {
            Console.WriteLine("Could not determine a MAC address for this machine. Exiting.");
            return;
        }

        _macId = macId;
        _deviceName = deviceName;
        _location = location;

        Console.WriteLine($"Agent starting.");
        Console.WriteLine($"  MAC ID:     {macId}");
        Console.WriteLine($"  Name:       {deviceName}");
        Console.WriteLine($"  Location:   {location}");
        Console.WriteLine($"  Local port: {LocalApiPort}");

        var cts = new CancellationTokenSource();
        var localListener = StartLocalIdentityServer(cts.Token);
        Console.WriteLine("Ready. Press Ctrl+C to exit.");

        var exitSignal = new TaskCompletionSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            Console.WriteLine("Shutting down...");
            cts.Cancel();
            localListener.Stop();
            exitSignal.TrySetResult();
        };

        await exitSignal.Task;
    }

    /// <summary>
    /// Hosts a set of tiny endpoints under http://localhost:5090/ — a browser
    /// running on THIS SAME machine can fetch() these to learn things about
    /// its own PC that JavaScript itself has no way to read (MAC address,
    /// hostname, OS version, local IP, logged-in username), and to trigger
    /// actions that only make sense on this machine, like printing. CORS is
    /// wide open here because this only ever listens on loopback; nothing
    /// outside this machine can reach it.
    /// </summary>
    private static HttpListener StartLocalIdentityServer(CancellationToken token)
    {
        var listener = new HttpListener();
        listener.Prefixes.Add($"http://localhost:{LocalApiPort}/");
        listener.Start();
        Console.WriteLine($"Local identity endpoints: http://localhost:{LocalApiPort}/{{mac|name|location|hostname|os-version|local-ip|username}}");
        Console.WriteLine($"Local print endpoint: POST http://localhost:{LocalApiPort}/print");

        // Just tracks which GET paths exist — HandleLocalGetRequest's switch
        // decides what each one actually returns. Add a new path here (and a
        // matching case in the switch) to wire up another GET endpoint.
        var getRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "/mac", "/name", "/location", "/hostname", "/os-version", "/local-ip", "/username",
        };

        // Just tracks which POST paths exist — HandleLocalPostRequest's switch
        // decides what each one actually does. Add a new path here (and a
        // matching case in the switch) to wire up another POST endpoint.
        var postRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "/print",
        };

        _ = Task.Run(async () =>
        {
            while (!token.IsCancellationRequested)
            {
                HttpListenerContext ctx;
                try
                {
                    ctx = await listener.GetContextAsync();
                }
                catch (HttpListenerException)
                {
                    break; // listener was stopped
                }
                catch (ObjectDisposedException)
                {
                    break;
                }

                _ = Task.Run(() => HandleLocalRequest(ctx, getRoutes, postRoutes));
            }
        }, token);

        return listener;
    }

    // Only this app's own web page is allowed to call these endpoints — a
    // wildcard "*" origin would let ANY website open in the same browser
    // (not just ours) read this machine's MAC/hostname/username or trigger
    // a print, since the listener itself can't tell requests apart by who's
    // asking, only CORS can. Add other trusted origins here if the web app
    // is ever served from somewhere other than the Vite dev server.
    private static readonly HashSet<string> AllowedOrigins = new(StringComparer.OrdinalIgnoreCase)
    {
        "http://localhost:5173",
    };

    private static void HandleLocalRequest(
        HttpListenerContext ctx,
        HashSet<string> getRoutes,
        HashSet<string> postRoutes)
    {
        var response = ctx.Response;

        var origin = ctx.Request.Headers["Origin"];
        if (origin != null && AllowedOrigins.Contains(origin))
        {
            response.Headers.Add("Access-Control-Allow-Origin", origin);
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
        }
        // No matching Origin header: omit CORS headers entirely so the browser
        // blocks the calling page from reading the response, no matter what
        // it is (including the OPTIONS preflight below, which will fail to
        // authorize any real request from an untrusted origin).

        try
        {
            if (ctx.Request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 204;
                return;
            }

            var path = ctx.Request.Url?.AbsolutePath ?? "";

            if (ctx.Request.HttpMethod == "POST")
            {
                if (!postRoutes.Contains(path))
                {
                    response.StatusCode = 404;
                    return;
                }

                try
                {
                    HandleLocalPostRequest(ctx, path);
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "POST {Path} failed.", path);
                    response.StatusCode = 500;

                    var errorPayload = JsonSerializer.Serialize(new { success = false, message = "The local agent could not process the request." });
                    var errorBytes = Encoding.UTF8.GetBytes(errorPayload);
                    response.ContentType = "application/json";
                    response.ContentLength64 = errorBytes.Length;
                    response.OutputStream.Write(errorBytes, 0, errorBytes.Length);
                }
                return;
            }

            if (!getRoutes.Contains(path))
            {
                response.StatusCode = 404;
                return;
            }

            HandleLocalGetRequest(ctx, path);
        }
        finally
        {
            response.Close();
        }
    }

    private static void HandleLocalPostRequest(HttpListenerContext ctx, string path)
    {
        switch (path)
        {
            case "/print":
                HandleLocalPrintRequest(ctx);
                break;

            default:
                return;
        }
    }

    private static void HandleLocalGetRequest(HttpListenerContext ctx, string path)
    {
        // Re-read live rather than reuse the values captured at startup —
        // e.g. local IP or logged-in user can change while the agent keeps
        // running.
        string value;
        switch (path)
        {
            case "/mac":
                value = GetMacId();
                break;

            case "/name":
                value = GetDeviceName();
                break;

            case "/location":
                value = GetLocation();
                break;

            case "/hostname":
                value = Environment.MachineName;
                break;

            case "/os-version":
                value = RuntimeInformation.OSDescription;
                break;

            case "/local-ip":
                value = GetLocalIPv4Address();
                break;

            case "/username":
                value = Environment.UserName;
                break;

            default:
                return;
        }

        var response = ctx.Response;
        var payload = JsonSerializer.Serialize(new { value });
        var bytes = Encoding.UTF8.GetBytes(payload);
        response.ContentType = "application/json";
        response.ContentLength64 = bytes.Length;
        response.OutputStream.Write(bytes, 0, bytes.Length);
    }

    /// <summary>
    /// POST http://localhost:5090/print — body: { "text": "...", "printer": "..." (optional) }.
    /// Only reachable from a browser on THIS machine, which is the point:
    /// printing only makes sense on the PC the printer is physically
    /// attached to, so there's no SignalR/remote path for it.
    /// Sample response only — actual printing isn't wired up yet.
    /// </summary>
    private static void HandleLocalPrintRequest(HttpListenerContext ctx)
    {
        var response = ctx.Response;
        Console.WriteLine("Print started.");
        string text;
        try
        {
            using var reader = new System.IO.StreamReader(ctx.Request.InputStream, Encoding.UTF8);
            var body = reader.ReadToEnd();
            var parsed = JsonSerializer.Deserialize<JsonElement>(body);
            text = parsed.TryGetProperty("text", out var textProp) ? textProp.GetString() ?? "" : "";
        }
        catch (JsonException)
        {
            text = "";
        }

        var payload = JsonSerializer.Serialize(new { success = true, message = "success" });
        var bytes = Encoding.UTF8.GetBytes(payload);
        response.ContentType = "application/json";
        response.ContentLength64 = bytes.Length;
        response.OutputStream.Write(bytes, 0, bytes.Length);
        Console.WriteLine("Print finished.");
    }

    /// <summary>
    /// First non-loopback IPv4 address on an up interface — the machine's
    /// LAN-facing address, which a browser cannot reliably obtain on its own.
    /// </summary>
    private static string GetLocalIPv4Address()
    {
        var address = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up)
            .Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);

        return address?.Address.ToString() ?? "unknown";
    }

    /// <summary>
    /// Picks the MAC address of the first "real" network adapter (skips loopback
    /// and virtual/tunnel adapters). This is the kind of hardware identifier a
    /// browser cannot obtain — hence running this as a native agent.
    /// </summary>
    private static string? GetPrimaryMacAddress()
    {
        var nic = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up)
            .Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
            .OrderByDescending(n => n.NetworkInterfaceType == NetworkInterfaceType.Ethernet) // prefer wired
            .FirstOrDefault();

        var bytes = nic?.GetPhysicalAddress()?.GetAddressBytes();
        if (bytes is null || bytes.Length == 0) return null;

        return string.Join(":", bytes.Select(b => b.ToString("X2")));
    }

    private static string? GetArg(string[] args, string name)
    {
        var idx = Array.IndexOf(args, name);
        return idx >= 0 && idx + 1 < args.Length ? args[idx + 1] : null;
    }
}
