using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Data;
using PharmacyApi.Middleware;
using PharmacyApi.Models;

namespace PharmacyApi.Controllers;

[ApiController]
[Route("api/products/{productId:int}/batches")]
[Authorize(Roles = "Admin,Pharmacist")]
public sealed class InventoryBatchesController(IDbConnectionFactory db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResult<object>>> Get(int productId)
    {
        using var connection = db.Create();
        var batches = await connection.QueryAsync("SELECT Id,ProductId,BatchNo,ExpiryDate,StockQuantity FROM dbo.InventoryBatches WHERE ProductId=@productId ORDER BY ExpiryDate,Id", new { productId });
        return Ok(ApiResult<object>.Ok(batches));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResult<int>>> Receive(int productId, ReceiveBatchRequest request)
    {
        if (request.Quantity <= 0 || string.IsNullOrWhiteSpace(request.BatchNo) || request.BatchNo.Length > 50)
            return BadRequest(ApiResult<int>.Fail("Batch number and positive quantity are required."));
        using var connection = db.Create();
        var result = await connection.QuerySingleAsync<BatchResult>("sp_ReceiveBatch", new { ProductId = productId, request.BatchNo, request.ExpiryDate, request.Quantity, UserId = User.GetUserId() }, commandType: CommandType.StoredProcedure);
        return result.Result > 0 ? Ok(ApiResult<int>.Ok(result.Result, result.Message)) : BadRequest(ApiResult<int>.Fail(result.Message));
    }
    public sealed record ReceiveBatchRequest(string BatchNo, DateTime? ExpiryDate, int Quantity);
    private sealed class BatchResult { public int Result { get; set; } public string Message { get; set; } = ""; }
}
