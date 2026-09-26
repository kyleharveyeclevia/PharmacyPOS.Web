SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_CreateUser]
    @Username     NVARCHAR(50),
    @PasswordHash NVARCHAR(255),
    @FullName     NVARCHAR(100),
    @Email        NVARCHAR(100),
    @Phone        NVARCHAR(30),
    @Role         NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Users WHERE Username = @Username)
    BEGIN
        SELECT -1 AS Result, 'Username already exists.' AS Message;
        RETURN;
    END
    INSERT INTO Users (Username, PasswordHash, FullName, Email, Phone, Role, IsActive, CreatedAt)
    VALUES (@Username, @PasswordHash, @FullName, @Email, @Phone, @Role, 1, GETDATE());
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Result, 'User created successfully.' AS Message;
END
GO
