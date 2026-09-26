CREATE OR ALTER PROCEDURE dbo.sp_ProcessSale
    @ReceiptNumber nvarchar(50), @SessionId int, @UserId int, @CustomerId int=NULL,
    @SubTotal decimal(18,2), @DiscountAmount decimal(18,2), @DiscountPercent decimal(5,2),
    @VatAmount decimal(18,2), @TotalAmount decimal(18,2), @AmountTendered decimal(18,2),
    @Change decimal(18,2), @PaymentMethod nvarchar(20), @PrescriptionNumber nvarchar(50)=NULL,
    @Notes nvarchar(500)=NULL, @ItemsJson nvarchar(max), @TerminalId int,
    @VatExemptAmount money, @IsScPwd bit=0
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF ISJSON(@ItemsJson)<>1 OR LEFT(LTRIM(@ItemsJson),1)<>'[' THROW 50001,'Cart must be a JSON array.',1;
        DECLARE @Raw TABLE(ProductId int,Quantity int,UnitPrice decimal(18,2));
        INSERT @Raw SELECT ProductId,Quantity,UnitPrice FROM OPENJSON(@ItemsJson) WITH(ProductId int '$.ProductId',Quantity int '$.Quantity',UnitPrice decimal(18,2) '$.UnitPrice');
        IF NOT EXISTS(SELECT 1 FROM @Raw) OR EXISTS(SELECT 1 FROM @Raw WHERE ProductId IS NULL OR Quantity IS NULL OR Quantity<=0 OR UnitPrice IS NULL OR UnitPrice<0) THROW 50001,'Cart contains invalid products, quantities or prices.',1;
        IF EXISTS(SELECT ProductId FROM @Raw GROUP BY ProductId HAVING MIN(UnitPrice)<>MAX(UnitPrice) OR SUM(CONVERT(bigint,Quantity))>2147483647) THROW 50001,'Duplicate product prices or quantities are invalid.',1;
        DECLARE @Cart TABLE(ProductId int PRIMARY KEY,Quantity int NOT NULL,UnitPrice decimal(18,2) NOT NULL);
        INSERT @Cart SELECT ProductId,SUM(Quantity),MIN(UnitPrice) FROM @Raw GROUP BY ProductId;
        IF NOT EXISTS(SELECT 1 FROM dbo.Sessions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@SessionId AND UserId=@UserId AND IsClosed=0 AND TerminalId=@TerminalId) THROW 50001,'Invalid or closed cashier session.',1;
        IF NOT EXISTS(SELECT 1 FROM dbo.Terminals WHERE Id=@TerminalId AND IsActive=1) THROW 50001,'Invalid terminal.',1;
        DECLARE @locked int;
        SELECT @locked=COUNT(*) FROM dbo.Products p WITH(UPDLOCK,HOLDLOCK) JOIN @Cart c ON c.ProductId=p.Id;
        IF @locked<>(SELECT COUNT(*) FROM @Cart) THROW 50001,'Cart contains an unknown product.',1;
        IF EXISTS(SELECT 1 FROM dbo.Products p JOIN @Cart c ON c.ProductId=p.Id WHERE p.IsActive=0 OR p.StockQuantity<c.Quantity) THROW 50001,'Product inactive or insufficient stock.',1;
        IF EXISTS(SELECT 1 FROM dbo.Products p JOIN @Cart c ON c.ProductId=p.Id WHERE c.UnitPrice<>p.SellingPrice) THROW 50001,'Price changed; refresh the cart.',1;
        IF EXISTS(SELECT 1 FROM dbo.Products p JOIN @Cart c ON c.ProductId=p.Id WHERE p.RequiresPrescription=1) AND NULLIF(LTRIM(RTRIM(@PrescriptionNumber)),'') IS NULL THROW 50001,'Prescription number is required.',1;
        IF @DiscountPercent IS NULL OR @DiscountPercent<0 OR @DiscountPercent>100 OR @AmountTendered IS NULL OR @AmountTendered<0 OR @PaymentMethod NOT IN('Cash','Card','GCash','PhilHealth','HMO') OR @PaymentMethod IS NULL OR NULLIF(LTRIM(RTRIM(@ReceiptNumber)),'') IS NULL THROW 50001,'Invalid payment or discount.',1;
        DECLARE @actualSub decimal(18,2),@actualDiscount decimal(18,2),@actualVat decimal(18,2),@actualTotal decimal(18,2),@exempt decimal(18,2)=0;
        SELECT @actualSub=SUM(Quantity*UnitPrice) FROM @Cart;
        IF @IsScPwd=1
        BEGIN
            IF NOT EXISTS(SELECT 1 FROM dbo.Customers WHERE Id=@CustomerId AND (IsSeniorCitizen=1 OR IsPWD=1)) THROW 50001,'Select an eligible customer for this discount.',1;
            SET @exempt=ROUND(@actualSub/1.12,2);
            SET @actualDiscount=ROUND(@exempt*0.20,2); SET @actualVat=0; SET @actualTotal=@exempt-@actualDiscount;
        END
        ELSE
        BEGIN
            SET @actualDiscount=ROUND(@actualSub*@DiscountPercent/100,2);
            SET @actualTotal=@actualSub-@actualDiscount; SET @actualVat=ROUND(@actualTotal/1.12*0.12,2);
        END;
        IF @SubTotal IS NULL OR @DiscountAmount IS NULL OR @VatAmount IS NULL OR @TotalAmount IS NULL OR @Change IS NULL OR @SubTotal<>@actualSub OR @DiscountAmount<>@actualDiscount OR @VatAmount<>@actualVat OR @TotalAmount<>@actualTotal OR @Change<>@AmountTendered-@actualTotal OR @AmountTendered<@actualTotal THROW 50001,'Receipt totals do not match cart and payment.',1;
        SELECT @locked=COUNT(*) FROM dbo.InventoryBatches b WITH(UPDLOCK,HOLDLOCK) JOIN @Cart c ON c.ProductId=b.ProductId;
        DECLARE @Allocation TABLE(BatchId int PRIMARY KEY,ProductId int,Quantity int,UnitPrice decimal(18,2));
        ;WITH Available AS (
            SELECT b.Id,b.ProductId,b.StockQuantity,c.Quantity,c.UnitPrice,
                COALESCE(SUM(CONVERT(bigint,b.StockQuantity)) OVER(PARTITION BY b.ProductId ORDER BY CASE WHEN b.ExpiryDate IS NULL THEN 1 ELSE 0 END,b.ExpiryDate,b.Id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS PreviousStock
            FROM dbo.InventoryBatches b JOIN @Cart c ON c.ProductId=b.ProductId
            WHERE b.StockQuantity>0 AND (b.ExpiryDate IS NULL OR b.ExpiryDate>=CONVERT(date,GETDATE()))
        )
        INSERT @Allocation SELECT Id,ProductId,CASE WHEN Quantity-PreviousStock<StockQuantity THEN Quantity-PreviousStock ELSE StockQuantity END,UnitPrice FROM Available WHERE Quantity>PreviousStock;
        IF EXISTS(SELECT 1 FROM @Cart c WHERE c.Quantity<>COALESCE((SELECT SUM(a.Quantity) FROM @Allocation a WHERE a.ProductId=c.ProductId),0)) THROW 50001,'Insufficient unexpired batch stock.',1;
        INSERT dbo.Transactions(ReceiptNumber,SessionId,UserId,CustomerId,TransactionType,SubTotal,DiscountAmount,DiscountPercent,VatAmount,VatPercent,TotalAmount,AmountTendered,[Change],PaymentMethod,PrescriptionNumber,Notes,TerminalId,VatExemptAmount)
        VALUES(@ReceiptNumber,@SessionId,@UserId,@CustomerId,'Sale',@actualSub,@actualDiscount,@DiscountPercent,@actualVat,CASE WHEN @IsScPwd=1 THEN 0 ELSE 12 END,@actualTotal,@AmountTendered,@Change,@PaymentMethod,@PrescriptionNumber,@Notes,@TerminalId,@exempt);
        DECLARE @tx int=CONVERT(int,SCOPE_IDENTITY());
        INSERT dbo.TransactionItems(TransactionId,ProductId,BatchId,ProductName,ProductBarcode,Quantity,UnitPrice,DiscountAmount,LineTotal)
        SELECT @tx,p.Id,a.BatchId,p.Name,p.Barcode,a.Quantity,a.UnitPrice,0,a.Quantity*a.UnitPrice FROM @Allocation a JOIN dbo.Products p ON p.Id=a.ProductId;
        UPDATE b SET StockQuantity=b.StockQuantity-a.Quantity FROM dbo.InventoryBatches b JOIN @Allocation a ON a.BatchId=b.Id;
        UPDATE p SET StockQuantity=p.StockQuantity-c.Quantity,UpdatedAt=GETDATE() FROM dbo.Products p JOIN @Cart c ON c.ProductId=p.Id;
        COMMIT; SELECT @tx AS TransactionId,'Sale processed successfully.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT -1 AS TransactionId,ERROR_MESSAGE() AS Message;
    END CATCH;
END;
GO
