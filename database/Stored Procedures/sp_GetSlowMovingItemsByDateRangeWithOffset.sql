SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetSlowMovingItemsByDateRangeWithOffset]
    @StartDate DATE,
    @EndDate DATE,
    @PageNumber INT = 1,
    @PageSize INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @PageNumber < 1 OR @PageSize < 1 OR @PageSize > 1000 THROW 50001, 'Invalid pagination parameters.', 1;

    ;WITH SlowMoving AS
    (
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
            ) AS [Rank],

            COUNT(*) OVER() AS TotalRecords

        FROM Products P

        LEFT JOIN
        (
            SELECT
                B.ProductId,
                B.Quantity,
                B.LineTotal
            FROM Transactions A
            INNER JOIN TransactionItems B
                ON A.Id = B.TransactionId
            WHERE
                A.TransactionDate >= @StartDate AND A.TransactionDate < DATEADD(DAY,1,CONVERT(datetime2,@EndDate))
                AND A.IsVoided = 0 AND A.TransactionType = 'Sale'
        ) T ON P.Id = T.ProductId

        GROUP BY
            P.Id,
            P.Name,
            P.StockQuantity, P.ReorderLevel
    )

    SELECT
        ProductId,
        ProductName,
        QuantitySold,
        TotalSales,
        AverageSellingPrice,
        StockQuantity,
        StockStatus,
        [Rank],
        TotalRecords
    FROM SlowMoving
    ORDER BY Rank ASC, QuantitySold ASC, ProductName
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO
