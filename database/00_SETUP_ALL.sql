-- ============================================================
-- RxPharmacy Plus - Complete Database Setup
-- Run this ONE file in SSMS to set everything up.
-- Server: SQL Server 2019+ or LocalDB
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'RxPharmacyDB')
BEGIN
    CREATE DATABASE RxPharmacyDB;
    PRINT 'Database RxPharmacyDB created.';
END
ELSE
    PRINT 'Database RxPharmacyDB already exists.';
GO

USE RxPharmacyDB;
GO
PRINT 'Active database: ' + DB_NAME();
GO

-- ============================================================
-- PART 1: TABLES
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Users')
BEGIN
    CREATE TABLE Users (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        Username     NVARCHAR(50)  NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        FullName     NVARCHAR(100) NOT NULL,
        Email        NVARCHAR(100) NOT NULL DEFAULT '',
        Phone        NVARCHAR(30)  NOT NULL DEFAULT '',
        Role         NVARCHAR(20)  NOT NULL DEFAULT 'Cashier'
                         CONSTRAINT chk_Users_Role CHECK (Role IN ('Admin','Pharmacist','Cashier')),
        IsActive     BIT           NOT NULL DEFAULT 1,
        CreatedAt    DATETIME2     NOT NULL DEFAULT GETDATE(),
        LastLogin    DATETIME2     NULL
    );
    PRINT '+ Table Users created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Sessions')
BEGIN
    CREATE TABLE Sessions (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        UserId       INT           NOT NULL CONSTRAINT fk_Sessions_Users REFERENCES Users(Id),
        LoginTime    DATETIME2     NOT NULL DEFAULT GETDATE(),
        LogoutTime   DATETIME2     NULL,
        OpeningCash  DECIMAL(18,2) NOT NULL DEFAULT 0,
        ClosingCash  DECIMAL(18,2) NOT NULL DEFAULT 0,
        OpeningNote  NVARCHAR(255) NULL,
        Terminal     NVARCHAR(50)  NOT NULL DEFAULT 'WEB-1',
        IsClosed     BIT           NOT NULL DEFAULT 0
    );
    PRINT '+ Table Sessions created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Categories')
BEGIN
    CREATE TABLE Categories (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255) NOT NULL DEFAULT ''
    );
    PRINT '+ Table Categories created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Suppliers')
BEGIN
    CREATE TABLE Suppliers (
        Id       INT IDENTITY(1,1) PRIMARY KEY,
        Name     NVARCHAR(100) NOT NULL,
        Contact  NVARCHAR(100) NOT NULL DEFAULT '',
        Phone    NVARCHAR(30)  NOT NULL DEFAULT '',
        Email    NVARCHAR(100) NOT NULL DEFAULT '',
        Address  NVARCHAR(255) NOT NULL DEFAULT '',
        IsActive BIT           NOT NULL DEFAULT 1
    );
    PRINT '+ Table Suppliers created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Products')
BEGIN
    CREATE TABLE Products (
        Id                   INT IDENTITY(1,1) PRIMARY KEY,
        Barcode              NVARCHAR(50)  NOT NULL UNIQUE,
        Name                 NVARCHAR(150) NOT NULL,
        GenericName          NVARCHAR(150) NOT NULL DEFAULT '',
        Description          NVARCHAR(500) NOT NULL DEFAULT '',
        Unit                 NVARCHAR(20)  NOT NULL DEFAULT 'pcs',
        CategoryId           INT           NOT NULL CONSTRAINT fk_Products_Categories REFERENCES Categories(Id),
        SupplierId           INT           NULL     CONSTRAINT fk_Products_Suppliers  REFERENCES Suppliers(Id),
        CostPrice            DECIMAL(18,2) NOT NULL DEFAULT 0,
        SellingPrice         DECIMAL(18,2) NOT NULL DEFAULT 0,
        StockQuantity        INT           NOT NULL DEFAULT 0,
        ReorderLevel         INT           NOT NULL DEFAULT 10,
        RequiresPrescription BIT           NOT NULL DEFAULT 0,
        IsActive             BIT           NOT NULL DEFAULT 1,
        ExpiryDate           DATE          NULL,
        CreatedAt            DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt            DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    PRINT '+ Table Products created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Customers')
BEGIN
    CREATE TABLE Customers (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Name            NVARCHAR(100) NOT NULL,
        Phone           NVARCHAR(30)  NOT NULL DEFAULT '',
        Email           NVARCHAR(100) NOT NULL DEFAULT '',
        Address         NVARCHAR(255) NOT NULL DEFAULT '',
        IsSeniorCitizen BIT           NOT NULL DEFAULT 0,
        IsPWD           BIT           NOT NULL DEFAULT 0,
        SCPWDId         NVARCHAR(50)  NULL,
        Points          DECIMAL(18,2) NOT NULL DEFAULT 0,
        CreatedAt       DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    PRINT '+ Table Customers created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Transactions')
BEGIN
    CREATE TABLE Transactions (
        Id                   INT IDENTITY(1,1) PRIMARY KEY,
        ReceiptNumber        NVARCHAR(50)  NOT NULL UNIQUE,
        SessionId            INT           NOT NULL CONSTRAINT fk_Tx_Sessions  REFERENCES Sessions(Id),
        UserId               INT           NOT NULL CONSTRAINT fk_Tx_Users     REFERENCES Users(Id),
        CustomerId           INT           NULL     CONSTRAINT fk_Tx_Customers REFERENCES Customers(Id),
        TransactionDate      DATETIME2     NOT NULL DEFAULT GETDATE(),
        TransactionType      NVARCHAR(20)  NOT NULL DEFAULT 'Sale'
                                 CONSTRAINT chk_Tx_Type CHECK (TransactionType IN ('Sale','Return','Void')),
        SubTotal             DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountAmount       DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountPercent      DECIMAL(5,2)  NOT NULL DEFAULT 0,
        VatAmount            DECIMAL(18,2) NOT NULL DEFAULT 0,
        VatPercent           DECIMAL(5,2)  NOT NULL DEFAULT 12,
        TotalAmount          DECIMAL(18,2) NOT NULL DEFAULT 0,
        AmountTendered       DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Change]             DECIMAL(18,2) NOT NULL DEFAULT 0,
        PaymentMethod        NVARCHAR(20)  NOT NULL DEFAULT 'Cash'
                                 CONSTRAINT chk_Tx_Payment CHECK (PaymentMethod IN ('Cash','Card','GCash','PhilHealth','HMO')),
        PrescriptionNumber   NVARCHAR(50)  NULL,
        Notes                NVARCHAR(500) NULL,
        IsVoided             BIT           NOT NULL DEFAULT 0,
        VoidReason           NVARCHAR(255) NULL,
        RelatedTransactionId INT           NULL     CONSTRAINT fk_Tx_Related REFERENCES Transactions(Id)
    );
    PRINT '+ Table Transactions created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='TransactionItems')
BEGIN
    CREATE TABLE TransactionItems (
        Id             INT IDENTITY(1,1) PRIMARY KEY,
        TransactionId  INT           NOT NULL CONSTRAINT fk_TxItems_Tx       REFERENCES Transactions(Id),
        ProductId      INT           NOT NULL CONSTRAINT fk_TxItems_Products  REFERENCES Products(Id),
        ProductName    NVARCHAR(150) NOT NULL,
        ProductBarcode NVARCHAR(50)  NOT NULL,
        Quantity       INT           NOT NULL DEFAULT 1,
        UnitPrice      DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        LineTotal      DECIMAL(18,2) NOT NULL DEFAULT 0
    );
    PRINT '+ Table TransactionItems created.';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='StockAdjustments')
BEGIN
    CREATE TABLE StockAdjustments (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        ProductId   INT           NOT NULL CONSTRAINT fk_StockAdj_Products REFERENCES Products(Id),
        UserId      INT           NOT NULL CONSTRAINT fk_StockAdj_Users    REFERENCES Users(Id),
        Adjustment  INT           NOT NULL,
        Reason      NVARCHAR(255) NOT NULL,
        CreatedAt   DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    PRINT '+ Table StockAdjustments created.';
END
GO

-- ============================================================
-- PART 2: SEED DATA
-- ============================================================

-- Default users (BCrypt hash of "password" - change via User Management after first login)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username='admin')
BEGIN
    INSERT INTO Users (Username, PasswordHash, FullName, Email, Phone, Role, IsActive) VALUES
    ('admin',
     '$2a$11$K5e1yQxW1mT8uD0HrZ5y0.GpSmyGnHPNXEh.rGVHZLf9hH1YJdOUK',
     'System Administrator','admin@pharmacy.com','09171234567','Admin',1),
    ('cashier1',
     '$2a$11$K5e1yQxW1mT8uD0HrZ5y0.GpSmyGnHPNXEh.rGVHZLf9hH1YJdOUK',
     'Juan dela Cruz','cashier@pharmacy.com','09181234567','Cashier',1),
    ('pharmacist1',
     '$2a$11$K5e1yQxW1mT8uD0HrZ5y0.GpSmyGnHPNXEh.rGVHZLf9hH1YJdOUK',
     'Dr. Maria Santos','pharmacist@pharmacy.com','09191234567','Pharmacist',1);
    PRINT '+ Default users inserted. NOTE: Reset passwords via User Management after first login.';
    PRINT '  Default password for all accounts: password';
END
GO

IF NOT EXISTS (SELECT 1 FROM Categories)
BEGIN
    INSERT INTO Categories (Name, Description) VALUES
    ('Analgesics',             'Pain relievers and antipyretics'),
    ('Antibiotics',            'Antibacterial prescription medications'),
    ('Vitamins & Supplements', 'Nutritional and dietary supplements'),
    ('Antihypertensive',       'Blood pressure medications'),
    ('Antidiabetic',           'Diabetes management medications'),
    ('Antacids',               'Stomach acid and GI medications'),
    ('OTC Medicines',          'Over-the-counter general medications'),
    ('Medical Supplies',       'Medical devices, consumables and supplies'),
    ('Dermatologicals',        'Skin care medications and treatments'),
    ('Respiratory',            'Cough, cold and respiratory medications');
    PRINT '+ Categories inserted.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Suppliers)
BEGIN
    INSERT INTO Suppliers (Name, Contact, Phone, Email, Address, IsActive) VALUES
    ('Unilab Inc.',          'Sales Dept',     '02-8888-1111','orders@unilab.com.ph',   'Mandaluyong City',1),
    ('Pascual Laboratories', 'Trade Division', '02-7777-2222','orders@pascual.com.ph',  'Quezon City',     1),
    ('Novartis Philippines', 'Key Accounts',   '02-6666-3333','orders@novartis.ph',     'Makati City',     1),
    ('Pfizer Philippines',   'Distribution',   '02-5555-4444','orders@pfizer.ph',       'BGC, Taguig',     1),
    ('Generika Pharmacy',    'Wholesale',      '02-4444-5555','wholesale@generika.com', 'Pasig City',      1);
    PRINT '+ Suppliers inserted.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Customers)
BEGIN
    INSERT INTO Customers (Name, Phone, Email, Address, IsSeniorCitizen, IsPWD, SCPWDId) VALUES
    ('Walk-in Customer', '',            '',               '',                   0,0,NULL),
    ('Jose Rizal',       '09171234567', 'jose@email.com', 'Calamba, Laguna',    1,0,'SC-123456'),
    ('Maria Clara',      '09181234567', 'maria@email.com','Intramuros, Manila', 0,1,'PWD-654321'),
    ('Andres Bonifacio', '09191234567', '',               'Tondo, Manila',      0,0,NULL);
    PRINT '+ Customers inserted.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Products)
BEGIN
    DECLARE @catA  INT=(SELECT Id FROM Categories WHERE Name='Analgesics');
    DECLARE @catB  INT=(SELECT Id FROM Categories WHERE Name='Antibiotics');
    DECLARE @catV  INT=(SELECT Id FROM Categories WHERE Name='Vitamins & Supplements');
    DECLARE @catH  INT=(SELECT Id FROM Categories WHERE Name='Antihypertensive');
    DECLARE @catD  INT=(SELECT Id FROM Categories WHERE Name='Antidiabetic');
    DECLARE @catG  INT=(SELECT Id FROM Categories WHERE Name='Antacids');
    DECLARE @catO  INT=(SELECT Id FROM Categories WHERE Name='OTC Medicines');
    DECLARE @catS  INT=(SELECT Id FROM Categories WHERE Name='Medical Supplies');
    DECLARE @catR  INT=(SELECT Id FROM Categories WHERE Name='Respiratory');
    DECLARE @sU    INT=(SELECT Id FROM Suppliers WHERE Name='Unilab Inc.');
    DECLARE @sP    INT=(SELECT Id FROM Suppliers WHERE Name='Pascual Laboratories');
    DECLARE @sN    INT=(SELECT Id FROM Suppliers WHERE Name='Novartis Philippines');
    DECLARE @sPf   INT=(SELECT Id FROM Suppliers WHERE Name='Pfizer Philippines');

    INSERT INTO Products (Barcode,Name,GenericName,Unit,CategoryId,SupplierId,CostPrice,SellingPrice,StockQuantity,ReorderLevel,RequiresPrescription,IsActive,ExpiryDate) VALUES
    ('4800888111111','Biogesic 500mg',          'Paracetamol',                      'tab',@catA, @sU,  2.50,  5.00,500,50,0,1,'2027-12-31'),
    ('4800888111112','Biogesic 250mg Syrup',    'Paracetamol Syrup',                'btl',@catA, @sU, 35.00, 68.00, 80,20,0,1,'2026-06-30'),
    ('4800888222222','Alaxan FR',               'Ibuprofen+Paracetamol',            'tab',@catA, @sU,  6.00, 12.00,300,30,0,1,'2027-06-30'),
    ('4800888222223','Mefenamic Acid 500mg',    'Mefenamic Acid',                   'cap',@catA, @sP,  5.00, 10.00,200,20,0,1,'2027-03-31'),
    ('4800888333333','Amoxicillin 500mg',       'Amoxicillin Trihydrate',           'cap',@catB, @sP,  8.00, 15.00,200,20,1,1,'2026-09-30'),
    ('4800888333334','Co-Amoxiclav 625mg',      'Amoxicillin+Clavulanate',          'tab',@catB, @sP, 22.00, 42.00,100,15,1,1,'2026-09-30'),
    ('4800888333335','Azithromycin 500mg',      'Azithromycin Dihydrate',           'tab',@catB, @sPf,28.00, 55.00, 80,10,1,1,'2026-12-31'),
    ('4800888444444','Cefalexin 500mg',         'Cefalexin Monohydrate',            'cap',@catB, @sP, 10.00, 18.00,150,15,1,1,'2026-06-30'),
    ('4800888555555','Enervon-C',               'Multivitamins+Vitamin C',          'tab',@catV, @sU,  7.00, 14.00,400,40,0,1,'2028-01-31'),
    ('4800888555556','Cherifer PGM',            'Growth Supplement',                'cap',@catV, @sP, 12.00, 22.00,200,20,0,1,'2027-06-30'),
    ('4800888555557','Vitamin C 500mg',         'Ascorbic Acid',                    'tab',@catV, @sU,  3.00,  6.00,600,60,0,1,'2028-03-31'),
    ('4800888555558','Omega-3 Fish Oil 1000mg', 'Omega-3 Fatty Acids',              'sft',@catV, @sPf,15.00, 28.00,150,20,0,1,'2027-09-30'),
    ('4800888666666','Amlodipine 5mg',          'Amlodipine Besylate',              'tab',@catH, @sN,  5.00, 10.00,300,30,1,1,'2027-06-30'),
    ('4800888666667','Amlodipine 10mg',         'Amlodipine Besylate',              'tab',@catH, @sN,  7.00, 14.00,200,20,1,1,'2027-06-30'),
    ('4800888777777','Losartan 50mg',           'Losartan Potassium',               'tab',@catH, @sN,  6.50, 13.00,250,25,1,1,'2027-03-31'),
    ('4800888777778','Metformin 500mg',         'Metformin Hydrochloride',          'tab',@catD, @sN,  4.00,  8.00,300,30,1,1,'2027-06-30'),
    ('4800888777779','Glimepiride 2mg',         'Glimepiride',                      'tab',@catD, @sN,  8.00, 16.00,150,15,1,1,'2027-06-30'),
    ('4800888888888','Kremil-S',                'Al+Mg Hydroxide+Simethicone',      'tab',@catG, @sU,  3.00,  6.00,500,50,0,1,'2027-12-31'),
    ('4800888888889','Omeprazole 20mg',         'Omeprazole',                       'cap',@catG, @sPf, 8.00, 16.00,200,20,1,1,'2027-06-30'),
    ('4800888999999','Neozep Forte',            'Phenylephrine+Chlorphenamine+PCM', 'tab',@catO, @sU,  4.00,  8.00,400,40,0,1,'2027-09-30'),
    ('4800888000001','Decolgen Forte',          'Phenylpropanolamine+Chlorphen.',   'tab',@catO, @sU,  3.50,  7.00,350,35,0,1,'2027-06-30'),
    ('4800888000002','Cetirizine 10mg',         'Cetirizine HCl',                   'tab',@catO, @sU,  4.50,  9.00,250,25,0,1,'2027-09-30'),
    ('4800888000003','Alcohol 70pct 500ml',     'Isopropyl Alcohol',                'btl',@catO, NULL,60.00, 95.00,  8,15,0,1, NULL),
    ('4800888000004','Surgical Mask Box/50',    'Disposable Face Mask',             'box',@catS, NULL,150.00,250.00,50,10,0,1, NULL),
    ('4800888000005','Salbutamol Inhaler',      'Salbutamol Sulfate 100mcg',        'pcs',@catR, @sPf,280.00,450.00,40,10,1,1,'2026-12-31');
    PRINT '+ Products inserted (25 items).';
END
GO

-- ============================================================
-- PART 3: STORED PROCEDURES
-- ============================================================
PRINT '';
PRINT 'Creating stored procedures...';
GO

-- ── AUTH ─────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_LoginUser
    @Username NVARCHAR(50), @Terminal NVARCHAR(50) = 'WEB-1'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, PasswordHash, FullName, Email, Phone, Role, IsActive, LastLogin
    FROM   Users WHERE Username=@Username AND IsActive=1;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateLastLogin @UserId INT
AS BEGIN SET NOCOUNT ON; UPDATE Users SET LastLogin=GETDATE() WHERE Id=@UserId; END
GO

CREATE OR ALTER PROCEDURE sp_OpenSession
    @UserId INT, @Terminal NVARCHAR(50), @OpeningCash DECIMAL(18,2)=0
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Sessions (UserId,LoginTime,OpeningCash,Terminal,IsClosed)
    VALUES (@UserId,GETDATE(),@OpeningCash,@Terminal,0);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS SessionId;
END
GO

CREATE OR ALTER PROCEDURE sp_CloseSession
    @SessionId INT, @ClosingCash DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Sessions SET LogoutTime=GETDATE(), ClosingCash=@ClosingCash, IsClosed=1
    WHERE Id=@SessionId;
END
GO

-- ── USERS ─────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_GetAllUsers
AS BEGIN SET NOCOUNT ON; SELECT Id,Username,FullName,Email,Phone,Role,IsActive,CreatedAt,LastLogin FROM Users ORDER BY FullName; END
GO

CREATE OR ALTER PROCEDURE sp_CreateUser
    @Username NVARCHAR(50), @PasswordHash NVARCHAR(255),
    @FullName NVARCHAR(100), @Email NVARCHAR(100), @Phone NVARCHAR(30), @Role NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Users WHERE Username=@Username)
    BEGIN SELECT -1 AS Result, 'Username already exists.' AS Message; RETURN; END
    INSERT INTO Users (Username,PasswordHash,FullName,Email,Phone,Role,IsActive,CreatedAt)
    VALUES (@Username,@PasswordHash,@FullName,@Email,@Phone,@Role,1,GETDATE());
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Result, 'User created.' AS Message;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUser
    @UserId INT, @FullName NVARCHAR(100), @Email NVARCHAR(100), @Phone NVARCHAR(30), @Role NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users SET FullName=@FullName,Email=@Email,Phone=@Phone,Role=@Role WHERE Id=@UserId;
    SELECT @@ROWCOUNT AS Result, 'User updated.' AS Message;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUserPassword @UserId INT, @PasswordHash NVARCHAR(255)
AS BEGIN SET NOCOUNT ON; UPDATE Users SET PasswordHash=@PasswordHash WHERE Id=@UserId; END
GO

CREATE OR ALTER PROCEDURE sp_ToggleUserStatus @UserId INT, @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @UserId=@CurrentUserId BEGIN SELECT -1 AS Result,'Cannot deactivate yourself.' AS Message; RETURN; END
    UPDATE Users SET IsActive=CASE WHEN IsActive=1 THEN 0 ELSE 1 END WHERE Id=@UserId;
    SELECT IsActive AS Result, CASE WHEN IsActive=1 THEN 'User activated.' ELSE 'User deactivated.' END AS Message
    FROM Users WHERE Id=@UserId;
END
GO

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_GetAllProducts
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id,p.Barcode,p.Name,p.GenericName,p.Description,p.Unit,
           p.CategoryId, c.Name AS CategoryName,
           p.SupplierId, s.Name AS SupplierName,
           p.CostPrice,p.SellingPrice,p.StockQuantity,p.ReorderLevel,
           p.RequiresPrescription,p.IsActive,p.ExpiryDate,p.CreatedAt,p.UpdatedAt,
           CAST(CASE WHEN p.StockQuantity<=p.ReorderLevel THEN 1 ELSE 0 END AS BIT) AS IsLowStock,
           CAST(CASE WHEN p.ExpiryDate<CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS BIT) AS IsExpired,
           CAST(CASE WHEN p.ExpiryDate>=CAST(GETDATE() AS DATE)
                      AND p.ExpiryDate<=DATEADD(DAY,30,CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END AS BIT) AS IsExpiringSoon
    FROM Products p
    JOIN Categories c ON p.CategoryId=c.Id
    LEFT JOIN Suppliers s ON p.SupplierId=s.Id
    ORDER BY p.Name;
END
GO

CREATE OR ALTER PROCEDURE sp_SearchProducts @Query NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 50
           p.Id,p.Barcode,p.Name,p.GenericName,p.Unit,
           p.CategoryId,c.Name AS CategoryName,
           p.SellingPrice,p.CostPrice,p.StockQuantity,p.ReorderLevel,
           p.RequiresPrescription,p.IsActive,p.ExpiryDate,
           CAST(CASE WHEN p.StockQuantity<=p.ReorderLevel THEN 1 ELSE 0 END AS BIT) AS IsLowStock,
           CAST(CASE WHEN p.ExpiryDate<CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS BIT) AS IsExpired,
           CAST(0 AS BIT) AS IsExpiringSoon
    FROM Products p JOIN Categories c ON p.CategoryId=c.Id
    WHERE p.IsActive=1
      AND (p.Barcode=@Query OR p.Name LIKE '%'+@Query+'%' OR p.GenericName LIKE '%'+@Query+'%')
    ORDER BY CASE WHEN p.Barcode=@Query THEN 0 ELSE 1 END, p.Name;
END
GO

CREATE OR ALTER PROCEDURE sp_GetProductByBarcode @Barcode NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id,p.Barcode,p.Name,p.GenericName,p.Unit,
           p.CategoryId,c.Name AS CategoryName,
           p.SellingPrice,p.CostPrice,p.StockQuantity,p.ReorderLevel,
           p.RequiresPrescription,p.IsActive,p.ExpiryDate,
           CAST(CASE WHEN p.StockQuantity<=p.ReorderLevel THEN 1 ELSE 0 END AS BIT) AS IsLowStock,
           CAST(CASE WHEN p.ExpiryDate<CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS BIT) AS IsExpired,
           CAST(0 AS BIT) AS IsExpiringSoon
    FROM Products p JOIN Categories c ON p.CategoryId=c.Id
    WHERE p.Barcode=@Barcode AND p.IsActive=1;
END
GO

CREATE OR ALTER PROCEDURE sp_GetLowStockProducts
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id,p.Barcode,p.Name,p.GenericName,p.Unit,
           p.CategoryId,c.Name AS CategoryName,
           p.SellingPrice,p.CostPrice,p.StockQuantity,p.ReorderLevel,
           p.RequiresPrescription,p.IsActive,p.ExpiryDate,
           CAST(1 AS BIT) AS IsLowStock,
           CAST(CASE WHEN p.ExpiryDate<CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS BIT) AS IsExpired,
           CAST(0 AS BIT) AS IsExpiringSoon
    FROM Products p JOIN Categories c ON p.CategoryId=c.Id
    WHERE p.IsActive=1 AND p.StockQuantity<=p.ReorderLevel
    ORDER BY p.StockQuantity ASC;
END
GO

CREATE OR ALTER PROCEDURE sp_AddProduct
    @Barcode NVARCHAR(50),@Name NVARCHAR(150),@GenericName NVARCHAR(150),
    @Description NVARCHAR(500),@Unit NVARCHAR(20),@CategoryId INT,@SupplierId INT=NULL,
    @CostPrice DECIMAL(18,2),@SellingPrice DECIMAL(18,2),@StockQuantity INT,
    @ReorderLevel INT,@RequiresPrescription BIT,@ExpiryDate DATE=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Products WHERE Barcode=@Barcode)
    BEGIN SELECT -1 AS Result,'Barcode already exists.' AS Message; RETURN; END
    INSERT INTO Products (Barcode,Name,GenericName,Description,Unit,CategoryId,SupplierId,
        CostPrice,SellingPrice,StockQuantity,ReorderLevel,RequiresPrescription,IsActive,ExpiryDate,CreatedAt,UpdatedAt)
    VALUES (@Barcode,@Name,@GenericName,@Description,@Unit,@CategoryId,@SupplierId,
        @CostPrice,@SellingPrice,@StockQuantity,@ReorderLevel,@RequiresPrescription,1,@ExpiryDate,GETDATE(),GETDATE());
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Result,'Product added.' AS Message;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateProduct
    @Id INT,@Barcode NVARCHAR(50),@Name NVARCHAR(150),@GenericName NVARCHAR(150),
    @Description NVARCHAR(500),@Unit NVARCHAR(20),@CategoryId INT,@SupplierId INT=NULL,
    @CostPrice DECIMAL(18,2),@SellingPrice DECIMAL(18,2),@ReorderLevel INT,
    @RequiresPrescription BIT,@IsActive BIT,@ExpiryDate DATE=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Products WHERE Barcode=@Barcode AND Id<>@Id)
    BEGIN SELECT -1 AS Result,'Barcode used by another product.' AS Message; RETURN; END
    UPDATE Products SET Barcode=@Barcode,Name=@Name,GenericName=@GenericName,
        Description=@Description,Unit=@Unit,CategoryId=@CategoryId,SupplierId=@SupplierId,
        CostPrice=@CostPrice,SellingPrice=@SellingPrice,ReorderLevel=@ReorderLevel,
        RequiresPrescription=@RequiresPrescription,IsActive=@IsActive,ExpiryDate=@ExpiryDate,UpdatedAt=GETDATE()
    WHERE Id=@Id;
    SELECT @@ROWCOUNT AS Result,'Product updated.' AS Message;
END
GO

CREATE OR ALTER PROCEDURE sp_AdjustStock
    @ProductId INT,@UserId INT,@Adjustment INT,@Reason NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @Cur INT;
        SELECT @Cur=StockQuantity FROM Products WHERE Id=@ProductId;
        IF @Cur IS NULL BEGIN SELECT -1 AS Result,'Product not found.' AS Message; ROLLBACK; RETURN; END
        IF @Cur+@Adjustment<0 BEGIN SELECT -1 AS Result,'Cannot go below zero. Current: '+CAST(@Cur AS NVARCHAR) AS Message; ROLLBACK; RETURN; END
        UPDATE Products SET StockQuantity=StockQuantity+@Adjustment,UpdatedAt=GETDATE() WHERE Id=@ProductId;
        INSERT INTO StockAdjustments (ProductId,UserId,Adjustment,Reason,CreatedAt) VALUES (@ProductId,@UserId,@Adjustment,@Reason,GETDATE());
        COMMIT;
        SELECT 1 AS Result,'New qty: '+CAST(@Cur+@Adjustment AS NVARCHAR) AS Message;
    END TRY
    BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; SELECT -1 AS Result,ERROR_MESSAGE() AS Message; END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_GetCategories
AS BEGIN SET NOCOUNT ON; SELECT Id,Name,Description FROM Categories ORDER BY Name; END
GO

CREATE OR ALTER PROCEDURE sp_GetSuppliers
AS BEGIN SET NOCOUNT ON; SELECT Id,Name,Contact,Phone,Email,Address,IsActive FROM Suppliers WHERE IsActive=1 ORDER BY Name; END
GO

CREATE OR ALTER PROCEDURE sp_GetCustomers
AS BEGIN SET NOCOUNT ON; SELECT Id,Name,Phone,Email,Address,IsSeniorCitizen,IsPWD,SCPWDId,Points FROM Customers ORDER BY Name; END
GO

-- ── TRANSACTIONS ───────────────────────────────────────────────────────────────
--
-- sp_ProcessSale
-- @ItemsJson format (PascalCase - matches C# JsonSerializerOptions with PropertyNamingPolicy=null):
-- [{"ProductId":1,"Quantity":2,"UnitPrice":5.00}, ...]
--
-- TWO bugs fixed vs naive implementations:
-- 1. JSON keys must be PascalCase to match C# System.Text.Json anonymous type output.
-- 2. Stock deduction uses @CartItems table variable instead of inline OPENJSON
--    subquery inside UPDATE...FROM, which caused alias resolution errors.

CREATE OR ALTER PROCEDURE sp_ProcessSale
    @ReceiptNumber NVARCHAR(50), @SessionId INT, @UserId INT, @CustomerId INT=NULL,
    @SubTotal DECIMAL(18,2), @DiscountAmount DECIMAL(18,2), @DiscountPercent DECIMAL(5,2),
    @VatAmount DECIMAL(18,2), @VatPercent DECIMAL(5,2)=12,
    @TotalAmount DECIMAL(18,2), @AmountTendered DECIMAL(18,2), @Change DECIMAL(18,2),
    @PaymentMethod NVARCHAR(20), @PrescriptionNumber NVARCHAR(50)=NULL,
    @Notes NVARCHAR(500)=NULL, @ItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Parse JSON into typed table variable (avoids inline subquery alias error)
        DECLARE @Cart TABLE (ProductId INT NOT NULL, Quantity INT NOT NULL, UnitPrice DECIMAL(18,2) NOT NULL);
        INSERT INTO @Cart (ProductId,Quantity,UnitPrice)
        SELECT ProductId,Quantity,UnitPrice
        FROM OPENJSON(@ItemsJson)
        WITH (ProductId INT '$.ProductId', Quantity INT '$.Quantity', UnitPrice DECIMAL(18,2) '$.UnitPrice');

        -- Validate stock
        DECLARE @Short NVARCHAR(200)=NULL;
        SELECT TOP 1 @Short=p.Name+' (available: '+CAST(p.StockQuantity AS NVARCHAR)+')'
        FROM @Cart ci JOIN Products p ON p.Id=ci.ProductId WHERE p.StockQuantity<ci.Quantity;
        IF @Short IS NOT NULL BEGIN SELECT -1 AS TransactionId,'Insufficient stock: '+@Short AS Message; ROLLBACK; RETURN; END

        -- Insert header
        INSERT INTO Transactions
            (ReceiptNumber,SessionId,UserId,CustomerId,TransactionDate,TransactionType,
             SubTotal,DiscountAmount,DiscountPercent,VatAmount,VatPercent,
             TotalAmount,AmountTendered,[Change],PaymentMethod,PrescriptionNumber,Notes,IsVoided)
        VALUES
            (@ReceiptNumber,@SessionId,@UserId,@CustomerId,GETDATE(),'Sale',
             @SubTotal,@DiscountAmount,@DiscountPercent,@VatAmount,@VatPercent,
             @TotalAmount,@AmountTendered,@Change,@PaymentMethod,@PrescriptionNumber,@Notes,0);

        DECLARE @TxId INT=SCOPE_IDENTITY();

        -- Insert line items
        INSERT INTO TransactionItems (TransactionId,ProductId,ProductName,ProductBarcode,Quantity,UnitPrice,DiscountAmount,LineTotal)
        SELECT @TxId,ci.ProductId,p.Name,p.Barcode,ci.Quantity,ci.UnitPrice,0,ci.Quantity*ci.UnitPrice
        FROM @Cart ci JOIN Products p ON p.Id=ci.ProductId;

        -- Deduct stock (join to table variable - no inline subquery)
        UPDATE p SET p.StockQuantity=p.StockQuantity-ci.Quantity, p.UpdatedAt=GETDATE()
        FROM Products p JOIN @Cart ci ON ci.ProductId=p.Id;

        COMMIT;
        SELECT @TxId AS TransactionId,'Sale processed successfully.' AS Message;
    END TRY
    BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; SELECT -1 AS TransactionId,ERROR_MESSAGE() AS Message; END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_VoidTransaction @TransactionId INT, @Reason NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Transactions WHERE Id=@TransactionId)
        BEGIN SELECT -1 AS Result,'Transaction not found.' AS Message; ROLLBACK; RETURN; END
        IF EXISTS (SELECT 1 FROM Transactions WHERE Id=@TransactionId AND IsVoided=1)
        BEGIN SELECT -1 AS Result,'Already voided.' AS Message; ROLLBACK; RETURN; END
        -- Restore stock
        UPDATE p SET p.StockQuantity=p.StockQuantity+ti.Quantity,p.UpdatedAt=GETDATE()
        FROM Products p JOIN TransactionItems ti ON ti.ProductId=p.Id WHERE ti.TransactionId=@TransactionId;
        -- Mark voided
        UPDATE Transactions SET IsVoided=1,VoidReason=@Reason,TransactionType='Void' WHERE Id=@TransactionId;
        COMMIT;
        SELECT 1 AS Result,'Transaction voided.' AS Message;
    END TRY
    BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; SELECT -1 AS Result,ERROR_MESSAGE() AS Message; END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_ProcessReturn
    @OriginalTransactionId INT,@ReceiptNumber NVARCHAR(50),
    @SessionId INT,@UserId INT,@Reason NVARCHAR(255),@ItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Transactions WHERE Id=@OriginalTransactionId AND IsVoided=0)
        BEGIN SELECT -1 AS TransactionId,'Original transaction not found or voided.' AS Message; ROLLBACK; RETURN; END

        DECLARE @Ret TABLE (ProductId INT NOT NULL, Quantity INT NOT NULL, UnitPrice DECIMAL(18,2) NOT NULL);
        INSERT INTO @Ret (ProductId,Quantity,UnitPrice)
        SELECT ProductId,Quantity,UnitPrice
        FROM OPENJSON(@ItemsJson)
        WITH (ProductId INT '$.ProductId', Quantity INT '$.Quantity', UnitPrice DECIMAL(18,2) '$.UnitPrice');

        DECLARE @Total DECIMAL(18,2);
        SELECT @Total=SUM(Quantity*UnitPrice) FROM @Ret;

        INSERT INTO Transactions
            (ReceiptNumber,SessionId,UserId,TransactionDate,TransactionType,SubTotal,TotalAmount,
             AmountTendered,[Change],PaymentMethod,RelatedTransactionId,Notes,IsVoided)
        VALUES (@ReceiptNumber,@SessionId,@UserId,GETDATE(),'Return',@Total,@Total,0,0,'Cash',@OriginalTransactionId,@Reason,0);

        DECLARE @RetId INT=SCOPE_IDENTITY();

        INSERT INTO TransactionItems (TransactionId,ProductId,ProductName,ProductBarcode,Quantity,UnitPrice,DiscountAmount,LineTotal)
        SELECT @RetId,ri.ProductId,p.Name,p.Barcode,ri.Quantity,ri.UnitPrice,0,ri.Quantity*ri.UnitPrice
        FROM @Ret ri JOIN Products p ON p.Id=ri.ProductId;

        UPDATE p SET p.StockQuantity=p.StockQuantity+ri.Quantity,p.UpdatedAt=GETDATE()
        FROM Products p JOIN @Ret ri ON ri.ProductId=p.Id;

        COMMIT;
        SELECT @RetId AS TransactionId,'Return processed.' AS Message;
    END TRY
    BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; SELECT -1 AS TransactionId,ERROR_MESSAGE() AS Message; END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_GetTransactionById @TransactionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT t.Id,t.ReceiptNumber,t.SessionId,t.UserId,u.FullName AS CashierName,
           t.CustomerId,c.Name AS CustomerName,t.TransactionDate,t.TransactionType,
           t.SubTotal,t.DiscountAmount,t.DiscountPercent,t.VatAmount,t.VatPercent,
           t.TotalAmount,t.AmountTendered,t.[Change],t.PaymentMethod,
           t.PrescriptionNumber,t.Notes,t.IsVoided,t.VoidReason
    FROM Transactions t JOIN Users u ON t.UserId=u.Id
    LEFT JOIN Customers c ON t.CustomerId=c.Id WHERE t.Id=@TransactionId;

    SELECT ti.Id,ti.TransactionId,ti.ProductId,ti.ProductName,ti.ProductBarcode,
           ti.Quantity,ti.UnitPrice,ti.DiscountAmount,ti.LineTotal
    FROM TransactionItems ti WHERE ti.TransactionId=@TransactionId;
END
GO

CREATE OR ALTER PROCEDURE sp_GetTransactionByReceipt @ReceiptNumber NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id INT=(SELECT Id FROM Transactions WHERE ReceiptNumber=@ReceiptNumber);
    SELECT t.Id,t.ReceiptNumber,t.SessionId,t.UserId,u.FullName AS CashierName,
           t.CustomerId,c.Name AS CustomerName,t.TransactionDate,t.TransactionType,
           t.SubTotal,t.DiscountAmount,t.DiscountPercent,t.VatAmount,t.VatPercent,
           t.TotalAmount,t.AmountTendered,t.[Change],t.PaymentMethod,
           t.PrescriptionNumber,t.Notes,t.IsVoided,t.VoidReason
    FROM Transactions t JOIN Users u ON t.UserId=u.Id
    LEFT JOIN Customers c ON t.CustomerId=c.Id WHERE t.Id=@Id;
    SELECT ti.Id,ti.TransactionId,ti.ProductId,ti.ProductName,ti.ProductBarcode,
           ti.Quantity,ti.UnitPrice,ti.DiscountAmount,ti.LineTotal
    FROM TransactionItems ti WHERE ti.TransactionId=@Id;
END
GO

CREATE OR ALTER PROCEDURE sp_GetTransactionsByDateRange @StartDate DATE, @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT t.Id,t.ReceiptNumber,t.SessionId,t.UserId,u.FullName AS CashierName,
           t.CustomerId,c.Name AS CustomerName,t.TransactionDate,t.TransactionType,
           t.SubTotal,t.DiscountAmount,t.VatAmount,t.TotalAmount,
           t.AmountTendered,t.[Change],t.PaymentMethod,t.IsVoided,t.VoidReason
    FROM Transactions t JOIN Users u ON t.UserId=u.Id
    LEFT JOIN Customers c ON t.CustomerId=c.Id
    WHERE CAST(t.TransactionDate AS DATE) BETWEEN @StartDate AND @EndDate
    ORDER BY t.TransactionDate DESC;
END
GO

-- ── REPORTS ───────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_GetXReadData @SessionId INT
AS
BEGIN
    SET NOCOUNT ON;
    -- RS1: Session info
    SELECT s.Id AS SessionId,s.LoginTime,s.Terminal,s.OpeningCash,u.FullName AS CashierName
    FROM Sessions s JOIN Users u ON s.UserId=u.Id WHERE s.Id=@SessionId;
    -- RS2: Aggregated sales
    SELECT
        COUNT(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN 1 END) AS TotalTransactions,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.SubTotal       END),0) AS GrossSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.DiscountAmount END),0) AS TotalDiscount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.VatAmount      END),0) AS TotalVat,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount    END),0) AS NetSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='Cash'       THEN t.TotalAmount END),0) AS CashSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='Card'       THEN t.TotalAmount END),0) AS CardSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='GCash'      THEN t.TotalAmount END),0) AS GCashSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='PhilHealth' THEN t.TotalAmount END),0) AS PhilHealthSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Return'              THEN t.TotalAmount END),0) AS RefundAmount,
        ISNULL(SUM(CASE WHEN t.IsVoided=1                            THEN t.TotalAmount END),0) AS VoidAmount
    FROM Transactions t WHERE t.SessionId=@SessionId;
    -- RS3: Items sold
    SELECT ISNULL(SUM(ti.Quantity),0) AS ItemsSold
    FROM TransactionItems ti JOIN Transactions t ON ti.TransactionId=t.Id
    WHERE t.SessionId=@SessionId AND t.TransactionType='Sale' AND t.IsVoided=0;
END
GO

CREATE OR ALTER PROCEDURE sp_GetZReadData @SessionId INT, @ClosingCash DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    -- RS1: Session info
    SELECT s.Id AS SessionId,s.LoginTime,s.OpeningCash,s.Terminal,@ClosingCash AS ClosingCash,u.FullName AS CashierName
    FROM Sessions s JOIN Users u ON s.UserId=u.Id WHERE s.Id=@SessionId;
    -- RS2: Full summary + ItemsSold
    SELECT
        COUNT(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN 1 END) AS TotalTransactions,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.SubTotal       END),0) AS GrossSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.DiscountAmount END),0) AS TotalDiscount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.VatAmount      END),0) AS TotalVat,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount    END),0) AS NetSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='Cash'       THEN t.TotalAmount END),0) AS CashSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='Card'       THEN t.TotalAmount END),0) AS CardSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='GCash'      THEN t.TotalAmount END),0) AS GCashSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 AND t.PaymentMethod='PhilHealth' THEN t.TotalAmount END),0) AS PhilHealthSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Return'              THEN t.TotalAmount END),0) AS RefundAmount,
        ISNULL(SUM(CASE WHEN t.IsVoided=1                            THEN t.TotalAmount END),0) AS VoidAmount,
        ISNULL((SELECT SUM(ti2.Quantity) FROM TransactionItems ti2
                JOIN Transactions t2 ON ti2.TransactionId=t2.Id
                WHERE t2.SessionId=@SessionId AND t2.TransactionType='Sale' AND t2.IsVoided=0),0) AS ItemsSold
    FROM Transactions t WHERE t.SessionId=@SessionId;
    -- RS3: Hourly breakdown
    SELECT DATEPART(HOUR,t.TransactionDate) AS [Hour],COUNT(*) AS [Count],SUM(t.TotalAmount) AS Amount
    FROM Transactions t WHERE t.SessionId=@SessionId AND t.TransactionType='Sale' AND t.IsVoided=0
    GROUP BY DATEPART(HOUR,t.TransactionDate) ORDER BY [Hour];
    -- RS4: Top 10 products
    SELECT TOP 10 ti.ProductName,SUM(ti.Quantity) AS QuantitySold,SUM(ti.LineTotal) AS Revenue
    FROM TransactionItems ti JOIN Transactions t ON ti.TransactionId=t.Id
    WHERE t.SessionId=@SessionId AND t.TransactionType='Sale' AND t.IsVoided=0
    GROUP BY ti.ProductName ORDER BY Revenue DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_GetDashboardStats
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE=CAST(GETDATE() AS DATE);
    -- RS1: Today's sales figures
    SELECT
        ISNULL(SUM(CASE WHEN CAST(t.TransactionDate AS DATE)=@Today AND t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount END),0) AS TodaySales,
        COUNT(CASE WHEN CAST(t.TransactionDate AS DATE)=@Today AND t.TransactionType='Sale' AND t.IsVoided=0 THEN 1 END) AS TodayTransactions,
        ISNULL(AVG(CASE WHEN CAST(t.TransactionDate AS DATE)=@Today AND t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount END),0) AS AvgTransaction
    FROM Transactions t;
    -- RS2: Low stock count
    SELECT COUNT(*) AS LowStockCount FROM Products WHERE IsActive=1 AND StockQuantity<=ReorderLevel;
    -- RS3: Recent 10 transactions today
    SELECT TOP 10 t.Id,t.ReceiptNumber,t.TransactionDate,u.FullName AS CashierName,
           t.TotalAmount,t.TransactionType,t.IsVoided
    FROM Transactions t JOIN Users u ON t.UserId=u.Id
    WHERE CAST(t.TransactionDate AS DATE)=@Today ORDER BY t.TransactionDate DESC;
    -- RS4: Top 10 low-stock products
    SELECT TOP 10
        p.Id,p.Name,p.StockQuantity,p.ReorderLevel,c.Name AS CategoryName,
        CAST(1 AS BIT) AS IsLowStock,
        CAST(CASE WHEN p.ExpiryDate<@Today THEN 1 ELSE 0 END AS BIT) AS IsExpired,
        CAST(0 AS BIT) AS IsExpiringSoon,
        p.Barcode,p.GenericName,p.Unit,p.CategoryId,p.SupplierId,
        p.CostPrice,p.SellingPrice,p.RequiresPrescription,p.IsActive,
        p.ExpiryDate,p.CreatedAt,p.UpdatedAt
    FROM Products p JOIN Categories c ON p.CategoryId=c.Id
    WHERE p.IsActive=1 AND p.StockQuantity<=p.ReorderLevel ORDER BY p.StockQuantity ASC;
END
GO

CREATE OR ALTER PROCEDURE sp_GetSalesSummaryByDateRange @StartDate DATE, @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        COUNT(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN 1 END) AS TotalCount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.TotalAmount    END),0) AS TotalSales,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.DiscountAmount END),0) AS TotalDiscount,
        ISNULL(SUM(CASE WHEN t.TransactionType='Sale' AND t.IsVoided=0 THEN t.VatAmount      END),0) AS TotalVat,
        ISNULL((SELECT SUM(ti.Quantity) FROM TransactionItems ti
                JOIN Transactions t2 ON ti.TransactionId=t2.Id
                WHERE CAST(t2.TransactionDate AS DATE) BETWEEN @StartDate AND @EndDate
                  AND t2.TransactionType='Sale' AND t2.IsVoided=0),0) AS TotalItems
    FROM Transactions t WHERE CAST(t.TransactionDate AS DATE) BETWEEN @StartDate AND @EndDate;
END
GO

CREATE OR ALTER PROCEDURE sp_GetSessionsByDate @Date DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id,s.UserId,u.FullName AS CashierName,s.LoginTime,s.LogoutTime,
           s.OpeningCash,s.ClosingCash,s.Terminal,s.IsClosed,
           (SELECT COUNT(*) FROM Transactions t WHERE t.SessionId=s.Id AND t.TransactionType='Sale' AND t.IsVoided=0) AS TxCount,
           ISNULL((SELECT SUM(t2.TotalAmount) FROM Transactions t2 WHERE t2.SessionId=s.Id AND t2.TransactionType='Sale' AND t2.IsVoided=0),0) AS NetSales
    FROM Sessions s JOIN Users u ON s.UserId=u.Id
    WHERE CAST(s.LoginTime AS DATE)=@Date ORDER BY s.LoginTime DESC;
END
GO

-- ── FINAL SUMMARY ─────────────────────────────────────────────────────────────
PRINT '';
PRINT '================================================';
PRINT 'Setup complete! Summary:';
PRINT '================================================';
SELECT 'Tables'             AS [Type], COUNT(*) AS [Count] FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'
UNION ALL
SELECT 'Stored Procedures', COUNT(*) FROM sys.procedures
UNION ALL
SELECT 'Users',             COUNT(*) FROM Users
UNION ALL
SELECT 'Products',          COUNT(*) FROM Products
UNION ALL
SELECT 'Categories',        COUNT(*) FROM Categories;
PRINT '';
PRINT 'Default credentials (password = "password" for all):';
PRINT '  admin       / password  (Admin)';
PRINT '  cashier1    / password  (Cashier)';
PRINT '  pharmacist1 / password  (Pharmacist)';
PRINT '';
PRINT 'IMPORTANT: Reset all passwords via User Management after first login!';
GO
