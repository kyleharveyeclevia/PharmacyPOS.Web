CREATE OR ALTER PROCEDURE dbo.sp_AdjustStock @ProductId int,@UserId int,@Adjustment int,@Reason nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @stock int,@batch int;
        SELECT @stock=StockQuantity FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ProductId;
        IF @stock IS NULL THROW 50001,'Product not found.',1;
        IF CONVERT(bigint,@stock)+@Adjustment<0 OR CONVERT(bigint,@stock)+@Adjustment>2147483647 THROW 50001,'Invalid resulting stock quantity.',1;
        IF @Adjustment=0 OR NULLIF(LTRIM(RTRIM(@Reason)),'') IS NULL THROW 50001,'Adjustment and reason are required.',1;
        IF @Adjustment>0
        BEGIN
            SELECT TOP(1) @batch=Id FROM dbo.InventoryBatches WITH(UPDLOCK,HOLDLOCK) WHERE ProductId=@ProductId ORDER BY Id;
            IF @batch IS NULL
            BEGIN
                INSERT dbo.InventoryBatches(ProductId,BatchNo,ExpiryDate,StockQuantity) SELECT Id,COALESCE(NULLIF(BatchNo,''),'LEGACY'),ExpiryDate,@Adjustment FROM dbo.Products WHERE Id=@ProductId;
            END
            ELSE UPDATE dbo.InventoryBatches SET StockQuantity=StockQuantity+@Adjustment WHERE Id=@batch;
        END
        ELSE
        BEGIN
            DECLARE @remove bigint=-CONVERT(bigint,@Adjustment);
            ;WITH Allocation AS(SELECT *,COALESCE(SUM(CONVERT(bigint,StockQuantity)) OVER(ORDER BY Id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS Prior FROM dbo.InventoryBatches WITH(UPDLOCK,HOLDLOCK) WHERE ProductId=@ProductId)
            UPDATE Allocation SET StockQuantity=StockQuantity-CASE WHEN @remove-Prior<StockQuantity THEN @remove-Prior ELSE StockQuantity END WHERE @remove>Prior;
        END;
        UPDATE dbo.Products SET StockQuantity=StockQuantity+@Adjustment,UpdatedAt=GETDATE() WHERE Id=@ProductId;
        IF (SELECT SUM(CONVERT(bigint,StockQuantity)) FROM dbo.InventoryBatches WHERE ProductId=@ProductId)<>@stock+@Adjustment THROW 50001,'Batch and product stock disagree; reconcile stock.',1;
        INSERT dbo.StockAdjustments(ProductId,UserId,Adjustment,Reason) VALUES(@ProductId,@UserId,@Adjustment,@Reason);
        COMMIT; SELECT 1 AS Result,'Stock adjusted.' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT -1 AS Result,ERROR_MESSAGE() AS Message;
    END CATCH;
END;
GO
