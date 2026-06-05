using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Middleware;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;
        public AuthController(IAuthService auth) => _auth = auth;

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResult<LoginResponse>>> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(ApiResult<LoginResponse>.Fail("Username and password are required."));
            var (ok, msg, data) = await _auth.LoginAsync(req);
            if (!ok) return Unauthorized(ApiResult<LoginResponse>.Fail(msg));
            return Ok(ApiResult<LoginResponse>.Ok(data!, msg));
        }

        [HttpPost("terminal-activate")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResult<TerminalActivateResponse>>> ActivateTerminal([FromBody] TerminalActivateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.TerminalCode))
                return BadRequest(ApiResult<TerminalActivateResponse>.Fail("Terminal code is required."));

            var (ok, msg, data) = await _auth.ActivateTerminalAsync(req);

            if (!ok)
                return Unauthorized(ApiResult<TerminalActivateResponse>.Fail(msg));

            return Ok(ApiResult<TerminalActivateResponse>.Ok(data!, msg));
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult<ApiResult>> Logout([FromBody] LogoutRequest req)
        {
            await _auth.CloseSessionAsync(User.GetSessionId(), req.ClosingCash);
            return Ok(ApiResult.Ok("Logged out successfully."));
        }

        [HttpGet("me")]
        [Authorize]
        public ActionResult<ApiResult<object>> Me() =>
            Ok(ApiResult<object>.Ok(new { UserId=User.GetUserId(), SessionId=User.GetSessionId(), Role=User.GetRole() }));
    }
}
