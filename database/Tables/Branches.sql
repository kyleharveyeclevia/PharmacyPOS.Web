CREATE TABLE dbo.Branches (
    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Branches PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_Branches_IsActive DEFAULT(1)
);
GO
