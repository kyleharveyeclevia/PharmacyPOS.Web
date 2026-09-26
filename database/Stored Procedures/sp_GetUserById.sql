SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetUserById]
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, PasswordHash, FullName, Email, Phone, Role, IsActive, CreatedAt, LastLogin
    FROM   Users WHERE Id = @UserId;
END
GO
