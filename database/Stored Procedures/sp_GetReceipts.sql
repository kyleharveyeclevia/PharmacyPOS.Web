SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE dbo.sp_GetReceipts
    @StartDate date=NULL,
    @EndDate date=NULL,
    @Search nvarchar(200)=NULL,
    @Status nvarchar(10)=NULL,
    @PageNumber int=1,
    @PageSize int=25
AS
BEGIN
    SET NOCOUNT ON;
    IF @PageNumber<1 OR @PageSize<1 OR @PageSize>100 THROW 50001,'Invalid pagination parameters.',1;
    IF @StartDate>@EndDate OR @EndDate='99991231' THROW 50001,'Invalid date range.',1;
    IF NULLIF(@Status,'') IS NOT NULL AND @Status NOT IN ('Sale','Return','Voided') THROW 50001,'Invalid receipt status.',1;
    DECLARE @Pattern nvarchar(410)=N'%'+REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(@Search,N''),N'~',N'~~'),N'%',N'~%'),N'_',N'~_'),N'[',N'~[')+N'%';
    SELECT t.Id,t.ReceiptNumber,t.SessionId,t.UserId,u.FullName AS CashierName,t.CustomerId,c.Name AS CustomerName,
           t.TransactionDate,t.TransactionType,t.SubTotal,t.DiscountAmount,t.VatAmount,t.TotalAmount,t.AmountTendered,t.[Change],
           t.PaymentMethod,t.IsVoided,t.VoidReason
    INTO #Receipts
    FROM dbo.Transactions t
    JOIN dbo.Users u ON u.Id=t.UserId
    LEFT JOIN dbo.Customers c ON c.Id=t.CustomerId
    WHERE (@StartDate IS NULL OR t.TransactionDate>=@StartDate)
      AND (@EndDate IS NULL OR t.TransactionDate<DATEADD(day,1,CONVERT(datetime2,@EndDate)))
      AND (NULLIF(@Search,N'') IS NULL OR t.ReceiptNumber LIKE @Pattern ESCAPE N'~' OR u.FullName LIKE @Pattern ESCAPE N'~' OR c.Name LIKE @Pattern ESCAPE N'~')
      AND (NULLIF(@Status,'') IS NULL OR (@Status='Voided' AND t.IsVoided=1) OR (@Status IN ('Sale','Return') AND t.IsVoided=0 AND t.TransactionType=@Status));
    SELECT COUNT(*) FROM #Receipts;
    SELECT * FROM #Receipts ORDER BY TransactionDate DESC,Id DESC
    OFFSET (CONVERT(bigint,@PageNumber)-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO
