using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using Microsoft.IdentityModel.Tokens;
using PharmacyApi.Data;
using PharmacyApi.Models;

namespace PharmacyApi.Services
{
    public interface IAuthService
    {
        Task<(bool ok, string msg, LoginResponse? data)> LoginAsync(LoginRequest req);
        Task CloseSessionAsync(int sessionId, decimal closingCash);
    }

    public class AuthService : IAuthService
    {
        private readonly IDbConnectionFactory _db;
        private readonly IConfiguration _cfg;
        public AuthService(IDbConnectionFactory db, IConfiguration cfg) { _db=db; _cfg=cfg; }

        public async Task<(bool ok, string msg, LoginResponse? data)> LoginAsync(LoginRequest req)
        {
            using var conn = _db.Create();
            var user = await conn.QueryFirstOrDefaultAsync<LoginUserRow>(
                "sp_LoginUser", new { Username=req.Username, Terminal="WEB-1" },
                commandType: CommandType.StoredProcedure);

            if (user == null)                                    return (false, "Invalid username or password.", null);
            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return (false, "Invalid username or password.", null);

            await conn.ExecuteAsync("sp_UpdateLastLogin", new { UserId=user.Id }, commandType: CommandType.StoredProcedure);

            var sessionId = await conn.ExecuteScalarAsync<int>("sp_OpenSession",
                new { UserId=user.Id, Terminal="WEB-1", OpeningCash=0m },
                commandType: CommandType.StoredProcedure);

            var token = BuildJwt(user.Id, user.Username, user.FullName, user.Role, sessionId);
            return (true, "Login successful.", new LoginResponse(token, user.FullName, user.Username, user.Role, user.Id, sessionId));
        }

        public async Task CloseSessionAsync(int sessionId, decimal closingCash)
        {
            using var conn = _db.Create();
            await conn.ExecuteAsync("sp_CloseSession",
                new { SessionId=sessionId, ClosingCash=closingCash },
                commandType: CommandType.StoredProcedure);
        }

        private string BuildJwt(int userId, string username, string fullName, string role, int sessionId)
        {
            var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
            var creds   = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddHours(double.Parse(_cfg["Jwt:ExpiryHours"] ?? "12"));
            var claims  = new[]
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
            public int      Id           { get; set; }
            public string   Username     { get; set; } = "";
            public string   PasswordHash { get; set; } = "";
            public string   FullName     { get; set; } = "";
            public string   Email        { get; set; } = "";
            public string   Phone        { get; set; } = "";
            public string   Role         { get; set; } = "";
            public bool     IsActive     { get; set; }
            public DateTime? LastLogin   { get; set; }
        }
    }
}
