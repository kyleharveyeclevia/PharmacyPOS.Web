USE [RxPharmacyDB]
GO
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
            CAST(A.TransactionDate AS DATE) BETWEEN @StartDate AND @EndDate
            AND ISNULL(A.IsVoided, 0) = 0
    ) AS T ON P.Id = T.ProductId

    GROUP BY
        P.Id,
        P.Name,
        P.StockQuantity

    ORDER BY
        QuantitySold ASC;
END
