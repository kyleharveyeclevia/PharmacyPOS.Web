CREATE OR ALTER PROCEDURE dbo.sp_ReceiveBatch @ProductId int,@BatchNo nvarchar(50),@ExpiryDate date=NULL,@Quantity int,@UserId int
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @stock int,@batch int;
        SELECT @stock=StockQuantity FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ProductId;
        IF @stock IS NULL OR @Quantity<=0 OR @Quantity IS NULL OR NULLIF(LTRIM(RTRIM(@BatchNo)),'') IS NULL THROW 50001,'Invalid batch or quantity.',1;
        SELECT @batch=Id FROM dbo.InventoryBatches WITH(UPDLOCK,HOLDLOCK) WHERE ProductId=@ProductId AND BatchNo=@BatchNo AND (ExpiryDate=@ExpiryDate OR (ExpiryDate IS NULL AND @ExpiryDate IS NULL));
        IF @batch IS NULL
        BEGIN
            INSERT dbo.InventoryBatches(ProductId,BatchNo,ExpiryDate,StockQuantity) VALUES(@ProductId,@BatchNo,@ExpiryDate,@Quantity);
            SET @batch=CONVERT(int,SCOPE_IDENTITY());
        END
        ELSE UPDATE dbo.InventoryBatches SET StockQuantity=StockQuantity+@Quantity WHERE Id=@batch;
        UPDATE dbo.Products SET StockQuantity=StockQuantity+@Quantity,UpdatedAt=GETDATE() WHERE Id=@ProductId;
        INSERT dbo.StockAdjustments(ProductId,UserId,Adjustment,Reason) VALUES(@ProductId,@UserId,@Quantity,CONCAT('Receive batch ',@BatchNo));
        COMMIT; SELECT @batch AS Result,'Batch received.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT -1 AS Result,ERROR_MESSAGE() AS Message;
    END CATCH;
END;
GO
