SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateCustomer]
    @Id                 INT,
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

    IF NOT EXISTS
    (
        SELECT 1
        FROM Customers
        WHERE Id = @Id
    )
    BEGIN
        SELECT -1 AS Result,
               'Customer not found.' AS Message;
        RETURN;
    END

    IF EXISTS
    (
        SELECT 1
        FROM Customers
        WHERE Name = @Name
          AND Id <> @Id
    )
    BEGIN
        SELECT -1 AS Result,
               'Customer already exists.' AS Message;
        RETURN;
    END

    UPDATE Customers
    SET
        Name = @Name,
        Phone = @Phone,
        Email = @Email,
        Address = @Address,
        IsSeniorCitizen = @IsSeniorCitizen,
        IsPWD = @IsPWD,
        SCPWDId = @SCPWDId,
        Points = @Points
    WHERE Id = @Id;

    SELECT @Id AS Result,
           'Customer updated.' AS Message;

END;
GO
