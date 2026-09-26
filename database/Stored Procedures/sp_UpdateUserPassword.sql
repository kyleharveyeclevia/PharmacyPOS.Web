SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateUserPassword]
    @UserId       INT,
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users SET PasswordHash = @PasswordHash WHERE Id = @UserId;
    SELECT @@ROWCOUNT AS Result, 'Password updated.' AS Message;
END
GO
