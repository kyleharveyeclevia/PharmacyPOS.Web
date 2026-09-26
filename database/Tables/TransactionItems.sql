SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[TransactionItems](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[TransactionId] [int] NOT NULL,
	[ProductId] [int] NOT NULL,
    [BatchId] [int] NULL,
    [OriginalItemId] [int] NULL,
	[ProductName] [nvarchar](150) NOT NULL,
	[ProductBarcode] [nvarchar](50) NOT NULL,
	[Quantity] [int] NOT NULL,
	[UnitPrice] [decimal](18, 2) NOT NULL,
	[DiscountAmount] [decimal](18, 2) NOT NULL,
	[LineTotal] [decimal](18, 2) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[TransactionItems] ADD  DEFAULT ((1)) FOR [Quantity]
GO

ALTER TABLE [dbo].[TransactionItems] ADD  DEFAULT ((0)) FOR [UnitPrice]
GO

ALTER TABLE [dbo].[TransactionItems] ADD  DEFAULT ((0)) FOR [DiscountAmount]
GO

ALTER TABLE [dbo].[TransactionItems] ADD  DEFAULT ((0)) FOR [LineTotal]
GO

ALTER TABLE [dbo].[TransactionItems]  WITH CHECK ADD FOREIGN KEY([ProductId])
REFERENCES [dbo].[Products] ([Id])
GO

ALTER TABLE [dbo].[TransactionItems]  WITH CHECK ADD FOREIGN KEY([TransactionId])
REFERENCES [dbo].[Transactions] ([Id])
GO

ALTER TABLE dbo.TransactionItems WITH CHECK ADD CONSTRAINT FK_TransactionItems_Batches FOREIGN KEY(BatchId) REFERENCES dbo.InventoryBatches(Id);
GO
ALTER TABLE dbo.TransactionItems WITH CHECK ADD CONSTRAINT FK_TransactionItems_OriginalItem FOREIGN KEY(OriginalItemId) REFERENCES dbo.TransactionItems(Id);
GO
ALTER TABLE dbo.TransactionItems WITH CHECK ADD CONSTRAINT CK_TransactionItems_Values CHECK (Quantity>0 AND UnitPrice>=0 AND DiscountAmount>=0 AND LineTotal>=0);
GO
CREATE INDEX IX_TransactionItems_Transaction ON dbo.TransactionItems(TransactionId,ProductId) INCLUDE(Quantity,LineTotal,BatchId);
GO
