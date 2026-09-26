SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateUser]
    @UserId   INT,
    @FullName NVARCHAR(100),
    @Email    NVARCHAR(100),
    @Phone    NVARCHAR(30),
    @Role     NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users
    SET    FullName = @FullName,
           Email    = @Email,
           Phone    = @Phone,
           Role     = @Role
    WHERE  Id = @UserId;
    SELECT @@ROWCOUNT AS Result, 'User updated.' AS Message;
END
GO
