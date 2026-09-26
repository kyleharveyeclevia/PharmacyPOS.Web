SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetDashboardStats]
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);

    -- Result set 1: today's sales figures
    SELECT
        ISNULL(SUM(CASE WHEN t.TransactionDate >= @Today AND t.TransactionDate < DATEADD(DAY,1,@Today)
                         AND t.TransactionType = 'Sale' AND t.IsVoided = 0
                    THEN t.TotalAmount END), 0) AS TodaySales,
        COUNT(CASE WHEN t.TransactionDate >= @Today AND t.TransactionDate < DATEADD(DAY,1,@Today)
                    AND t.TransactionType = 'Sale' AND t.IsVoided = 0
               THEN 1 END) AS TodayTransactions,
        ISNULL(AVG(CASE WHEN t.TransactionDate >= @Today AND t.TransactionDate < DATEADD(DAY,1,@Today)
                         AND t.TransactionType = 'Sale' AND t.IsVoided = 0
                    THEN t.TotalAmount END), 0) AS AvgTransaction
    FROM   Transactions t;

    -- Result set 2: low stock count
    SELECT COUNT(*) AS LowStockCount
    FROM   Products
    WHERE  IsActive = 1 AND StockQuantity <= ReorderLevel;

    -- Result set 3: recent 10 transactions today
    SELECT TOP 10
        t.Id, t.ReceiptNumber, t.TransactionDate,
        u.FullName AS CashierName,
        t.TotalAmount, t.TransactionType, t.IsVoided
    FROM   Transactions t
    JOIN   Users u ON t.UserId = u.Id
    WHERE  t.TransactionDate >= @Today AND t.TransactionDate < DATEADD(DAY,1,@Today)
    AND t.IsVoided = 0
    ORDER  BY t.TransactionDate DESC;

    -- Result set 4: top 10 low-stock items
    SELECT TOP 10
        p.Id, p.Name, p.StockQuantity, p.ReorderLevel,
        c.Name AS CategoryName,
        CAST(1 AS BIT) AS IsLowStock,
        CAST(CASE WHEN p.ExpiryDate < @Today THEN 1 ELSE 0 END AS BIT) AS IsExpired,
        CAST(0 AS BIT) AS IsExpiringSoon,
        p.Barcode, p.GenericName, p.Unit,
        p.CategoryId, p.SupplierId, p.CostPrice, p.SellingPrice,
        p.RequiresPrescription, p.IsActive, p.ExpiryDate,
        p.CreatedAt, p.UpdatedAt
    FROM   Products p
    JOIN   Categories c ON p.CategoryId = c.Id
    WHERE  p.IsActive = 1 AND p.StockQuantity <= p.ReorderLevel
    ORDER  BY p.StockQuantity ASC;
END
GO
