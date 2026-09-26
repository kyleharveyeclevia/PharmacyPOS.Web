SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetSlowMovingItemsByDateRange]
    @StartDate DATE,
    @EndDate   DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        P.Id AS ProductId,
        P.Name AS ProductName,

        ISNULL(SUM(T.Quantity), 0) AS QuantitySold,
        ISNULL(SUM(T.LineTotal), 0) AS TotalSales,

        CASE
            WHEN ISNULL(SUM(T.Quantity), 0) > 0
            THEN SUM(T.LineTotal) / SUM(T.Quantity)
            ELSE 0
        END AS AverageSellingPrice,

        ISNULL(P.StockQuantity, 0) AS StockQuantity,

        CASE
            WHEN ISNULL(P.StockQuantity, 0) <= 0 THEN 'OUT OF STOCK'
            WHEN ISNULL(P.StockQuantity, 0) <= 10 THEN 'LOW STOCK'
            ELSE 'OK'
        END AS StockStatus,

        ROW_NUMBER() OVER (
            ORDER BY ISNULL(SUM(T.Quantity), 0) ASC
        ) AS [Rank]

    FROM Products P

    --LEFT JOIN TransactionItems B
    --    ON P.Id = B.ProductId

    --LEFT JOIN Transactions A
    --    ON A.Id = B.TransactionId
    --    AND A.TransactionDate >= @StartDate AND A.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate))
    --    AND A.IsVoided = 0 AND A.TransactionType = 'Sale'
    LEFT JOIN
    (
        SELECT
            B.ProductId
            ,B.Quantity
            ,B.LineTotal
        FROM
            Transactions A
            LEFT JOIN TransactionItems B ON A.Id = B.TransactionId
        WHERE
            A.TransactionDate >= @StartDate AND A.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate))
            AND A.IsVoided = 0 AND A.TransactionType = 'Sale'
    ) AS T ON P.Id = T.ProductId

    GROUP BY
        P.Id,
        P.Name,
        P.StockQuantity, P.ReorderLevel

    ORDER BY
        QuantitySold ASC;
END
GO
