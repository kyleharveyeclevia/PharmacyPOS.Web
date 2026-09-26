SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetCustomers]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Phone, Email, Address,
           IsSeniorCitizen, IsPWD, SCPWDId, Points
    FROM   Customers ORDER BY Name;
END
GO
