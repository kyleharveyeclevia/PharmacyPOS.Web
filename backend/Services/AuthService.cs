using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using Microsoft.IdentityModel.Tokens;
using PharmacyApi.Data;
using PharmacyApi.Models;
using Serilog.Core;

namespace PharmacyApi.Services
{
    public interface IAuthService
    {
        Task<(bool ok, string msg, LoginResponse? data)> LoginAsync(LoginRequest req);
        Task CloseSessionAsync(int sessionId, decimal closingCash);
        Task<(bool ok, string msg, TerminalActivateResponse? data)> ActivateTerminalAsync(TerminalActivateRequest req);
    }

    public class AuthService : IAuthService
    {
        private readonly IDbConnectionFactory _db;
        private readonly IConfiguration _cfg;
        public AuthService(IDbConnectionFactory db, IConfiguration cfg) { _db = db; _cfg = cfg; }

        public async Task<(bool ok, string msg, LoginResponse? data)> LoginAsync(LoginRequest req)
        {
            using var conn = _db.Create();

            // 1. Validate terminal first
            var terminal = await conn.QueryFirstOrDefaultAsync<TerminalRow>(
                @"SELECT * FROM Terminals WHERE TerminalGuid = @guid AND IsActive = 1",
                new { guid = req.TerminalGuid });

            if (terminal == null)
                return (false, "Invalid terminal device.", null);

            // 2. Validate user
            var user = await conn.QueryFirstOrDefaultAsync<LoginUserRow>(
                "sp_LoginUser",
                new { Username = req.Username },
                commandType: CommandType.StoredProcedure);

            if (user == null)
                return (false, "Invalid username or password.", null);

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return (false, "Invalid username or password.", null);

            // 3. Open session with terminal ID
            var result = await conn.QuerySingleAsync<OpenSessionResult>(
            "sp_OpenSessionWithTerminalId",
            new
            {
                UserId = user.Id,
                TerminalId = terminal.Id,
                OpeningCash = 0m
            },
             commandType: CommandType.StoredProcedure);

            int sessionId = result.SessionId;
            string message = result.Message;

            if(sessionId <= 0)
                return(false, message, null);

            // 4. Update last login
            await conn.ExecuteAsync("sp_UpdateLastLogin",
                new { UserId = user.Id },
                commandType: CommandType.StoredProcedure);

            var token = BuildJwt(user.Id, user.Username, user.FullName, user.Role, sessionId);

            return (true, "Login successful.",
                new LoginResponse(
                    token,
                    user.FullName,
                    user.Username,
                    user.Role,
                    user.Id,
                    sessionId
                ));
        }

        public async Task CloseSessionAsync(int sessionId, decimal closingCash)
        {
            using var conn = _db.Create();
            await conn.ExecuteAsync("sp_CloseSession",
                new { SessionId = sessionId, ClosingCash = closingCash },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<(bool ok, string msg, TerminalActivateResponse? data)> ActivateTerminalAsync(TerminalActivateRequest req)
        {
            using var conn = _db.Create();
            string query = @"SELECT TOP 1 *
          FROM Terminals
          WHERE TerminalCode = @code AND IsActive = 1";
            var terminal = await conn.QueryFirstOrDefaultAsync<TerminalRow>(
                query,
                new { code = req.TerminalCode });

            if (terminal == null)
                return (false, "Invalid or inactive terminal.", null);

            return (true, "Terminal activated.", new TerminalActivateResponse(
                terminal.Id,
                terminal.TerminalGuid,
                terminal.TerminalCode,
                terminal.TerminalName,
                terminal.BranchId
            ));
        }

        private string BuildJwt(int userId, string username, string fullName, string role, int sessionId)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddHours(double.Parse(_cfg["Jwt:ExpiryHours"] ?? "12"));
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("userId",    userId.ToString()),
                new Claim("sessionId", sessionId.ToString()),
                new Claim("fullName",  fullName),
                new Claim(ClaimTypes.Role, role)
            };
            return new JwtSecurityTokenHandler().WriteToken(
                new JwtSecurityToken(_cfg["Jwt:Issuer"], _cfg["Jwt:Audience"], claims, expires: expires, signingCredentials: creds));
        }

        private class LoginUserRow
        {
            public int Id { get; set; }
            public string Username { get; set; } = "";
            public string PasswordHash { get; set; } = "";
            public string FullName { get; set; } = "";
            public string Email { get; set; } = "";
            public string Phone { get; set; } = "";
            public string Role { get; set; } = "";
            public bool IsActive { get; set; }
            public DateTime? LastLogin { get; set; }
        }

        public class OpenSessionResult
        {
            public int SessionId { get; set; }
            public string Message { get; set; }
        }

        public class TerminalRow
        {
            public int Id { get; set; }
            public Guid TerminalGuid { get; set; }
            public string TerminalCode { get; set; } = "";
            public string TerminalName { get; set; } = "";
            public int BranchId { get; set; }
            public bool IsActive { get; set; }
        }
    }
}
