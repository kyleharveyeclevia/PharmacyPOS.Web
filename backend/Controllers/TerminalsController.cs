using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Data;
using PharmacyApi.Models;

namespace PharmacyApi.Controllers;

[ApiController]
[Route("api/terminals")]
public sealed class TerminalsController(IDbConnectionFactory db) : ControllerBase
{
    [HttpGet("by-mac/{macAddress}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResult<object>>> ByMac(string macAddress)
    {
        var normalized = NormalizeMac(macAddress);
        if (normalized.Length != 12) return BadRequest(ApiResult<object>.Fail("A valid MAC address is required."));

        using var connection = db.Create();
        var terminal = await connection.QueryFirstOrDefaultAsync<TerminalRow>(
            "SELECT TOP 1 Id, TerminalGuid, TerminalCode, TerminalName, BranchId, MacAddress " +
            "FROM Terminals WHERE IsActive = 1 AND REPLACE(REPLACE(UPPER(MacAddress), ':', ''), '-', '') = @mac",
            new { mac = normalized });

        if (terminal is null) return NotFound(ApiResult<object>.Fail("This machine does not have access to the POS."));
        return Ok(ApiResult<object>.Ok(terminal));
    }

    private static string NormalizeMac(string value) => new string(value.Where(Uri.IsHexDigit).ToArray()).ToUpperInvariant();

    private sealed class TerminalRow
    {
        public int Id { get; set; }
        public Guid TerminalGuid { get; set; }
        public string TerminalCode { get; set; } = "";
        public string TerminalName { get; set; } = "";
        public int BranchId { get; set; }
        public string MacAddress { get; set; } = "";
    }
}
