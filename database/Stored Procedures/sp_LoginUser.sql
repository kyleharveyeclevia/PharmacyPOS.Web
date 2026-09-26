SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_LoginUser]
    @Username NVARCHAR(50),
    @Terminal NVARCHAR(50) = 'POS-1'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, PasswordHash, FullName, Email, Phone, Role, IsActive, LastLogin
    FROM   Users
    WHERE  Username = @Username AND IsActive = 1;
END
GO
