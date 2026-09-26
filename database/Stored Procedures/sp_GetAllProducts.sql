SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetAllProducts]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.Id, p.Barcode, p.Name, p.BrandName, p.GenericName, p.Description,
        p.DosageStrength, p.Unit, p.CategoryId, c.Name AS CategoryName,
        p.SupplierId, s.Name AS SupplierName,
        p.CostPrice, p.SellingPrice,
        p.StockQuantity, p.ReorderLevel,
        COALESCE((SELECT SUM(b.StockQuantity) FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND (b.ExpiryDate IS NULL OR b.ExpiryDate>=CONVERT(date,GETDATE()))),0) AS AvailableStockQuantity,
        p.RequiresPrescription, p.IsActive,
        p.ExpiryDate, p.CreatedAt, p.UpdatedAt, BatchNo,
        CAST(CASE WHEN p.StockQuantity <= p.ReorderLevel    THEN 1 ELSE 0 END AS BIT) AS IsLowStock,
        CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND b.StockQuantity>0 AND b.ExpiryDate<CONVERT(date,GETDATE())) AND NOT EXISTS(SELECT 1 FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND b.StockQuantity>0 AND (b.ExpiryDate IS NULL OR b.ExpiryDate>=CONVERT(date,GETDATE()))) THEN 1 ELSE 0 END AS BIT) AS IsExpired,
        CAST(CASE WHEN p.ExpiryDate >= CAST(GETDATE() AS DATE)
                   AND p.ExpiryDate <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
                  THEN 1 ELSE 0 END AS BIT) AS IsExpiringSoon
    FROM   Products p
    JOIN   Categories c ON p.CategoryId = c.Id
    LEFT JOIN Suppliers s ON p.SupplierId = s.Id
    ORDER  BY p.Name;
END
GO
