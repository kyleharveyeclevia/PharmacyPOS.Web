SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetAllUsers]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, FullName, Email, Phone, Role, IsActive, CreatedAt, LastLogin
    FROM   Users
    ORDER  BY FullName;
END
GO
