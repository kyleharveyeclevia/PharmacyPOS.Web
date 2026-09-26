SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetFastMovingItemsByDateRange]
    @StartDate DATE,
    @EndDate   DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        B.ProductId,
        P.Name as ProductName,

        SUM(B.Quantity) AS QuantitySold,
        SUM(B.LineTotal) AS TotalSales,

        CASE
            WHEN SUM(B.Quantity) > 0
            THEN SUM(B.LineTotal) / SUM(B.Quantity)
            ELSE 0
        END AS AverageSellingPrice,

        ISNULL(P.StockQuantity,0) AS StockQuantity,

        CASE
            WHEN P.StockQuantity <= 0 THEN 'OUT OF STOCK'
            WHEN P.StockQuantity <= P.ReorderLevel THEN 'LOW STOCK'
            ELSE 'OK'
        END AS StockStatus,

        ROW_NUMBER() OVER (
            ORDER BY SUM(B.Quantity) DESC
        ) AS [Rank]

    FROM Transactions A
    INNER JOIN TransactionItems B
        ON A.Id = B.TransactionId

    INNER JOIN Products P
        ON P.Id = B.ProductId

    WHERE
        A.TransactionDate >= @StartDate AND A.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate))
        AND A.IsVoided = 0 AND A.TransactionType = 'Sale'

    GROUP BY
        B.ProductId,
        P.Name,
        P.StockQuantity, P.ReorderLevel

    ORDER BY
        QuantitySold DESC;
END
GO
