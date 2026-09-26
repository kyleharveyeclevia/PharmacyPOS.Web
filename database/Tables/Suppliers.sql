SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Suppliers](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Contact] [nvarchar](100) NOT NULL,
	[Phone] [nvarchar](30) NOT NULL,
	[Email] [nvarchar](100) NOT NULL,
	[Address] [nvarchar](255) NOT NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT ('') FOR [Contact]
GO

ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT ('') FOR [Phone]
GO

ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT ('') FOR [Email]
GO

ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT ('') FOR [Address]
GO

ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT ((1)) FOR [IsActive]
GO
