SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateProduct]
    @Id                   INT,
    @Barcode              NVARCHAR(50),
    @Name                 NVARCHAR(150),
    @BrandName            NVARCHAR(50),
    @GenericName          NVARCHAR(150),
    @Description          NVARCHAR(500),
    @DosageStrength       NVARCHAR(50),
    @Unit                 NVARCHAR(20),
    @CategoryId           INT,
    @SupplierId           INT = NULL,
    @CostPrice            DECIMAL(18,2),
    @SellingPrice         DECIMAL(18,2),
    @ReorderLevel         INT,
    @RequiresPrescription BIT,
    @IsActive             BIT,
    @ExpiryDate           DATE = NULL,
    @BatchNo              NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @locked int; SELECT @locked=Id FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id;
    IF @locked IS NULL THROW 50001,'Product not found.',1;
    IF (SELECT COUNT(*) FROM dbo.InventoryBatches WHERE ProductId=@Id)>1 AND EXISTS(SELECT 1 FROM dbo.Products WHERE Id=@Id AND (COALESCE(BatchNo,'')<>COALESCE(@BatchNo,'') OR COALESCE(ExpiryDate,'99991231')<>COALESCE(@ExpiryDate,'99991231'))) THROW 50001,'Edit individual batches rather than overwriting a multi-batch product.',1;
    IF EXISTS (SELECT 1 FROM Products WHERE Barcode = @Barcode AND Id <> @Id)
    BEGIN
        ROLLBACK; SELECT -1 AS Result, 'Barcode already used by another product.' AS Message;
        RETURN;
    END
    UPDATE Products
    SET    Barcode = @Barcode, Name = @Name, GenericName = @GenericName,
           Description = @Description, Unit = @Unit,
           CategoryId = @CategoryId, SupplierId = @SupplierId,
           CostPrice = @CostPrice, SellingPrice = @SellingPrice,
           ReorderLevel = @ReorderLevel,
           RequiresPrescription = @RequiresPrescription,
           IsActive = @IsActive, ExpiryDate = @ExpiryDate,
           DosageStrength = @DosageStrength, BrandName = @BrandName,
           UpdatedAt = GETDATE(), BatchNo = @BatchNo
    WHERE  Id = @Id;
    IF (SELECT COUNT(*) FROM dbo.InventoryBatches WHERE ProductId=@Id)=1 UPDATE dbo.InventoryBatches SET BatchNo=COALESCE(NULLIF(@BatchNo,''),'LEGACY'),ExpiryDate=@ExpiryDate WHERE ProductId=@Id;
    COMMIT; SELECT 1 AS Result, 'Product updated.' AS Message;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT -1 AS Result,ERROR_MESSAGE() AS Message; END CATCH;
END
GO
