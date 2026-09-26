using System.Data;
using System.Text.Json;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.SqlServer.TransactSql.ScriptDom;
using PharmacyApi.Data;

var root = Path.GetFullPath(args.FirstOrDefault() ?? Path.Combine(AppContext.BaseDirectory,"../../../../../database"));
var server = Environment.GetEnvironmentVariable("PHARMACY_TEST_SQL") ?? "Server=localhost;Integrated Security=true;Encrypt=false;TrustServerCertificate=true";
var databases = new List<string>();
var sandbox = Path.Combine(Path.GetTempPath(),"PharmacySchemaTests_"+Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(sandbox);
foreach(var path in Directory.GetFiles(root,"*.sql",SearchOption.AllDirectories).Where(p=>p.Contains(Path.DirectorySeparatorChar+"Tables"+Path.DirectorySeparatorChar)||p.Contains(Path.DirectorySeparatorChar+"Stored Procedures"+Path.DirectorySeparatorChar)||p.Contains(Path.DirectorySeparatorChar+"Migrations"+Path.DirectorySeparatorChar))) {
    var target=Path.Combine(sandbox,Path.GetRelativePath(root,path)); Directory.CreateDirectory(Path.GetDirectoryName(target)!); File.Copy(path,target);
}
int passed=0;
void Check(bool success,string description) { if(!success) throw new Exception("FAIL: "+description); Console.WriteLine("PASS: "+description); passed++; }
string Cs(string db) { var b=new SqlConnectionStringBuilder(server){InitialCatalog=db}; return b.ConnectionString; }
DatabaseSynchronizer Sync(string db)=>new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ConnectionStrings:Default",Cs(db)}}).Build(),NullLogger<DatabaseSynchronizer>.Instance);
async Task<SqlConnection> Connect(string db){var c=new SqlConnection(Cs(db));await c.OpenAsync();return c;}
async Task<string> NewDatabase(){var name="PharmacySchemaTests_"+Guid.NewGuid().ToString("N");databases.Add(name);await Sync(name).SynchronizeAsync(sandbox);return name;}
try {
    foreach(var path in Directory.GetFiles(sandbox,"*.sql",SearchOption.AllDirectories)) DatabaseSynchronizer.Parse(File.ReadAllText(path),path);
    Check(true,"all table, migration and procedure scripts parse");
    var db=await NewDatabase();
    await using var c=await Connect(db);
    var admin=await c.QuerySingleAsync<BootstrapUser>("SELECT Username,PasswordHash,Role,IsActive FROM dbo.Users");
    Check(admin.Username=="admin" && admin.Role=="Admin" && admin.IsActive && BCrypt.Net.BCrypt.Verify("dev-admin-change-me",admin.PasswordHash),"fresh database bootstraps the requested admin with a BCrypt password hash");
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Transactions")==0 && await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.TransactionItems")==0,"fresh startup imports no transaction or receipt-item data");
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.procedures WHERE schema_id=SCHEMA_ID('dbo')")==42,"fresh startup creates all 42 procedures");
    await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.__SchemaMigrations")==1,"repeated startup is idempotent");
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Users")==1 && await c.ExecuteScalarAsync<string>("SELECT PasswordHash FROM dbo.Users WHERE Username='admin'")==admin.PasswordHash,"restart neither duplicates admin nor regenerates its password");
    var changedHash=BCrypt.Net.BCrypt.HashPassword("test-changed-password");
    await c.ExecuteAsync("UPDATE dbo.Users SET PasswordHash=@changedHash WHERE Username='admin'",new{changedHash});
    await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<string>("SELECT PasswordHash FROM dbo.Users WHERE Username='admin'")==changedHash,"restart preserves a changed admin password");
    var supplierFile=Path.Combine(sandbox,"Stored Procedures","sp_GetSuppliers.sql");
    var supplierSource=File.ReadAllText(supplierFile);
    File.WriteAllText(supplierFile,"CREATE OR ALTER PROCEDURE dbo.sp_GetSuppliers AS SELECT 'updated' AS Name;\nGO\n");
    await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<string>("EXEC dbo.sp_GetSuppliers")=="updated","restart applies modified stored procedure definitions");
    File.WriteAllText(supplierFile,supplierSource);
    File.WriteAllText(Path.Combine(sandbox,"Tables","AProbe.sql"),"CREATE TABLE dbo.AProbe(Id int NOT NULL PRIMARY KEY, ParentId int NULL, CONSTRAINT FK_AProbe_ZProbe FOREIGN KEY(ParentId) REFERENCES dbo.ZProbe(Id));\nGO\n");
    File.WriteAllText(Path.Combine(sandbox,"Tables","ZProbe.sql"),"CREATE TABLE dbo.ZProbe(Id int NOT NULL PRIMARY KEY);\nGO\n");
    await Sync(db).SynchronizeAsync(sandbox);await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys WHERE name='FK_AProbe_ZProbe'")==1,"new table relationships deploy after referenced tables and remain idempotent");
    File.Delete(Path.Combine(sandbox,"Tables","AProbe.sql"));File.Delete(Path.Combine(sandbox,"Tables","ZProbe.sql"));
    await c.ExecuteAsync("INSERT dbo.Branches(Name) VALUES('Test'); INSERT dbo.Terminals(TerminalGuid,TerminalCode,TerminalName,BranchId) VALUES(NEWID(),'TEST1','Test 1',1),(NEWID(),'TEST2','Test 2',1); INSERT dbo.Users(Username,PasswordHash,FullName) VALUES('two','not-a-login','Two'); INSERT dbo.Products(Barcode,Name,CategoryId) SELECT 'probe','Probe',Id FROM dbo.Categories; INSERT dbo.Categories(Name) VALUES('Test');");
    var productFile=Path.Combine(sandbox,"Tables","Products.sql");
    var original=File.ReadAllText(productFile);
    File.WriteAllText(productFile,original.Replace("[BatchNo] [nvarchar](50) NULL,","[BatchNo] [nvarchar](50) NULL,\n    [AddedOnRestart] nvarchar(50) NOT NULL CONSTRAINT DF_Products_Added DEFAULT('kept'),"));
    await c.ExecuteAsync("INSERT dbo.Products(Barcode,Name,CategoryId) VALUES('existing','Existing',1);");
    await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<string>("SELECT AddedOnRestart FROM dbo.Products WHERE Barcode='existing'")=="kept","restart adds required column and backfills its default");
    await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Products WHERE Barcode='existing'")==1,"repeated startup preserves existing rows");
    File.WriteAllText(productFile,original.Replace("[BatchNo] [nvarchar](50) NULL,","[BatchNo] [nvarchar](50) NULL,\n    [UnsafeRequired] int NOT NULL,"));
    bool failed=false;
    try {await Sync(db).SynchronizeAsync(sandbox);} catch(InvalidOperationException ex) {failed=ex.Message.Contains("DEFAULT");}
    Check(failed && await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Products') AND name='UnsafeRequired'")==0,"unsafe required column fails clearly and rolls back schema changes");
    File.WriteAllText(productFile,original);
    await Sync(db).SynchronizeAsync(sandbox);
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Products') AND name='AddedOnRestart'")==1,"removed column in file does not delete stored data");
    var open=await c.QuerySingleAsync<SessionResult>("sp_OpenSessionWithTerminalId",new{UserId=1,TerminalId=1,OpeningCash=0m},commandType:CommandType.StoredProcedure);
    Check(open.SessionId>0,"valid cashier session opens");
    var switched=await c.QuerySingleAsync<SessionResult>("sp_OpenSessionWithTerminalId",new{UserId=1,TerminalId=2,OpeningCash=0m,AllowTerminalSwitch=true},commandType:CommandType.StoredProcedure);
    Check(switched.SessionId==open.SessionId && await c.ExecuteScalarAsync<int>("SELECT TerminalId FROM dbo.Sessions WHERE Id=@id",new{id=open.SessionId})==2,"terminal switch updates actual session device");
    var second=await c.QuerySingleAsync<SessionResult>("sp_OpenSessionWithTerminalId",new{UserId=2,TerminalId=1,OpeningCash=0m},commandType:CommandType.StoredProcedure);
    var product=await c.ExecuteScalarAsync<int>("INSERT dbo.Products(Barcode,Name,CategoryId,SellingPrice) VALUES('sale','Sale test',1,10); SELECT CONVERT(int,SCOPE_IDENTITY());");
    await c.QuerySingleAsync<SpResult>("sp_ReceiveBatch",new{ProductId=product,BatchNo="B1",ExpiryDate=DateTime.Today.AddYears(1),Quantity=10,UserId=1},commandType:CommandType.StoredProcedure);
    async Task<TxResult> Sale(int qty,int user=1,int? session=null,int terminal=2,int? productId=null,string? json=null,decimal? total=null) {
        await using var conn=await Connect(db); var sub=qty*10m; var amount=total??sub;
        return await conn.QuerySingleAsync<TxResult>("sp_ProcessSale",new{ReceiptNumber="TEST-"+Guid.NewGuid().ToString("N"),SessionId=session??open.SessionId,UserId=user,CustomerId=(int?)null,SubTotal=sub,DiscountAmount=0m,DiscountPercent=0m,VatAmount=Math.Round(sub/1.12m*.12m,2,MidpointRounding.AwayFromZero),TotalAmount=amount,AmountTendered=sub,Change=0m,PaymentMethod="Cash",ItemsJson=json??JsonSerializer.Serialize(new[]{new{ProductId=productId??product,Quantity=qty,UnitPrice=10m}}),TerminalId=terminal,VatExemptAmount=0m},commandType:CommandType.StoredProcedure);
    }
    Check((await Sale(-1)).TransactionId<0,"negative sale quantities rejected");
    Check((await Sale(1,productId:999999)).TransactionId<0,"unknown product rejected");
    Check((await Sale(1,json:"[]")).TransactionId<0,"empty cart rejected");
    Check((await Sale(1,total:9)).TransactionId<0,"inconsistent receipt totals rejected");
    var duplicate=JsonSerializer.Serialize(new[]{new{ProductId=product,Quantity=3,UnitPrice=10m},new{ProductId=product,Quantity=3,UnitPrice=10m}});
    var sold=await Sale(6,json:duplicate);
    Check(sold.TransactionId>0 && await c.ExecuteScalarAsync<int>("SELECT StockQuantity FROM dbo.Products WHERE Id=@product",new{product})==4,"duplicate cart lines aggregated before stock deduction");
    var concurrent=await Task.WhenAll(Sale(3),Sale(3,2,second.SessionId,1));
    Check(concurrent.Count(x=>x.TransactionId>0)==1 && await c.ExecuteScalarAsync<int>("SELECT StockQuantity FROM dbo.Products WHERE Id=@product",new{product})==1,"concurrent sales cannot oversell shared inventory");
    async Task<TxResult> Return(int qty,int? id=null) => await c.QuerySingleAsync<TxResult>("sp_ProcessReturn",new{OriginalTransactionId=id??sold.TransactionId,ReceiptNumber="RTN-"+Guid.NewGuid().ToString("N"),SessionId=open.SessionId,UserId=1,Reason="Test",ItemsJson=JsonSerializer.Serialize(new[]{new{ProductId=product,Quantity=qty,UnitPrice=9999m}})},commandType:CommandType.StoredProcedure);
    var returned=await Return(2);
    Check(returned.TransactionId>0 && await c.ExecuteScalarAsync<decimal>("SELECT TotalAmount FROM dbo.Transactions WHERE Id=@id",new{id=returned.TransactionId})==20m,"return ignores caller price and refunds original paid price");
    Check((await Return(5)).TransactionId<0,"cumulative over-return rejected");
    Check((await Return(1,returned.TransactionId)).TransactionId<0,"a return cannot be used as original sale");
    var block=await c.QuerySingleAsync<SpResult>("sp_VoidTransaction",new{TransactionId=sold.TransactionId,Reason="Test"},commandType:CommandType.StoredProcedure);
    Check(block.Result<0,"sale with active returns cannot be voided");
    var before=await c.ExecuteScalarAsync<int>("SELECT StockQuantity FROM dbo.Products WHERE Id=@product",new{product});
    var voidReturn=await c.QuerySingleAsync<SpResult>("sp_VoidTransaction",new{TransactionId=returned.TransactionId,Reason="Test"},commandType:CommandType.StoredProcedure);
    Check(voidReturn.Result>0 && await c.ExecuteScalarAsync<int>("SELECT StockQuantity FROM dbo.Products WHERE Id=@product",new{product})==before-2,"voiding return removes restored stock");
    async Task<SpResult> Void(){await using var conn=await Connect(db);return await conn.QuerySingleAsync<SpResult>("sp_VoidTransaction",new{TransactionId=sold.TransactionId,Reason="Test"},commandType:CommandType.StoredProcedure);}
    var voids=await Task.WhenAll(Void(),Void());
    Check(voids.Count(x=>x.Result>0)==1,"concurrent void requests restore stock only once");
    var movement=(await c.QueryAsync<Moving>("sp_GetFastMovingItemsByDateRangeWithOffset",new{StartDate=DateTime.Today,EndDate=DateTime.Today,PageNumber=1,PageSize=10},commandType:CommandType.StoredProcedure)).ToList();
    Check(movement.Sum(x=>x.QuantitySold)==3,"movement reports exclude returns and voided sales");
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Products p WHERE p.StockQuantity<>(SELECT SUM(b.StockQuantity) FROM dbo.InventoryBatches b WHERE b.ProductId=p.Id)")==0,"batch quantities and product totals stay consistent");
    var secondBatch=await c.QuerySingleAsync<SpResult>("sp_ReceiveBatch",new{ProductId=product,BatchNo="B2",ExpiryDate=DateTime.Today.AddMonths(1),Quantity=2,UserId=1},commandType:CommandType.StoredProcedure);
    var multiSale=await Sale(4);
    Check(multiSale.TransactionId>0 && await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.TransactionItems WHERE TransactionId=@id",new{id=multiSale.TransactionId})==2,"sale splits across batches in expiry order");
    var firstReturn=await Return(2,multiSale.TransactionId);
    var firstReturnBatch=await c.ExecuteScalarAsync<int>("SELECT BatchId FROM dbo.TransactionItems WHERE TransactionId=@id",new{id=firstReturn.TransactionId});
    var nextReturn=await Return(1,multiSale.TransactionId);
    await c.QuerySingleAsync<SpResult>("sp_VoidTransaction",new{TransactionId=firstReturn.TransactionId,Reason="Test"},commandType:CommandType.StoredProcedure);
    var repeatReturn=await Return(2,multiSale.TransactionId);
    Check(repeatReturn.TransactionId>0 && await c.ExecuteScalarAsync<int>("SELECT BatchId FROM dbo.TransactionItems WHERE TransactionId=@id",new{id=repeatReturn.TransactionId})==firstReturnBatch,"voided partial return reopens the correct original batch quantities");
    await c.ExecuteAsync("UPDATE dbo.InventoryBatches SET ExpiryDate=DATEADD(day,-1,GETDATE()) WHERE ProductId=@product",new{product});
    var availability=await c.QuerySingleAsync<Availability>("sp_GetProductByBarcode",new{Barcode="sale"},commandType:CommandType.StoredProcedure);
    Check(availability.AvailableStockQuantity==0 && availability.IsExpired,"POS reports sellable stock from batch expiry rather than product metadata");
    Check((await Sale(1)).TransactionId<0,"expired batch stock cannot be sold");
    await c.ExecuteAsync("UPDATE dbo.InventoryBatches SET ExpiryDate=DATEADD(year,1,GETDATE()) WHERE ProductId=@product",new{product});
    var adjustmentQuantity=-(await c.ExecuteScalarAsync<int>("SELECT StockQuantity FROM dbo.Products WHERE Id=@product",new{product}));
    async Task<SpResult> Adjust(){await using var conn=await Connect(db);return await conn.QuerySingleAsync<SpResult>("sp_AdjustStock",new{ProductId=product,UserId=1,Adjustment=adjustmentQuantity,Reason="Test"},commandType:CommandType.StoredProcedure);}
    var adjustments=await Task.WhenAll(Adjust(),Adjust());
    Check(adjustments.Count(x=>x.Result>0)==1 && await c.ExecuteScalarAsync<int>("SELECT StockQuantity FROM dbo.Products WHERE Id=@product",new{product})==0,"concurrent stock adjustments cannot produce negative stock");
    // Validate migration against the original exported schema and all 201 original records.
    var legacy="PharmacySchemaTests_"+Guid.NewGuid().ToString("N");databases.Add(legacy);
    await using(var master=await Connect("master")) await master.ExecuteAsync($"CREATE DATABASE [{legacy}]");
    await using(var old=await Connect(legacy)) {
        var snapshotText=File.ReadAllText(Path.Combine(root,"04_SETUP_ALL_WITH_DATA.sql"));
        var schemaStart=snapshotText.IndexOf("CREATE TABLE",StringComparison.Ordinal);
        var proceduresStart=snapshotText.IndexOf("CREATE   PROCEDURE",StringComparison.Ordinal);
        var snapshot=DatabaseSynchronizer.Parse(snapshotText[schemaStart..proceduresStart],"original snapshot schema and data");
        var generator=new Sql160ScriptGenerator();
        foreach(var statement in snapshot.Batches.SelectMany(b=>b.Statements)) if(statement is CreateTableStatement or InsertStatement or SetIdentityInsertStatement or AlterTableAddTableElementStatement or PredicateSetStatement) {generator.GenerateScript(statement,out var sql);await old.ExecuteAsync(sql);}
        Check(await old.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Transactions")==32,"legacy snapshot loaded into isolated database");
    }
    await Sync(legacy).SynchronizeAsync(sandbox);await Sync(legacy).SynchronizeAsync(sandbox);
    await using(var old=await Connect(legacy)) Check(await old.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Transactions")==32 && await old.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.InventoryBatches")==31,"legacy upgrade preserves sales and backfills inventory batches");
    await using(var old=await Connect(legacy)) Check(await old.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Users")==5 && !BCrypt.Net.BCrypt.Verify("dev-admin-change-me",await old.ExecuteScalarAsync<string>("SELECT PasswordHash FROM dbo.Users WHERE Username='admin'")),"legacy users and existing admin password remain unchanged");
    await using(var receipts=await Connect(legacy)) {
        async Task<(int total,List<PharmacyApi.Models.TransactionDto> items)> ListReceipts(int page=1,string? search=null,string? status=null,DateTime? start=null,DateTime? end=null) {
            using var result=await receipts.QueryMultipleAsync("sp_GetReceipts",new {PageNumber=page,PageSize=5,Search=search,Status=status,StartDate=start,EndDate=end},commandType:CommandType.StoredProcedure);
            return (await result.ReadSingleAsync<int>(),(await result.ReadAsync<PharmacyApi.Models.TransactionDto>()).ToList());
        }
        var first=await ListReceipts();var nextPage=await ListReceipts(2);
        Check(first.total==32 && first.items.Count==5 && nextPage.total==32 && nextPage.items.Count==5 && !first.items.Select(t=>t.Id).Intersect(nextPage.items.Select(t=>t.Id)).Any(),"receipt browser includes all historical receipts with distinct pages");
        Check(first.items.Select(t=>t.TransactionDate).SequenceEqual(first.items.Select(t=>t.TransactionDate).OrderByDescending(t=>t)),"receipt browser sorts newest receipts first");
        foreach(var status in new[]{"Sale","Return","Voided"}) {
            var filtered=await ListReceipts(status:status);
            var expected=await receipts.ExecuteScalarAsync<int>(status=="Voided"?"SELECT COUNT(*) FROM dbo.Transactions WHERE IsVoided=1":"SELECT COUNT(*) FROM dbo.Transactions WHERE IsVoided=0 AND TransactionType=@status",new{status});
            Check(filtered.total==expected && filtered.items.All(t=>status=="Voided"?t.IsVoided:!t.IsVoided && t.TransactionType==status),"receipt browser filters "+status+" correctly");
        }
        var date=first.items[0].TransactionDate.Date;
        var daily=await ListReceipts(start:date,end:date);
        Check(daily.total==await receipts.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Transactions WHERE TransactionDate>=@date AND TransactionDate<DATEADD(day,1,@date)",new{date}) && daily.items.All(t=>t.TransactionDate.Date==date),"receipt date filter includes the entire selected day");
        await receipts.ExecuteAsync("UPDATE dbo.Transactions SET ReceiptNumber='TEST_%[' WHERE Id=@id",new{id=first.items[0].Id});
        var literal=await ListReceipts(search:"_%[");
        Check(literal.total==1 && literal.items.Single().ReceiptNumber=="TEST_%[","receipt search treats wildcard characters literally");
        var empty=await ListReceipts(search:"missing-receipt-xyz");
        Check(empty.total==0 && empty.items.Count==0,"receipt browser returns a count and empty page for unmatched search");
        using var detail=await receipts.QueryMultipleAsync("sp_GetTransactionById",new{TransactionId=first.items[0].Id},commandType:CommandType.StoredProcedure);
        var header=await detail.ReadSingleAsync<PharmacyApi.Models.TransactionDto>();var items=(await detail.ReadAsync<PharmacyApi.Models.TransactionItemDto>()).ToList();
        Check(header.ReceiptNumber=="TEST_%[" && items.Count>0 && header.TotalAmount==first.items[0].TotalAmount,"receipt detail retains the saved receipt totals and line items for reprint");
        Check(await receipts.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Transactions")==32,"viewing receipts never creates additional transactions");
    }
    Console.WriteLine($"{passed} database integration checks passed.");
}
finally {
    SqlConnection.ClearAllPools();
    await using var master=await Connect("master");
    foreach(var db in databases) {if(!db.StartsWith("PharmacySchemaTests_",StringComparison.Ordinal) || db.Length!=52)throw new Exception("Unexpected test database name.");await master.ExecuteAsync($"IF DB_ID('{db}') IS NOT NULL BEGIN ALTER DATABASE [{db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{db}]; END;");}
    if(Path.GetFileName(sandbox).StartsWith("PharmacySchemaTests_",StringComparison.Ordinal))Directory.Delete(sandbox,true);
}
sealed class SpResult {public int Result {get;set;} public string Message {get;set;}="";}
sealed class SessionResult {public int SessionId{get;set;} public string Message{get;set;}="";}
sealed class TxResult {public int TransactionId{get;set;} public string Message{get;set;}="";}
sealed class Moving {public int QuantitySold{get;set;}}
sealed class Availability {public int AvailableStockQuantity{get;set;}public bool IsExpired{get;set;}}
sealed class BootstrapUser {public string Username{get;set;}="";public string PasswordHash{get;set;}="";public string Role{get;set;}="";public bool IsActive{get;set;}}
