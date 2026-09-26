using System.Net.NetworkInformation;
using PharmacyHardwareAgent.Hubs;

int passed = 0;
void Check(bool success, string description) { if (!success) throw new Exception("FAIL: " + description); Console.WriteLine("PASS: " + description); passed++; }
MacAdapter Adapter(string id, NetworkInterfaceType type, OperationalStatus status, string hex, string description = "Physical adapter")
    => new(id, id, description, type, status, Convert.FromHexString(hex));
var empty = Adapter("miniport", NetworkInterfaceType.Ethernet, OperationalStatus.Up, "", "WAN Miniport");
var wifi = Adapter("wifi", NetworkInterfaceType.Wireless80211, OperationalStatus.Up, "AABBCCDDEEFF");
var wired = Adapter("ethernet", NetworkInterfaceType.Ethernet, OperationalStatus.Up, "AABBCCDDEE01");
Check(MacAddressSelector.Select([empty, wifi]) == "AA:BB:CC:DD:EE:FF", "empty MAC on an active Ethernet miniport does not hide valid Wi-Fi");
Check(MacAddressSelector.Select([Adapter("zero", NetworkInterfaceType.Ethernet, OperationalStatus.Up, "000000000000"), wifi]) == "AA:BB:CC:DD:EE:FF", "zero MAC skipped");
Check(MacAddressSelector.Select([Adapter("invalid", NetworkInterfaceType.Ethernet, OperationalStatus.Up, "010203040506"), wifi]) == "AA:BB:CC:DD:EE:FF", "multicast MAC skipped");
Check(MacAddressSelector.Select([wired, wifi]) == "AA:BB:CC:DD:EE:01", "active physical Ethernet preferred over active Wi-Fi");
Check(MacAddressSelector.Select([wired with { Status = OperationalStatus.Down }, wifi]) == "AA:BB:CC:DD:EE:FF", "active Wi-Fi preferred over disconnected Ethernet");
Check(MacAddressSelector.Select([wired with { Status = OperationalStatus.Down }]) == "AA:BB:CC:DD:EE:01", "offline adapter still identifies machine");
Check(MacAddressSelector.Select([wired with { Description = "Hyper-V Virtual Ethernet" }, wifi]) == "AA:BB:CC:DD:EE:FF", "physical Wi-Fi preferred over virtual Ethernet");
Check(MacAddressSelector.Select([wired with { Type = NetworkInterfaceType.Loopback }, wifi with { Type = NetworkInterfaceType.Tunnel }]) is null, "loopback and tunnel excluded");
Check(MacAddressSelector.Select([wired with { Status = OperationalStatus.NotPresent }]) is null, "absent hardware excluded");
Check(MacAddressSelector.Select([empty]) is null, "no valid MAC yields no invented identity");
Check(MacAddressSelector.Normalize("aa-bb-cc-dd-ee-ff") == "AA:BB:CC:DD:EE:FF", "configured MAC normalized");
Check(MacAddressSelector.Normalize("aabbccddeeff") == "AA:BB:CC:DD:EE:FF", "compact MAC normalized");
Check(new[] { "", "bad", "000000000000", "FFFFFFFFFFFF", "AA:BB:CC:DD:EE", "AA BB CC DD EE FF" }.All(s => MacAddressSelector.Normalize(s) is null), "invalid configured MAC rejected");
var selected = MacAddressSelector.Select(MacAddressSelector.ReadAdapters());
Check(selected is not null, "this machine now resolves a valid adapter MAC");
Console.WriteLine($"{passed} hardware-agent checks passed.");
