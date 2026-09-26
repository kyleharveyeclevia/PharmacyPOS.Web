SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_ToggleUserStatus]
    @UserId        INT,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @UserId = @CurrentUserId
    BEGIN
        SELECT -1 AS Result, 'Cannot deactivate yourself.' AS Message;
        RETURN;
    END
    UPDATE Users
    SET    IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END
    WHERE  Id = @UserId;

    SELECT IsActive AS Result,
           CASE WHEN IsActive = 1 THEN 'User activated.' ELSE 'User deactivated.' END AS Message
    FROM   Users WHERE Id = @UserId;
END
GO
