using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Data;
using PharmacyApi.Models;

namespace PharmacyApi.Controllers;

[ApiController]
[Route("api/reports/inventory")]
[Authorize(Roles = "Admin,Pharmacist")]
public sealed class InventoryReportsController(IDbConnectionFactory db) : ControllerBase
{
    [HttpGet("low-stock")]
    public async Task<ActionResult<ApiResult<object>>> LowStock()
    {
        using var connection = db.Create();
        var rows = await connection.QueryAsync("""
            SELECT p.Id,p.Name AS ProductName,c.Name AS CategoryName,p.StockQuantity,
                   stock.AvailableStockQuantity,p.ReorderLevel,
                   CASE WHEN p.ReorderLevel > stock.AvailableStockQuantity THEN p.ReorderLevel-stock.AvailableStockQuantity ELSE 0 END AS SuggestedOrder
            FROM dbo.Products p
            LEFT JOIN dbo.Categories c ON c.Id=p.CategoryId
            CROSS APPLY (SELECT ISNULL(SUM(b.StockQuantity),0) AS AvailableStockQuantity
                         FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND b.StockQuantity>0
                           AND (b.ExpiryDate IS NULL OR b.ExpiryDate>=CONVERT(date,GETDATE()))) stock
            WHERE p.IsActive=1 AND stock.AvailableStockQuantity<=p.ReorderLevel
            ORDER BY stock.AvailableStockQuantity,p.Name,p.Id;
            """);
        return Ok(ApiResult<object>.Ok(rows));
    }

    [HttpGet("expiry")]
    public async Task<ActionResult<ApiResult<object>>> Expiry([FromQuery] int days = 90)
    {
        if (days is < 1 or > 365) return BadRequest(ApiResult<object>.Fail("Days must be between 1 and 365."));
        using var connection = db.Create();
        var rows = await connection.QueryAsync("""
            SELECT b.Id,p.Name AS ProductName,b.BatchNo,b.ExpiryDate,b.StockQuantity,
                   CASE WHEN b.ExpiryDate<CONVERT(date,GETDATE()) THEN 'Expired' ELSE 'Expiring Soon' END AS Status
            FROM dbo.InventoryBatches b JOIN dbo.Products p ON p.Id=b.ProductId
            WHERE b.StockQuantity>0 AND b.ExpiryDate IS NOT NULL
              AND b.ExpiryDate<=DATEADD(day,@days,CONVERT(date,GETDATE()))
            ORDER BY b.ExpiryDate,p.Name,b.Id;
            """, new { days });
        return Ok(ApiResult<object>.Ok(rows));
    }
}
