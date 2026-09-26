SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_SaveCustomer]
    @Name               NVARCHAR(100),
    @Phone              NVARCHAR(30),
    @Email              NVARCHAR(100),
    @Address            NVARCHAR(255),
    @IsSeniorCitizen    BIT,
    @IsPWD              BIT,
    @SCPWDId NVARCHAR(50),
    @Points DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM Customers
        WHERE Name = @Name
    )
    BEGIN
        SELECT -1 AS Result,
               'Customer already exists.' AS Message;
        RETURN;
    END

    INSERT INTO Customers
    (
        Name,
        Phone,
        Email,
        Address,
        IsSeniorCitizen,
        IsPWD,
        SCPWDId,
        Points,
        CreatedAt
    )
    VALUES
    (
        @Name,
        @Phone,
        @Email,
        @Address,
        @IsSeniorCitizen,
        @IsPWD,
        @SCPWDId,
        @Points,
        GETDATE()
    );

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Result,
           'Customer saved.' AS Message;

END;
GO
