SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Sessions](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[LoginTime] [datetime2](7) NOT NULL,
	[LogoutTime] [datetime2](7) NULL,
	[OpeningCash] [decimal](18, 2) NOT NULL,
	[ClosingCash] [decimal](18, 2) NOT NULL,
	[OpeningNote] [nvarchar](255) NULL,
	[Terminal] [nvarchar](50) NOT NULL,
	[IsClosed] [bit] NOT NULL,
	[TerminalId] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Sessions] ADD  DEFAULT (getdate()) FOR [LoginTime]
GO

ALTER TABLE [dbo].[Sessions] ADD  DEFAULT ((0)) FOR [OpeningCash]
GO

ALTER TABLE [dbo].[Sessions] ADD  DEFAULT ((0)) FOR [ClosingCash]
GO

ALTER TABLE [dbo].[Sessions] ADD  DEFAULT ('POS-1') FOR [Terminal]
GO

ALTER TABLE [dbo].[Sessions] ADD  DEFAULT ((0)) FOR [IsClosed]
GO



ALTER TABLE [dbo].[Sessions]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([Id])
GO

ALTER TABLE dbo.Sessions WITH CHECK ADD CONSTRAINT FK_Sessions_Terminals FOREIGN KEY(TerminalId) REFERENCES dbo.Terminals(Id);
GO
CREATE UNIQUE INDEX UX_Sessions_OpenUser ON dbo.Sessions(UserId) WHERE IsClosed=0;
GO
