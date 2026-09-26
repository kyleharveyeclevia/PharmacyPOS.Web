SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Customers](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Phone] [nvarchar](30) NOT NULL,
	[Email] [nvarchar](100) NOT NULL,
	[Address] [nvarchar](255) NOT NULL,
	[IsSeniorCitizen] [bit] NOT NULL,
	[IsPWD] [bit] NOT NULL,
	[SCPWDId] [nvarchar](50) NULL,
	[Points] [decimal](18, 2) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [Phone]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [Email]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [Address]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [IsSeniorCitizen]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [IsPWD]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [Points]
GO

ALTER TABLE [dbo].[Customers] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
