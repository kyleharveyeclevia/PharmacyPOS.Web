SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetZReadData]
    @SessionId   INT,
    @ClosingCash DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: session info
    SELECT
        s.Id AS SessionId, s.LoginTime, s.OpeningCash, s.Terminal,
        @ClosingCash AS ClosingCash,
        u.FullName AS CashierName
    FROM   Sessions s
    JOIN   Users u ON s.UserId = u.Id
    WHERE  s.Id = @SessionId;

    -- Result set 2: full sales summary (includes ItemsSold)
    SELECT
        COUNT(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN 1 END) AS TotalTransactions,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.SubTotal       END),0) AS GrossSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.DiscountAmount END),0) AS TotalDiscount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.VatAmount      END),0) AS TotalVat,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount    END),0) AS NetSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='Cash'       THEN t.TotalAmount END),0) AS CashSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='Card'       THEN t.TotalAmount END),0) AS CardSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='GCash'      THEN t.TotalAmount END),0) AS GCashSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='PhilHealth' THEN t.TotalAmount END),0) AS PhilHealthSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='HMO' THEN t.TotalAmount END),0) AS HMOSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Return' AND t.IsVoided=0                 THEN t.TotalAmount END),0) AS RefundAmount,
        ISNULL(SUM(CASE WHEN t.IsVoided=1                               THEN t.TotalAmount END),0) AS VoidAmount,
        ISNULL((SELECT SUM(ti2.Quantity)
                FROM TransactionItems ti2
                JOIN Transactions t2 ON ti2.TransactionId = t2.Id
                WHERE t2.SessionId = @SessionId
                  AND t2.TransactionType = 'Sale'
                  AND t2.IsVoided = 0), 0) AS ItemsSold
    FROM   Transactions t
    WHERE  t.SessionId = @SessionId;

    -- Result set 3: hourly sales breakdown
    SELECT
        DATEPART(HOUR, t.TransactionDate) AS [Hour],
        COUNT(*)                           AS [Count],
        SUM(t.TotalAmount)                 AS Amount
    FROM   Transactions t
    WHERE  t.SessionId       = @SessionId
      AND  t.TransactionType = 'Sale'
      AND  t.IsVoided        = 0
    GROUP  BY DATEPART(HOUR, t.TransactionDate)
    ORDER  BY [Hour];

    -- Result set 4: top 10 products
    SELECT TOP 10
        ti.ProductName,
        SUM(ti.Quantity) AS QuantitySold,
        SUM(ti.LineTotal) AS Revenue
    FROM   TransactionItems ti
    JOIN   Transactions t ON ti.TransactionId = t.Id
    WHERE  t.SessionId       = @SessionId
      AND  t.TransactionType = 'Sale'
      AND  t.IsVoided        = 0
    GROUP  BY ti.ProductName
    ORDER  BY Revenue DESC;
END
GO
