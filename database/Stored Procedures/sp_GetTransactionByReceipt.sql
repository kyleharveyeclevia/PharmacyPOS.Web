SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetTransactionByReceipt]
    @ReceiptNumber NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @TxId INT = (SELECT Id FROM Transactions WHERE ReceiptNumber = @ReceiptNumber);

    SELECT
        t.Id, t.ReceiptNumber, t.SessionId,
        t.UserId, u.FullName AS CashierName,
        t.CustomerId, c.Name AS CustomerName,
        t.TransactionDate, t.TransactionType,
        t.SubTotal, t.DiscountAmount, t.DiscountPercent,
        t.VatAmount, t.VatPercent,
        t.TotalAmount, t.AmountTendered, t.[Change],
        t.PaymentMethod, t.PrescriptionNumber,
        t.Notes, t.IsVoided, t.VoidReason
    FROM   Transactions t
    JOIN   Users u ON t.UserId = u.Id
    LEFT JOIN Customers c ON t.CustomerId = c.Id
    WHERE  t.Id = @TxId;

    SELECT
        ti.Id, ti.TransactionId, ti.ProductId,
        ti.ProductName, ti.ProductBarcode,
        ti.Quantity, ti.UnitPrice, ti.DiscountAmount, ti.LineTotal
    FROM   TransactionItems ti
    WHERE  ti.TransactionId = @TxId;
END
GO
