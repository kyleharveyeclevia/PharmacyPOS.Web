CREATE OR ALTER PROCEDURE dbo.sp_OpenSession @UserId int,@Terminal nvarchar(50),@OpeningCash decimal(18,2)=0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @terminalId int=(SELECT Id FROM dbo.Terminals WHERE TerminalCode=@Terminal AND IsActive=1);
    IF @terminalId IS NULL BEGIN SELECT -1 AS SessionId,'Invalid terminal.' AS Message; RETURN; END;
    EXEC dbo.sp_OpenSessionWithTerminalId @UserId,@terminalId,@OpeningCash;
END;
GO
