SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetSessionsByDate]
    @Date DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        s.Id, s.UserId, u.FullName AS CashierName,
        s.LoginTime, s.LogoutTime,
        s.OpeningCash, s.ClosingCash,
        s.Terminal, s.IsClosed,
        (SELECT COUNT(*)
         FROM Transactions t
         WHERE t.SessionId = s.Id
           AND t.TransactionType = 'Sale'
           AND t.IsVoided = 0) AS TxCount,
        ISNULL((SELECT SUM(t2.TotalAmount)
                FROM Transactions t2
                WHERE t2.SessionId = s.Id
                  AND t2.TransactionType = 'Sale'
                  AND t2.IsVoided = 0), 0) AS NetSales
    FROM   Sessions s
    JOIN   Users u ON s.UserId = u.Id
    WHERE  CAST(s.LoginTime AS DATE) = @Date
    ORDER  BY s.LoginTime DESC;
END
GO
