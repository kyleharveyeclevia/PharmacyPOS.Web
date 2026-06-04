using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Middleware;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        private readonly IAuthService     _auth;
        public ReportsController(IPharmacyService svc, IAuthService auth) { _svc=svc; _auth=auth; }

        [HttpGet("dashboard")]
        public async Task<ActionResult<ApiResult<DashboardDto>>> Dashboard()
            => Ok(ApiResult<DashboardDto>.Ok(await _svc.GetDashboardAsync()));

        [HttpGet("xread")]
        public async Task<ActionResult<ApiResult<XReadDto>>> XRead()
            => Ok(ApiResult<XReadDto>.Ok(await _svc.GenerateXReadAsync(User.GetSessionId())));

        /// <summary>
        /// Generates Z-Read AND closes the session. Do NOT call /auth/logout after this.
        /// </summary>
        [HttpPost("zread")]
        public async Task<ActionResult<ApiResult<ZReadDto>>> ZRead([FromBody] ZReadRequest req)
        {
            var sessionId = User.GetSessionId();
            var report    = await _svc.GenerateZReadAsync(sessionId, req.ClosingCash);
            await _auth.CloseSessionAsync(sessionId, req.ClosingCash);
            return Ok(ApiResult<ZReadDto>.Ok(report, "Z-Read generated. Session closed."));
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResult<SalesSummaryDto>>> Summary(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
            => Ok(ApiResult<SalesSummaryDto>.Ok(
                await _svc.GetSalesSummaryAsync(startDate ?? DateTime.Today, endDate ?? DateTime.Today)));

        [HttpGet("getFastMovingItems")]
        public async Task<ActionResult<ApiResult<List<MovingItemsDto>>>> GetFastMovingItems(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
            => Ok(ApiResult<List<MovingItemsDto>>.Ok(
                await _svc.GetFastMovingItemsAsync(startDate ?? DateTime.Today, endDate ?? DateTime.Today)));

        [HttpGet("getSlowMovingItems")]
        public async Task<ActionResult<ApiResult<List<MovingItemsDto>>>> GetSlowMovingItems(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
            => Ok(ApiResult<List<MovingItemsDto>>.Ok(
                await _svc.GetSlowMovingItemsAsync(startDate ?? DateTime.Today, endDate ?? DateTime.Today)));

        [HttpGet("sessions")]
        public async Task<ActionResult<ApiResult<List<SessionSummaryDto>>>> Sessions([FromQuery] DateTime? date)
            => Ok(ApiResult<List<SessionSummaryDto>>.Ok(await _svc.GetSessionsAsync(date ?? DateTime.Today)));
    }

    public record ZReadRequest(decimal ClosingCash);
}
