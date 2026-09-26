SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetXReadData]
    @SessionId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: session + cashier info
    SELECT
        s.Id AS SessionId, s.LoginTime, s.Terminal, s.OpeningCash,
        u.FullName AS CashierName
    FROM   Sessions s
    JOIN   Users u ON s.UserId = u.Id
    WHERE  s.Id = @SessionId;

    -- Result set 2: aggregated sales summary
    SELECT
        COUNT(CASE WHEN t.TransactionType = 'Sale' AND t.IsVoided = 0 THEN 1 END)
            AS TotalTransactions,
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
        ISNULL(SUM(CASE WHEN t.IsVoided = 1                            THEN t.TotalAmount END),0) AS VoidAmount
    FROM   Transactions t
    WHERE  t.SessionId = @SessionId;

    -- Result set 3: items sold count
    SELECT ISNULL(SUM(ti.Quantity), 0) AS ItemsSold
    FROM   TransactionItems ti
    JOIN   Transactions t ON ti.TransactionId = t.Id
    WHERE  t.SessionId = @SessionId
      AND  t.TransactionType = 'Sale'
      AND  t.IsVoided = 0;

   -- Result set 4: items sold
    SELECT
        ti.Id,
        ti.ProductId,
        ti.ProductName,
        ti.ProductBarcode,
        ti.Quantity,
        ti.UnitPrice,
        ti.LineTotal
    FROM   TransactionItems ti
    JOIN   Transactions t ON ti.TransactionId = t.Id
    WHERE  t.SessionId = @SessionId
      AND  t.TransactionType = 'Sale'
      AND  t.IsVoided = 0;
END
GO
