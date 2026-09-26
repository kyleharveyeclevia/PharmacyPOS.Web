using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Data;
using PharmacyApi.Models;

namespace PharmacyApi.Controllers;

[ApiController]
[Route("api/receipts")]
[Authorize]
public sealed class ReceiptsController(IDbConnectionFactory db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResult<object>>> List([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] int pageNumber=1, [FromQuery] int pageSize=25)
    {
        if (pageNumber<1 || pageSize is <1 or >100) return BadRequest(ApiResult<object>.Fail("Invalid page or page size."));
        if (startDate.HasValue && endDate.HasValue && startDate.Value.Date>endDate.Value.Date)
            return BadRequest(ApiResult<object>.Fail("Invalid date range."));
        if (endDate?.Date == DateTime.MaxValue.Date) return BadRequest(ApiResult<object>.Fail("End date is too large."));
        if (search?.Length>200) return BadRequest(ApiResult<object>.Fail("Search is too long."));
        if (!string.IsNullOrEmpty(status) && status is not ("Sale" or "Return" or "Voided"))
            return BadRequest(ApiResult<object>.Fail("Invalid receipt status."));
        using var connection=db.Create();
        using var results=await connection.QueryMultipleAsync("sp_GetReceipts",
            new {StartDate=startDate?.Date,EndDate=endDate?.Date,Search=search?.Trim(),Status=status,PageNumber=pageNumber,PageSize=pageSize}, commandType:CommandType.StoredProcedure);
        var total=await results.ReadSingleAsync<int>();
        var items=(await results.ReadAsync<TransactionDto>()).ToList();
        return Ok(ApiResult<object>.Ok(new {Items=items,TotalRecords=total,PageNumber=pageNumber,PageSize=pageSize}));
    }
}
