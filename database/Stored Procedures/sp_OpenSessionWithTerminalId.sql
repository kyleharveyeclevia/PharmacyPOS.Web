CREATE OR ALTER PROCEDURE dbo.sp_OpenSessionWithTerminalId @UserId int,@TerminalId int,@OpeningCash decimal(18,2),@AllowTerminalSwitch bit=0
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @locked int,@session int,@existingTerminal int;
        SELECT @locked=Id FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE Id=@UserId AND IsActive=1;
        IF @locked IS NULL OR @OpeningCash IS NULL OR @OpeningCash<0 THROW 50001,'Invalid user or opening cash.',1;
        DECLARE @terminalCode nvarchar(50);
        SELECT @terminalCode=TerminalCode FROM dbo.Terminals WHERE Id=@TerminalId AND IsActive=1;
        IF @terminalCode IS NULL THROW 50001,'Invalid or inactive terminal.',1;
        SELECT @session=Id,@existingTerminal=TerminalId FROM dbo.Sessions WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@UserId AND IsClosed=0;
        IF @session IS NOT NULL AND (@existingTerminal IS NULL OR @existingTerminal<>@TerminalId)
        BEGIN
            IF @AllowTerminalSwitch=0 THROW 50001,'USER_ALREADY_LOGGED_IN_ON_ANOTHER_TERMINAL',1;
            UPDATE dbo.Sessions SET TerminalId=@TerminalId,Terminal=@terminalCode WHERE Id=@session;
        END;
        IF @session IS NULL
        BEGIN
            INSERT dbo.Sessions(UserId,TerminalId,Terminal,LoginTime,OpeningCash) VALUES(@UserId,@TerminalId,@terminalCode,GETDATE(),@OpeningCash);
            SET @session=CONVERT(int,SCOPE_IDENTITY());
        END;
        COMMIT; SELECT @session AS SessionId,'SUCCESS' AS Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT -1 AS SessionId,ERROR_MESSAGE() AS Message;
    END CATCH;
END;
GO
