USE [RxPharmacyDB]
GO
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
            WHEN P.StockQuantity <= 10 THEN 'LOW STOCK'
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
        CAST(A.TransactionDate AS DATE) BETWEEN @StartDate AND @EndDate
        AND ISNULL(A.IsVoided, 0) = 0

    GROUP BY
        B.ProductId,
        P.Name,
        P.StockQuantity

    ORDER BY
        QuantitySold DESC;
END
