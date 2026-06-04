using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Middleware;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        public UsersController(IPharmacyService svc) => _svc = svc;

        [HttpGet] public async Task<ActionResult<ApiResult<List<UserDto>>>> GetAll()
            => Ok(ApiResult<List<UserDto>>.Ok(await _svc.GetUsersAsync()));

        [HttpPost]
        public async Task<ActionResult<ApiResult>> Create([FromBody] CreateUserRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username)) return BadRequest(ApiResult.Fail("Username required."));
            if (string.IsNullOrWhiteSpace(req.Password)) return BadRequest(ApiResult.Fail("Password required."));
            if (req.Password.Length < 6)                 return BadRequest(ApiResult.Fail("Password min 6 chars."));
            if (string.IsNullOrWhiteSpace(req.FullName)) return BadRequest(ApiResult.Fail("Full name required."));
            var (ok, msg) = await _svc.CreateUserAsync(req);
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResult>> Update(int id, [FromBody] UpdateUserRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.FullName)) return BadRequest(ApiResult.Fail("Full name required."));
            if (!string.IsNullOrEmpty(req.NewPassword) && req.NewPassword.Length < 6)
                return BadRequest(ApiResult.Fail("Password min 6 chars."));
            var (ok, msg) = await _svc.UpdateUserAsync(id, req);
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }

        [HttpPatch("{id:int}/toggle")]
        public async Task<ActionResult<ApiResult>> Toggle(int id)
        {
            var (ok, msg) = await _svc.ToggleUserAsync(id, User.GetUserId());
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }
    }
}
