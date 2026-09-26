SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_CloseSession]
    @SessionId   INT,
    @ClosingCash DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Sessions
    SET    LogoutTime  = GETDATE(),
           ClosingCash = @ClosingCash,
           IsClosed    = 1
    WHERE  Id = @SessionId;
END
GO
