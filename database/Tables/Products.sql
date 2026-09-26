SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Products](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Barcode] [nvarchar](50) NOT NULL,
	[Name] [nvarchar](150) NOT NULL,
	[GenericName] [nvarchar](150) NOT NULL,
	[Description] [nvarchar](500) NOT NULL,
	[Unit] [nvarchar](20) NOT NULL,
	[CategoryId] [int] NOT NULL,
	[SupplierId] [int] NULL,
	[CostPrice] [decimal](18, 2) NOT NULL,
	[SellingPrice] [decimal](18, 2) NOT NULL,
	[StockQuantity] [int] NOT NULL,
	[ReorderLevel] [int] NOT NULL,
	[RequiresPrescription] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[ExpiryDate] [date] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[BrandName] [nvarchar](50) NULL,
	[DosageStrength] [nvarchar](50) NULL,
	[BatchNo] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Products] ADD UNIQUE NONCLUSTERED
(
	[Barcode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ('') FOR [GenericName]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ('') FOR [Description]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ('pcs') FOR [Unit]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ((0)) FOR [CostPrice]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ((0)) FOR [SellingPrice]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ((0)) FOR [StockQuantity]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ((10)) FOR [ReorderLevel]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ((0)) FOR [RequiresPrescription]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT (getdate()) FOR [UpdatedAt]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ('') FOR [BrandName]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ('') FOR [DosageStrength]
GO

ALTER TABLE [dbo].[Products] ADD  DEFAULT ('') FOR [BatchNo]
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD FOREIGN KEY([CategoryId])
REFERENCES [dbo].[Categories] ([Id])
GO

ALTER TABLE [dbo].[Products]  WITH CHECK ADD FOREIGN KEY([SupplierId])
REFERENCES [dbo].[Suppliers] ([Id])
GO

ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT CK_Products_Nonnegative CHECK (StockQuantity>=0 AND ReorderLevel>=0 AND CostPrice>=0 AND SellingPrice>=0);
GO
