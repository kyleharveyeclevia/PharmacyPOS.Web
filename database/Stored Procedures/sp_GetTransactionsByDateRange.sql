SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetTransactionsByDateRange]
    @StartDate DATE,
    @EndDate   DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.Id, t.ReceiptNumber, t.SessionId,
        t.UserId, u.FullName AS CashierName,
        t.CustomerId, c.Name AS CustomerName,
        t.TransactionDate, t.TransactionType,
        t.SubTotal, t.DiscountAmount, t.VatAmount,
        t.TotalAmount, t.AmountTendered, t.[Change],
        t.PaymentMethod, t.IsVoided, t.VoidReason
    FROM   Transactions t
    JOIN   Users u ON t.UserId = u.Id
    LEFT JOIN Customers c ON t.CustomerId = c.Id
    WHERE  t.TransactionDate >= @StartDate AND t.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate))
    ORDER  BY t.TransactionDate DESC;
END
GO
