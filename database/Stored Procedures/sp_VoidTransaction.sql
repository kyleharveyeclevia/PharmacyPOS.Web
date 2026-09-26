CREATE OR ALTER PROCEDURE dbo.sp_VoidTransaction @TransactionId int,@Reason nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @type nvarchar(20),@original int,@session int,@locked int;
        SELECT @session=SessionId,@original=RelatedTransactionId FROM dbo.Transactions WHERE Id=@TransactionId;
        SELECT @locked=COUNT(*) FROM dbo.Sessions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@session;
        IF @original IS NOT NULL SELECT @locked=COUNT(*) FROM dbo.Transactions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@original;
        SELECT @type=TransactionType FROM dbo.Transactions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@TransactionId AND IsVoided=0;
        IF @type IS NULL OR @type NOT IN('Sale','Return') THROW 50001,'Transaction missing or already voided.',1;
        IF NULLIF(LTRIM(RTRIM(@Reason)),'') IS NULL THROW 50001,'Void reason is required.',1;
        IF @type='Sale' AND EXISTS(SELECT 1 FROM dbo.Transactions WHERE RelatedTransactionId=@TransactionId AND TransactionType='Return' AND IsVoided=0) THROW 50001,'Void associated returns before voiding this sale.',1;
        DECLARE @delta int=CASE WHEN @type='Sale' THEN 1 ELSE -1 END;
        DECLARE @Items TABLE(ProductId int PRIMARY KEY,Quantity int);
        INSERT @Items SELECT ProductId,SUM(Quantity) FROM dbo.TransactionItems WHERE TransactionId=@TransactionId GROUP BY ProductId;
        SELECT @locked=COUNT(*) FROM dbo.Products p WITH(UPDLOCK,HOLDLOCK) JOIN @Items i ON i.ProductId=p.Id;
        DECLARE @Batches TABLE(BatchId int PRIMARY KEY,Quantity int);
        INSERT @Batches SELECT BatchId,SUM(Quantity) FROM (SELECT COALESCE(ti.BatchId,(SELECT MIN(b.Id) FROM dbo.InventoryBatches b WHERE b.ProductId=ti.ProductId)) AS BatchId,ti.Quantity FROM dbo.TransactionItems ti WHERE ti.TransactionId=@TransactionId)x GROUP BY BatchId;
        SELECT @locked=COUNT(*) FROM dbo.InventoryBatches b WITH(UPDLOCK,HOLDLOCK) JOIN @Batches a ON a.BatchId=b.Id;
        IF EXISTS(SELECT 1 FROM dbo.InventoryBatches b JOIN @Batches a ON a.BatchId=b.Id WHERE b.StockQuantity+@delta*a.Quantity<0) THROW 50001,'Returned stock has been sold; cannot void this return.',1;
        UPDATE b SET StockQuantity=b.StockQuantity+@delta*a.Quantity FROM dbo.InventoryBatches b JOIN @Batches a ON a.BatchId=b.Id;
        UPDATE p SET StockQuantity=p.StockQuantity+@delta*i.Quantity,UpdatedAt=GETDATE() FROM dbo.Products p JOIN @Items i ON i.ProductId=p.Id;
        UPDATE dbo.Transactions SET IsVoided=1,VoidReason=@Reason WHERE Id=@TransactionId;
        COMMIT; SELECT 1 AS Result,'Transaction voided.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT -1 AS Result,ERROR_MESSAGE() AS Message;
    END CATCH;
END;
GO
