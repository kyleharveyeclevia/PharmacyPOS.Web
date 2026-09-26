SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_AddProduct]
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
    @StockQuantity        INT,
    @ReorderLevel         INT,
    @RequiresPrescription BIT,
    @ExpiryDate           DATE = NULL,
    @BatchNo              NVARCHAR(50)

AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRANSACTION;
    IF EXISTS (SELECT 1 FROM Products WHERE Barcode = @Barcode)
    BEGIN
        ROLLBACK; SELECT -1 AS Result, 'Barcode already exists.' AS Message;
        RETURN;
    END
    INSERT INTO Products
        (Barcode, Name, BrandName, GenericName, Description, DosageStrength, Unit,
         CategoryId, SupplierId, CostPrice, SellingPrice,
         StockQuantity, ReorderLevel, RequiresPrescription,
         IsActive, ExpiryDate, CreatedAt, UpdatedAt, BatchNo)
    VALUES
        (@Barcode, @Name, @BrandName, @GenericName, @Description, @DosageStrength, @Unit,
         @CategoryId, @SupplierId, @CostPrice, @SellingPrice,
         @StockQuantity, @ReorderLevel, @RequiresPrescription,
         1, @ExpiryDate, GETDATE(), GETDATE(), @BatchNo);
    DECLARE @product int=CONVERT(int,SCOPE_IDENTITY());
    INSERT dbo.InventoryBatches(ProductId,BatchNo,ExpiryDate,StockQuantity) VALUES(@product,COALESCE(NULLIF(@BatchNo,''),'LEGACY'),@ExpiryDate,@StockQuantity);
    COMMIT; SELECT @product AS Result, 'Product added.' AS Message;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT -1 AS Result,ERROR_MESSAGE() AS Message; END CATCH;
END
GO
