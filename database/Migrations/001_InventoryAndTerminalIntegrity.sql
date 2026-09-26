-- Backfill legacy data without inventing a device identity for unknown terminals.
ALTER TABLE dbo.Sessions ALTER COLUMN TerminalId int NULL;
DECLARE @defaultName sysname;
SELECT @defaultName=d.name FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id WHERE d.parent_object_id=OBJECT_ID('dbo.Sessions') AND c.name='TerminalId';
DECLARE @ddl nvarchar(max);
IF @defaultName IS NOT NULL BEGIN SET @ddl='ALTER TABLE dbo.Sessions DROP CONSTRAINT '+QUOTENAME(@defaultName); EXEC(@ddl); END;
UPDATE s SET TerminalId=t.Id FROM dbo.Sessions s JOIN dbo.Terminals t ON s.Terminal=t.TerminalCode WHERE s.TerminalId IS NULL OR s.TerminalId=0;
UPDATE s SET TerminalId=NULL FROM dbo.Sessions s WHERE NOT EXISTS(SELECT 1 FROM dbo.Terminals t WHERE t.Id=s.TerminalId);
UPDATE tr SET TerminalId=s.TerminalId FROM dbo.Transactions tr JOIN dbo.Sessions s ON s.Id=tr.SessionId WHERE tr.TerminalId IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.Terminals t WHERE t.Id=tr.TerminalId);
;WITH DuplicateSessions AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY UserId ORDER BY LoginTime DESC,Id DESC) AS rn FROM dbo.Sessions WHERE IsClosed=0)
UPDATE DuplicateSessions SET IsClosed=1,LogoutTime=COALESCE(LogoutTime,GETDATE()) WHERE rn>1;
SET IDENTITY_INSERT dbo.Branches ON;
INSERT dbo.Branches(Id,Name) SELECT DISTINCT t.BranchId,CONCAT('Branch ',t.BranchId) FROM dbo.Terminals t WHERE NOT EXISTS(SELECT 1 FROM dbo.Branches b WHERE b.Id=t.BranchId);
SET IDENTITY_INSERT dbo.Branches OFF;
-- Original exports contain two identical TerminalCode unique constraints.
DECLARE @duplicate sysname;
WHILE (SELECT COUNT(*) FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Terminals') AND i.is_unique_constraint=1 AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=1 AND EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND c.name='TerminalCode'))>1
BEGIN
    SELECT TOP(1) @duplicate=i.name FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.Terminals') AND i.is_unique_constraint=1 AND i.name<>'UQ_Terminals_TerminalCode' AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=1 AND EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND c.name='TerminalCode');
    SET @ddl='ALTER TABLE dbo.Terminals DROP CONSTRAINT '+QUOTENAME(@duplicate); EXEC(@ddl);
END;
INSERT dbo.InventoryBatches(ProductId,BatchNo,ExpiryDate,StockQuantity)
SELECT p.Id,COALESCE(NULLIF(p.BatchNo,''),'LEGACY'),p.ExpiryDate,p.StockQuantity FROM dbo.Products p WHERE NOT EXISTS(SELECT 1 FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id);
-- Old receipts lack batch provenance. Leave BatchId NULL rather than fabricate it.
GO
