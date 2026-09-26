SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Transactions](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ReceiptNumber] [nvarchar](50) NOT NULL,
	[SessionId] [int] NOT NULL,
	[UserId] [int] NOT NULL,
	[CustomerId] [int] NULL,
	[TransactionDate] [datetime2](7) NOT NULL,
	[TransactionType] [nvarchar](20) NOT NULL,
	[SubTotal] [decimal](18, 2) NOT NULL,
	[DiscountAmount] [decimal](18, 2) NOT NULL,
	[DiscountPercent] [decimal](5, 2) NOT NULL,
	[VatAmount] [decimal](18, 2) NOT NULL,
	[VatPercent] [decimal](5, 2) NOT NULL,
	[TotalAmount] [decimal](18, 2) NOT NULL,
	[AmountTendered] [decimal](18, 2) NOT NULL,
	[Change] [decimal](18, 2) NOT NULL,
	[PaymentMethod] [nvarchar](20) NOT NULL,
	[PrescriptionNumber] [nvarchar](50) NULL,
	[Notes] [nvarchar](500) NULL,
	[IsVoided] [bit] NOT NULL,
	[VoidReason] [nvarchar](255) NULL,
	[RelatedTransactionId] [int] NULL,
	[TerminalId] [int] NULL,
	[VatExemptAmount] [money] NULL,
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Transactions] ADD UNIQUE NONCLUSTERED
(
	[ReceiptNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT (getdate()) FOR [TransactionDate]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ('Sale') FOR [TransactionType]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [SubTotal]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [DiscountAmount]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [DiscountPercent]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [VatAmount]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((12)) FOR [VatPercent]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [TotalAmount]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [AmountTendered]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [Change]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ('Cash') FOR [PaymentMethod]
GO

ALTER TABLE [dbo].[Transactions] ADD  DEFAULT ((0)) FOR [IsVoided]
GO

ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD FOREIGN KEY([CustomerId])
REFERENCES [dbo].[Customers] ([Id])
GO

ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD FOREIGN KEY([RelatedTransactionId])
REFERENCES [dbo].[Transactions] ([Id])
GO

ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD FOREIGN KEY([SessionId])
REFERENCES [dbo].[Sessions] ([Id])
GO

ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([Id])
GO

ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD CHECK  (([PaymentMethod]='HMO' OR [PaymentMethod]='PhilHealth' OR [PaymentMethod]='GCash' OR [PaymentMethod]='Card' OR [PaymentMethod]='Cash'))
GO

ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD CHECK  (([TransactionType]='Void' OR [TransactionType]='Return' OR [TransactionType]='Sale'))
GO

ALTER TABLE dbo.Transactions WITH CHECK ADD CONSTRAINT FK_Transactions_Terminals FOREIGN KEY(TerminalId) REFERENCES dbo.Terminals(Id);
GO
CREATE INDEX IX_Transactions_DateType ON dbo.Transactions(TransactionDate,TransactionType,IsVoided) INCLUDE(TotalAmount,SessionId);
GO
CREATE INDEX IX_Transactions_Related ON dbo.Transactions(RelatedTransactionId,IsVoided);
GO
