SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_SearchProducts]
    @Query NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 50
        p.Id, p.Barcode, p.Name, p.GenericName, p.Unit,
        p.CategoryId, c.Name AS CategoryName,
        p.SellingPrice, p.CostPrice,
        p.StockQuantity, p.ReorderLevel,
        COALESCE((SELECT SUM(b.StockQuantity) FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND (b.ExpiryDate IS NULL OR b.ExpiryDate>=CONVERT(date,GETDATE()))),0) AS AvailableStockQuantity,
        p.RequiresPrescription, p.IsActive, p.ExpiryDate,
        CAST(CASE WHEN p.StockQuantity <= p.ReorderLevel      THEN 1 ELSE 0 END AS BIT) AS IsLowStock,
        CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND b.StockQuantity>0 AND b.ExpiryDate<CONVERT(date,GETDATE())) AND NOT EXISTS(SELECT 1 FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id AND b.StockQuantity>0 AND (b.ExpiryDate IS NULL OR b.ExpiryDate>=CONVERT(date,GETDATE()))) THEN 1 ELSE 0 END AS BIT) AS IsExpired,
        CAST(0 AS BIT) AS IsExpiringSoon
    FROM   Products p
    JOIN   Categories c ON p.CategoryId = c.Id
    WHERE  p.IsActive = 1
      AND (p.Barcode    = @Query
        OR p.Name        LIKE '%' + @Query + '%'
        OR p.GenericName LIKE '%' + @Query + '%')
    ORDER  BY CASE WHEN p.Barcode = @Query THEN 0 ELSE 1 END, p.Name;
END
GO
