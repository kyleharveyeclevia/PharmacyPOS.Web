CREATE OR ALTER PROCEDURE dbo.sp_ProcessReturn
    @OriginalTransactionId int,@ReceiptNumber nvarchar(50),@SessionId int,@UserId int,@Reason nvarchar(255),@ItemsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @terminal int;
        SELECT @terminal=TerminalId FROM dbo.Sessions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@SessionId AND UserId=@UserId AND IsClosed=0;
        IF @terminal IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.Terminals WHERE Id=@terminal AND IsActive=1) THROW 50001,'Invalid or closed cashier session.',1;
        DECLARE @originalTotal decimal(18,2),@originalSub decimal(18,2),@customer int;
        SELECT @originalTotal=TotalAmount,@originalSub=SubTotal,@customer=CustomerId FROM dbo.Transactions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@OriginalTransactionId AND TransactionType='Sale' AND IsVoided=0;
        IF @originalTotal IS NULL THROW 50001,'Original sale not found or voided.',1;
        IF NULLIF(LTRIM(RTRIM(@Reason)),'') IS NULL THROW 50001,'Return reason is required.',1;
        IF ISJSON(@ItemsJson)<>1 OR LEFT(LTRIM(@ItemsJson),1)<>'[' THROW 50001,'Return items must be a JSON array.',1;
        DECLARE @Raw TABLE(ProductId int,Quantity int);
        INSERT @Raw SELECT ProductId,Quantity FROM OPENJSON(@ItemsJson) WITH(ProductId int '$.ProductId',Quantity int '$.Quantity');
        IF NOT EXISTS(SELECT 1 FROM @Raw) OR EXISTS(SELECT 1 FROM @Raw WHERE ProductId IS NULL OR Quantity IS NULL OR Quantity<=0) THROW 50001,'Invalid return quantities.',1;
        DECLARE @Requested TABLE(ProductId int PRIMARY KEY,Quantity int);
        INSERT @Requested SELECT ProductId,SUM(Quantity) FROM @Raw GROUP BY ProductId;
        DECLARE @locked int;
        SELECT @locked=COUNT(*) FROM dbo.Products p WITH(UPDLOCK,HOLDLOCK) JOIN @Requested r ON r.ProductId=p.Id;
        IF EXISTS(SELECT 1 FROM @Requested r WHERE r.Quantity>COALESCE((SELECT SUM(ti.Quantity) FROM dbo.TransactionItems ti WHERE ti.TransactionId=@OriginalTransactionId AND ti.ProductId=r.ProductId),0)-COALESCE((SELECT SUM(ti.Quantity) FROM dbo.TransactionItems ti JOIN dbo.Transactions t ON t.Id=ti.TransactionId WHERE t.RelatedTransactionId=@OriginalTransactionId AND t.TransactionType='Return' AND t.IsVoided=0 AND ti.ProductId=r.ProductId),0)) THROW 50001,'Return exceeds unreturned purchased quantity.',1;
        DECLARE @Allocation TABLE(ItemId int PRIMARY KEY,ProductId int,BatchId int,Quantity int,Price decimal(18,2));
        ;WITH Sold AS (
            SELECT ti.Id,ti.ProductId,ti.BatchId,ti.UnitPrice,r.Quantity AS Requested,
                ti.Quantity-COALESCE((SELECT SUM(rt.Quantity) FROM dbo.TransactionItems rt JOIN dbo.Transactions t ON t.Id=rt.TransactionId WHERE rt.OriginalItemId=ti.Id AND t.TransactionType='Return' AND t.IsVoided=0),0) AS Remaining,
                COALESCE((SELECT SUM(rt.Quantity) FROM dbo.TransactionItems rt JOIN dbo.Transactions t ON t.Id=rt.TransactionId WHERE t.RelatedTransactionId=@OriginalTransactionId AND t.TransactionType='Return' AND t.IsVoided=0 AND rt.ProductId=ti.ProductId AND rt.OriginalItemId IS NULL),0) AS LegacyReturned
            FROM dbo.TransactionItems ti JOIN @Requested r ON r.ProductId=ti.ProductId WHERE ti.TransactionId=@OriginalTransactionId
        ), LegacyOffset AS (
            SELECT *,COALESCE(SUM(CONVERT(bigint,Remaining)) OVER(PARTITION BY ProductId ORDER BY Id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS PriorRemaining FROM Sold
        ), Eligible AS (
            SELECT *,CASE WHEN LegacyReturned>=PriorRemaining+Remaining THEN 0 WHEN LegacyReturned>PriorRemaining THEN Remaining-(LegacyReturned-PriorRemaining) ELSE Remaining END AS Available FROM LegacyOffset
        ), Bounds AS (
            SELECT *,COALESCE(SUM(CONVERT(bigint,Available)) OVER(PARTITION BY ProductId ORDER BY Id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS PriorAvailable FROM Eligible
        )
        INSERT @Allocation SELECT Id,ProductId,COALESCE(BatchId,(SELECT MIN(b.Id) FROM dbo.InventoryBatches b WHERE b.ProductId=Bounds.ProductId)),CASE WHEN Requested-PriorAvailable<Available THEN Requested-PriorAvailable ELSE Available END,UnitPrice FROM Bounds WHERE Requested>PriorAvailable AND Available>0;
        IF EXISTS(SELECT 1 FROM @Allocation WHERE BatchId IS NULL) THROW 50001,'Missing inventory batch; reconcile legacy stock first.',1;
        DECLARE @refund decimal(18,2),@previousRefund decimal(18,2);
        SELECT @refund=COALESCE(ROUND(SUM(Quantity*Price)*@originalTotal/NULLIF(@originalSub,0),2),0) FROM @Allocation;
        SELECT @previousRefund=COALESCE(SUM(TotalAmount),0) FROM dbo.Transactions WHERE RelatedTransactionId=@OriginalTransactionId AND TransactionType='Return' AND IsVoided=0;
        IF (SELECT SUM(Quantity) FROM @Requested)+(SELECT COALESCE(SUM(ti.Quantity),0) FROM dbo.TransactionItems ti JOIN dbo.Transactions t ON t.Id=ti.TransactionId WHERE t.RelatedTransactionId=@OriginalTransactionId AND t.TransactionType='Return' AND t.IsVoided=0)=(SELECT SUM(Quantity) FROM dbo.TransactionItems WHERE TransactionId=@OriginalTransactionId) SET @refund=@originalTotal-@previousRefund;
        IF @refund<0 OR @refund+@previousRefund>@originalTotal THROW 50001,'Refund exceeds original paid amount.',1;
        INSERT dbo.Transactions(ReceiptNumber,SessionId,UserId,CustomerId,TransactionType,SubTotal,TotalAmount,PaymentMethod,RelatedTransactionId,Notes,TerminalId,VatPercent)
        VALUES(@ReceiptNumber,@SessionId,@UserId,@customer,'Return',@refund,@refund,'Cash',@OriginalTransactionId,@Reason,@terminal,0);
        DECLARE @tx int=CONVERT(int,SCOPE_IDENTITY());
        INSERT dbo.TransactionItems(TransactionId,ProductId,BatchId,OriginalItemId,ProductName,ProductBarcode,Quantity,UnitPrice,LineTotal)
        SELECT @tx,ti.ProductId,a.BatchId,a.ItemId,ti.ProductName,ti.ProductBarcode,a.Quantity,COALESCE(ROUND(a.Price*@originalTotal/NULLIF(@originalSub,0),2),0),COALESCE(ROUND(a.Quantity*a.Price*@originalTotal/NULLIF(@originalSub,0),2),0) FROM @Allocation a JOIN dbo.TransactionItems ti ON ti.Id=a.ItemId;
        DECLARE @last int=(SELECT MAX(Id) FROM dbo.TransactionItems WHERE TransactionId=@tx);
        UPDATE dbo.TransactionItems SET LineTotal=LineTotal+@refund-(SELECT SUM(LineTotal) FROM dbo.TransactionItems WHERE TransactionId=@tx) WHERE Id=@last;
        UPDATE b SET StockQuantity=b.StockQuantity+a.Qty FROM dbo.InventoryBatches b JOIN(SELECT BatchId,SUM(Quantity) AS Qty FROM @Allocation GROUP BY BatchId)a ON a.BatchId=b.Id;
        UPDATE p SET StockQuantity=p.StockQuantity+r.Quantity,UpdatedAt=GETDATE() FROM dbo.Products p JOIN @Requested r ON r.ProductId=p.Id;
        COMMIT; SELECT @tx AS TransactionId,'Return processed.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT -1 AS TransactionId,ERROR_MESSAGE() AS Message;
    END CATCH;
END;
GO
