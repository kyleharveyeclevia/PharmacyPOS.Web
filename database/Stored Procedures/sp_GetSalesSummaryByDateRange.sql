SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetSalesSummaryByDateRange]
    @StartDate DATE,
    @EndDate   DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        COUNT(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN 1 END)     AS TotalCount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount    END),0) AS TotalSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.DiscountAmount END),0) AS TotalDiscount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.VatAmount      END),0) AS TotalVat,
        ISNULL((
            SELECT SUM(ti.Quantity)
            FROM   TransactionItems ti
            JOIN   Transactions t2 ON ti.TransactionId = t2.Id
            WHERE  t2.TransactionDate >= @StartDate AND t2.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate))
              AND  t2.TransactionType = 'Sale'
              AND  t2.IsVoided = 0
        ), 0) AS TotalItems
    FROM   Transactions t
    WHERE  t.TransactionDate >= @StartDate AND t.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate));
END
GO
