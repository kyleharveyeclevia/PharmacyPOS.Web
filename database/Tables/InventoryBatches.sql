CREATE TABLE dbo.InventoryBatches (
    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_InventoryBatches PRIMARY KEY,
    ProductId int NOT NULL,
    BatchNo nvarchar(50) NOT NULL,
    ExpiryDate date NULL,
    StockQuantity int NOT NULL CONSTRAINT DF_InventoryBatches_Stock DEFAULT(0),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_InventoryBatches_Created DEFAULT(SYSUTCDATETIME())
);
GO
ALTER TABLE dbo.InventoryBatches WITH CHECK ADD CONSTRAINT FK_InventoryBatches_Products FOREIGN KEY(ProductId) REFERENCES dbo.Products(Id);
GO
ALTER TABLE dbo.InventoryBatches WITH CHECK ADD CONSTRAINT CK_InventoryBatches_Stock CHECK(StockQuantity>=0);
GO
CREATE INDEX IX_InventoryBatches_Product ON dbo.InventoryBatches(ProductId,ExpiryDate,Id) INCLUDE(StockQuantity);
GO
