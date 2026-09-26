SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetSuppliers]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Contact, Phone, Email, Address, IsActive
    FROM   Suppliers WHERE IsActive = 1 ORDER BY Name;
END
GO
