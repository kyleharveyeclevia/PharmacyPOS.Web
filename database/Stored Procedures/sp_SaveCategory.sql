SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_SaveCategory]
    @Name        NVARCHAR(100),
    @Description NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Categories
    (
        Name,
        Description
    )
    VALUES
    (
        @Name,
        @Description
    );

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Result, 'Category saved' AS Message;

END;
GO
