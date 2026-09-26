SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateCategory]
    @Id  INT,
    @Name        NVARCHAR(100),
    @Description NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

        UPDATE Categories
        SET
            Name = @Name,
            Description = @Description
        WHERE Id = @Id;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Result,
                   'Category not found.' AS Message;
            RETURN;
        END

        SELECT 1 AS Result,
               'Category updated successfully.' AS Message;

    END TRY
    BEGIN CATCH

        SELECT 0 AS Result,
               ERROR_MESSAGE() AS Message;

    END CATCH
END
GO
