using System.Data;
using System.Text.Json;
using Dapper;
using PharmacyApi.Data;
using PharmacyApi.Models;

namespace PharmacyApi.Services
{
    public interface IPharmacyService
    {
        Task<List<ProductDto>>  GetAllProductsAsync();
        Task<List<ProductDto>>  SearchProductsAsync(string query);
        Task<ProductDto?>       GetProductByBarcodeAsync(string barcode);
        Task<List<ProductDto>>  GetLowStockProductsAsync();
        Task<(bool ok, string msg, int id)> SaveProductAsync(SaveProductRequest req, bool isNew);
        Task<(bool ok, string msg)>         AdjustStockAsync(int productId, int userId, int adjustment, string reason);
        Task<(bool ok, string msg)>         ToggleProductAsync(SaveProductRequest req);
        Task<List<CategoryDto>> GetCategoriesAsync();
        Task<List<SupplierDto>> GetSuppliersAsync();
        Task<List<CustomerDto>> GetCustomersAsync();
        Task<(bool ok, string msg, int txId, string receipt)> ProcessSaleAsync(ProcessSaleRequest req, int userId, int sessionId);
        Task<(bool ok, string msg)>           VoidTransactionAsync(int txId, string reason);
        Task<(bool ok, string msg, int txId)> ProcessReturnAsync(int originalId, ReturnRequest req, int userId, int sessionId);
        Task<TransactionDto?>       GetTransactionAsync(int id);
        Task<TransactionDto?>       GetTransactionByReceiptAsync(string receipt);
        Task<List<TransactionDto>>  GetTransactionsByRangeAsync(DateTime start, DateTime end);
        Task<XReadDto>              GenerateXReadAsync(int sessionId);
        Task<ZReadDto>              GenerateZReadAsync(int sessionId, decimal closingCash);
        Task<DashboardDto>          GetDashboardAsync();
        Task<SalesSummaryDto>       GetSalesSummaryAsync(DateTime start, DateTime end);
        Task<List<MovingItemsDto>>  GetFastMovingItemsAsync(DateTime start, DateTime end);
        Task<List<MovingItemsDto>>  GetSlowMovingItemsAsync(DateTime start, DateTime end);
        Task<PagedResult<MovingItemsDto>> GetSlowMovingItemsWithOffsetAsync(DateTime start, DateTime end, int pageNumber, int pageSize);
        Task<PagedResult<MovingItemsDto>> GetFastMovingItemsWithOffsetAsync(DateTime start, DateTime end, int pageNumber, int pageSize);
        Task<List<SessionSummaryDto>> GetSessionsAsync(DateTime date);
        Task<List<UserDto>>         GetUsersAsync();
        Task<(bool ok, string msg)> CreateUserAsync(CreateUserRequest req);
        Task<(bool ok, string msg)> UpdateUserAsync(int id, UpdateUserRequest req);
        Task<(bool ok, string msg)> ToggleUserAsync(int id, int currentUserId);
        Task<ProductImportResult> ImportProductsAsync(IFormFile file,int userId);
    }

    public class PharmacyService : IPharmacyService
    {
        private readonly IDbConnectionFactory _db;
        private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = null };
        private static int _receiptCounter = 1;
        private static readonly object _lock = new();
        private readonly ILogger<PharmacyService> _logger;
        private string NextReceipt() { lock (_lock) return $"RCP-{DateTime.Now:yyyyMMdd}-{_receiptCounter++:D4}"; }

        public PharmacyService(IDbConnectionFactory db, ILogger<PharmacyService> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ── PRODUCTS ─────────────────────────────────────────────────────────
        public async Task<List<ProductDto>> GetAllProductsAsync()
        {
            using var c = _db.Create();

            var result = (await c.QueryAsync<ProductDto>("sp_GetAllProducts", commandType: CommandType.StoredProcedure)).ToList();
            
            return result;
        }
        public async Task<List<ProductDto>> SearchProductsAsync(string query)
        {
            using var c = _db.Create();
            return (await c.QueryAsync<ProductDto>("sp_SearchProducts", new { Query=query }, commandType: CommandType.StoredProcedure)).ToList();
        }
        public async Task<ProductDto?> GetProductByBarcodeAsync(string barcode)
        {
            using var c = _db.Create();
            return await c.QueryFirstOrDefaultAsync<ProductDto>("sp_GetProductByBarcode", new { Barcode=barcode }, commandType: CommandType.StoredProcedure);
        }
        public async Task<List<ProductDto>> GetLowStockProductsAsync()
        {
            using var c = _db.Create();
            return (await c.QueryAsync<ProductDto>("sp_GetLowStockProducts", commandType: CommandType.StoredProcedure)).ToList();
        }
        public async Task<(bool ok, string msg, int id)> SaveProductAsync(SaveProductRequest req, bool isNew)
        {
            string action = isNew ? "Add Product" : "Edit Product";

            _logger.LogInformation($"[SaveProductAsync] {action} started...");

            SpResult r = new SpResult { Result = -1, Message="No Actions"};
           
            try
            {
                using var c = _db.Create();

                if (isNew)
                    r = await c.QueryFirstAsync<SpResult>("sp_AddProduct", new
                    {
                        req.Barcode,
                        req.Name,
                        req.BrandName,
                        req.GenericName,
                        req.Description,
                        req.DosageStrength,
                        req.Unit,
                        req.CategoryId,
                        req.SupplierId,
                        req.CostPrice,
                        req.SellingPrice,
                        req.StockQuantity,
                        req.ReorderLevel,
                        req.RequiresPrescription,
                        req.ExpiryDate,
                        req.BatchNo
                    }, commandType: CommandType.StoredProcedure);
                else
                    r = await c.QueryFirstAsync<SpResult>("sp_UpdateProduct", new
                    {
                        req.Id,
                        req.Barcode,
                        req.Name,
                        req.BrandName,
                        req.GenericName,
                        req.Description,
                        req.DosageStrength,
                        req.Unit,
                        req.CategoryId,
                        req.SupplierId,
                        req.CostPrice,
                        req.SellingPrice,
                        req.ReorderLevel,
                        req.RequiresPrescription,
                        req.IsActive,
                        req.ExpiryDate,
                        req.BatchNo
                    }, commandType: CommandType.StoredProcedure);
            }
            catch (Exception ex)
            {
                _logger.LogError($"[SaveProductAsync] {action} started...");
            }
            

            return (r.Result > 0, r.Message, r.Result > 0 ? r.Result : 0);
        }

        public async Task<ProductImportResult> ImportProductsAsync(IFormFile file,int userId)
        {
            _logger.LogInformation("[ImportProductsAsync] Import Products Started");

            using var c = _db.Create();

            var result = new ProductImportResult();

            List<ProductDto> rows = await ParseCsvAsync(file);

            var categories = await GetCategoriesAsync();

            var suppliers = await GetSuppliersAsync();

            try
            {
                // Parse file

                foreach (var row in rows)
                {
                    try
                    {
                        // Validation
                        if (string.IsNullOrWhiteSpace(row.Barcode))
                        {
                            result.FailedItems.Add(new ImportFailedItem
                            {
                                Barcode = row.Barcode,
                                Name = row.Name,
                                Error = "Barcode is required."
                            });

                            continue;
                        }

                        if(!categories.Any(category => category.Name == row.CategoryName))
                        {
                            result.FailedItems.Add(new ImportFailedItem
                            {
                                Barcode = row.Barcode,
                                Name = row.Name,
                                Error = $"Category {row.CategoryName} does not exists"
                            });

                            continue;
                        }

                        if(!string.IsNullOrEmpty(row.SupplierName))
                        {
                            if (!suppliers.Any(supplier => supplier.Name == row.SupplierName))
                            {
                                result.FailedItems.Add(new ImportFailedItem
                                {
                                    Barcode = row.Barcode,
                                    Name = row.Name,
                                    Error = $"Supplier {row.SupplierName} does not exists"
                                });

                                continue;
                            }
                        }

                        row.CategoryId = categories.First(c => c.Name == row.CategoryName).Id;

                        row.SupplierId = suppliers.First(c => c.Name == row.SupplierName).Id;
                            

                        // Save product
                        SpResult r = await c.QueryFirstAsync<SpResult>("sp_AddProduct", new
                        {
                            row.Barcode,
                            row.Name,
                            row.BrandName,
                            row.GenericName,
                            row.Description,
                            row.DosageStrength,
                            row.Unit,
                            row.CategoryId,
                            row.SupplierId,
                            row.CostPrice,
                            row.SellingPrice,
                            row.StockQuantity,
                            row.ReorderLevel,
                            row.RequiresPrescription,
                            row.ExpiryDate,
                            row.BatchNo
                        }, commandType: CommandType.StoredProcedure);

                        if(r.Result > 0)
                        {
                            result.SuccessItems.Add(new ImportSuccessItem
                            {
                                Barcode = row.Barcode,
                                Name = row.Name
                            });
                        }

                        else
                        {
                            result.FailedItems.Add(new ImportFailedItem
                            {
                                Barcode = row.Barcode,
                                Name = row.Name,
                                Error = r.Message
                            });

                            _logger.LogError($"[ImportProductsAsync] Import Products Failed 1: {r.Message}");
                        }

                       
                    }
                    catch (Exception ex)
                    {
                        result.FailedItems.Add(new ImportFailedItem
                        {
                            Barcode = row.Barcode,
                            Name = row.Name,
                            Error = ex.Message
                        });

                        _logger.LogInformation($"[ImportProductsAsync] Import Products Failed 2: {ex.Message}");
                    }
                }

                result.SuccessCount = result.SuccessItems.Count;
                result.FailedCount = result.FailedItems.Count;

                return result;
            }

            catch (Exception ex)
            {
                _logger.LogInformation($"[ImportProductsAsync] Import Products Failed 3: {ex.Message}");

                result.FailedItems.Add(new ImportFailedItem
                {
                    Barcode = string.Empty,
                    Name = string.Empty,
                    Error = ex.Message
                });

                result.SuccessCount = 0;
                result.FailedCount = 1;

                return result;
            }
        }

        public async Task<(bool ok, string msg)> AdjustStockAsync(int productId, int userId, int adjustment, string reason)
        {
            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SpResult>("sp_AdjustStock",
                new { ProductId=productId, UserId=userId, Adjustment=adjustment, Reason=reason },
                commandType: CommandType.StoredProcedure);
            return (r.Result > 0, r.Message);
        }
        public async Task<(bool ok, string msg)> ToggleProductAsync(SaveProductRequest req)
        {
            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SpResult>("sp_UpdateProduct", new {
                req.Id, req.Barcode, req.Name, req.GenericName, req.Description, req.Unit,
                req.CategoryId, req.SupplierId, req.CostPrice, req.SellingPrice,
                req.ReorderLevel, req.RequiresPrescription,
                IsActive = !req.IsActive,
                req.ExpiryDate
            }, commandType: CommandType.StoredProcedure);
            return (r.Result > 0, r.Message);
        }

        // ── LOOKUPS ───────────────────────────────────────────────────────────
        public async Task<List<CategoryDto>> GetCategoriesAsync()
        { using var c=_db.Create(); return (await c.QueryAsync<CategoryDto>("sp_GetCategories", commandType: CommandType.StoredProcedure)).ToList(); }
        public async Task<List<SupplierDto>> GetSuppliersAsync()
        { using var c=_db.Create(); return (await c.QueryAsync<SupplierDto>("sp_GetSuppliers", commandType: CommandType.StoredProcedure)).ToList(); }
        public async Task<List<CustomerDto>> GetCustomersAsync()
        { using var c=_db.Create(); return (await c.QueryAsync<CustomerDto>("sp_GetCustomers", commandType: CommandType.StoredProcedure)).ToList(); }

        // ── SALE ─────────────────────────────────────────────────────────────
        public async Task<(bool ok, string msg, int txId, string receipt)> ProcessSaleAsync(ProcessSaleRequest req, int userId, int sessionId)
        {
            decimal sub = req.Items.Sum(i => i.Quantity * i.UnitPrice);
            decimal disc, vat, vatPct, total;
            if (req.IsScPwd)
            {
                var x = sub / 1.12m;
                disc = x * 0.20m; vat = 0m; vatPct = 0m; total = x - disc;
            }
            else
            {
                disc = sub * (req.DiscountPercent / 100m);
                vat  = (sub - disc) / 1.12m * 0.12m; vatPct = 12m; total = sub - disc;
            }
            decimal change = req.AmountTendered - total;
            if (change < 0) return (false, "Insufficient payment.", 0, "");

            decimal effDiscPct = req.IsScPwd
                ? (sub > 0 ? Math.Round(disc / sub * 100m, 2) : 0) : req.DiscountPercent;

            var receipt = NextReceipt();
            var json    = JsonSerializer.Serialize(req.Items.Select(i => new { i.ProductId, i.Quantity, i.UnitPrice }), _json);

            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SaleResult>("sp_ProcessSale", new {
                ReceiptNumber=receipt, SessionId=sessionId, UserId=userId, CustomerId=req.CustomerId,
                SubTotal=sub, DiscountAmount=disc, DiscountPercent=effDiscPct,
                VatAmount=vat, //VatPercent=vatPct, 
                TotalAmount=total,
                AmountTendered=req.AmountTendered, 
                Change=change,
                PaymentMethod=req.PaymentMethod, PrescriptionNumber=req.PrescriptionNumber,
                Notes=req.Notes, ItemsJson=json
            }, commandType: CommandType.StoredProcedure);
            return (r.TransactionId > 0, r.Message, r.TransactionId, receipt);
        }
        public async Task<(bool ok, string msg)> VoidTransactionAsync(int txId, string reason)
        {
            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SpResult>("sp_VoidTransaction", new { TransactionId=txId, Reason=reason }, commandType: CommandType.StoredProcedure);
            return (r.Result > 0, r.Message);
        }
        public async Task<(bool ok, string msg, int txId)> ProcessReturnAsync(int originalId, ReturnRequest req, int userId, int sessionId)
        {
            var json = JsonSerializer.Serialize(req.Items.Select(i => new { i.ProductId, i.Quantity, i.UnitPrice }), _json);
            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SaleResult>("sp_ProcessReturn", new {
                OriginalTransactionId=originalId, ReceiptNumber=$"RTN-{NextReceipt()}",
                SessionId=sessionId, UserId=userId, Reason=req.Reason, ItemsJson=json
            }, commandType: CommandType.StoredProcedure);
            return (r.TransactionId > 0, r.Message, r.TransactionId);
        }

        // ── QUERIES ───────────────────────────────────────────────────────────
        public async Task<TransactionDto?> GetTransactionAsync(int id)
        {
            using var c = _db.Create();
            using var m = await c.QueryMultipleAsync("sp_GetTransactionById", new { TransactionId=id }, commandType: CommandType.StoredProcedure);
            var hdr = await m.ReadFirstOrDefaultAsync<TransactionDto>();
            if (hdr != null) hdr.Items = (await m.ReadAsync<TransactionItemDto>()).ToList();
            return hdr;
        }
        public async Task<TransactionDto?> GetTransactionByReceiptAsync(string receipt)
        {
            using var c = _db.Create();
            using var m = await c.QueryMultipleAsync("sp_GetTransactionByReceipt", new { ReceiptNumber=receipt }, commandType: CommandType.StoredProcedure);
            var hdr = await m.ReadFirstOrDefaultAsync<TransactionDto>();
            if (hdr != null) hdr.Items = (await m.ReadAsync<TransactionItemDto>()).ToList();
            return hdr;
        }
        public async Task<List<TransactionDto>> GetTransactionsByRangeAsync(DateTime start, DateTime end)
        {
            using var c = _db.Create();
            return (await c.QueryAsync<TransactionDto>("sp_GetTransactionsByDateRange",
                new { StartDate=start.Date, EndDate=end.Date }, commandType: CommandType.StoredProcedure)).ToList();
        }

        // ── REPORTS ───────────────────────────────────────────────────────────
        public async Task<XReadDto> GenerateXReadAsync(int sessionId)
        {
            using var c = _db.Create();
            using var m = await c.QueryMultipleAsync("sp_GetXReadData", new { SessionId=sessionId }, commandType: CommandType.StoredProcedure);
            var sess = await m.ReadFirstAsync<XReadSession>();
            var sum  = await m.ReadFirstAsync<XReadSummary>();
            var itm  = await m.ReadFirstAsync<XReadItems>();
            return new XReadDto {
                SessionId=sess.SessionId, Cashier=sess.CashierName, Terminal=sess.Terminal,
                GeneratedAt=DateTime.Now, SessionStart=sess.LoginTime,
                TotalTransactions=sum.TotalTransactions, GrossSales=sum.GrossSales,
                TotalDiscount=sum.TotalDiscount, TotalVat=sum.TotalVat, NetSales=sum.NetSales,
                CashSales=sum.CashSales, CardSales=sum.CardSales, GCashSales=sum.GCashSales,
                PhilHealthSales=sum.PhilHealthSales, RefundAmount=sum.RefundAmount,
                VoidAmount=sum.VoidAmount, ItemsSold=itm.ItemsSold
            };
        }
        public async Task<ZReadDto> GenerateZReadAsync(int sessionId, decimal closingCash)
        {
            using var c = _db.Create();
            using var m = await c.QueryMultipleAsync("sp_GetZReadData", new { SessionId=sessionId, ClosingCash=closingCash }, commandType: CommandType.StoredProcedure);
            var sess   = await m.ReadFirstAsync<ZReadSession>();
            var sum    = await m.ReadFirstAsync<ZReadSummary>();
            var hourly = (await m.ReadAsync<HourlySalesDto>()).ToList();
            var top    = (await m.ReadAsync<TopProductDto>()).ToList();
            decimal expected = sess.OpeningCash + sum.CashSales - sum.RefundAmount;
            return new ZReadDto {
                SessionId=sess.SessionId, Cashier=sess.CashierName, Terminal=sess.Terminal,
                GeneratedAt=DateTime.Now, SessionStart=sess.LoginTime, SessionEnd=DateTime.Now,
                TotalTransactions=sum.TotalTransactions, GrossSales=sum.GrossSales,
                TotalDiscount=sum.TotalDiscount, TotalVat=sum.TotalVat, NetSales=sum.NetSales,
                CashSales=sum.CashSales, CardSales=sum.CardSales, GCashSales=sum.GCashSales,
                PhilHealthSales=sum.PhilHealthSales, RefundAmount=sum.RefundAmount,
                VoidAmount=sum.VoidAmount, ItemsSold=sum.ItemsSold,
                OpeningCash=sess.OpeningCash, ClosingCash=closingCash,
                ExpectedCash=expected, CashVariance=closingCash-expected,
                HourlySales=hourly, TopProducts=top
            };
        }
        public async Task<DashboardDto> GetDashboardAsync()
        {
            using var c = _db.Create();
            using var m = await c.QueryMultipleAsync("sp_GetDashboardStats", commandType: CommandType.StoredProcedure);
            var sum      = await m.ReadFirstAsync<DashboardSummary>();
            var low      = await m.ReadFirstAsync<LowCountRow>();
            var recent   = (await m.ReadAsync<TransactionDto>()).ToList();
            var lowItems = (await m.ReadAsync<ProductDto>()).ToList();
            return new DashboardDto {
                TodaySales=sum.TodaySales, TodayTransactions=sum.TodayTransactions,
                AvgTransaction=sum.AvgTransaction, LowStockCount=low.LowStockCount,
                RecentTransactions=recent, LowStockItems=lowItems
            };
        }
        public async Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime start, DateTime end)
        {
            using var c = _db.Create();
            return await c.QueryFirstAsync<SalesSummaryDto>("sp_GetSalesSummaryByDateRange",
                new { StartDate=start.Date, EndDate=end.Date }, commandType: CommandType.StoredProcedure);
        }

        public async Task<List<MovingItemsDto>> GetFastMovingItemsAsync(DateTime start, DateTime end)
        {
            using var c = _db.Create();
            return (await c.QueryAsync<MovingItemsDto>("sp_GetFastMovingItemsByDateRange",
                new { StartDate = start.Date, EndDate = end.Date }, commandType: CommandType.StoredProcedure)).ToList();
        }

        public async Task<List<MovingItemsDto>> GetSlowMovingItemsAsync(DateTime start, DateTime end)
        {
            using var c = _db.Create();
            return (await c.QueryAsync<MovingItemsDto>("sp_GetSlowMovingItemsByDateRange",
                new { StartDate = start.Date, EndDate = end.Date }, commandType: CommandType.StoredProcedure)).ToList();
        }

        public async Task<PagedResult<MovingItemsDto>> GetSlowMovingItemsWithOffsetAsync(DateTime start,DateTime end,int pageNumber,int pageSize)
        {
            using var c = _db.Create();

            var items = (await c.QueryAsync<MovingItemsDto>(
                "sp_GetSlowMovingItemsByDateRangeWithOffset",
                new
                {
                    StartDate = start.Date,
                    EndDate = end.Date,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                },
                commandType: CommandType.StoredProcedure))
                .ToList();
            var pageResult = new PagedResult<MovingItemsDto>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,

                // Temporary until total count is added
                TotalRecords = items.Count == 0 ? 0 : items[0].TotalRecords,
                TotalPages = 1
            };

            return pageResult;
        }

        public async Task<PagedResult<MovingItemsDto>> GetFastMovingItemsWithOffsetAsync(DateTime start, DateTime end, int pageNumber, int pageSize)
        {
            using var c = _db.Create();

            var items = (await c.QueryAsync<MovingItemsDto>(
                "sp_GetFastMovingItemsByDateRangeWithOffset",
                new
                {
                    StartDate = start.Date,
                    EndDate = end.Date,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                },
                commandType: CommandType.StoredProcedure))
                .ToList();
            var pageResult = new PagedResult<MovingItemsDto>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,

                // Temporary until total count is added
                TotalRecords = items.Count == 0 ? 0 : items[0].TotalRecords,
                TotalPages = 1
            };

            return pageResult;
        }

        public async Task<List<SessionSummaryDto>> GetSessionsAsync(DateTime date)
        {
            using var c = _db.Create();
            return (await c.QueryAsync<SessionSummaryDto>("sp_GetSessionsByDate",
                new { Date=date.Date }, commandType: CommandType.StoredProcedure)).ToList();
        }

        // ── USERS ─────────────────────────────────────────────────────────────
        public async Task<List<UserDto>> GetUsersAsync()
        { using var c=_db.Create(); return (await c.QueryAsync<UserDto>("sp_GetAllUsers", commandType: CommandType.StoredProcedure)).ToList(); }
        public async Task<(bool ok, string msg)> CreateUserAsync(CreateUserRequest req)
        {
            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SpResult>("sp_CreateUser", new {
                req.Username, PasswordHash=BCrypt.Net.BCrypt.HashPassword(req.Password),
                req.FullName, req.Email, req.Phone, req.Role
            }, commandType: CommandType.StoredProcedure);
            return (r.Result > 0, r.Message);
        }
        public async Task<(bool ok, string msg)> UpdateUserAsync(int id, UpdateUserRequest req)
        {
            using var c = _db.Create();
            if (!string.IsNullOrEmpty(req.NewPassword))
                await c.ExecuteAsync("sp_UpdateUserPassword",
                    new { UserId=id, PasswordHash=BCrypt.Net.BCrypt.HashPassword(req.NewPassword) },
                    commandType: CommandType.StoredProcedure);
            var r = await c.QueryFirstAsync<SpResult>("sp_UpdateUser",
                new { UserId=id, req.FullName, req.Email, req.Phone, req.Role },
                commandType: CommandType.StoredProcedure);
            return (r.Result > 0, r.Message);
        }
        public async Task<(bool ok, string msg)> ToggleUserAsync(int id, int currentUserId)
        {
            using var c = _db.Create();
            var r = await c.QueryFirstAsync<SpResult>("sp_ToggleUserStatus",
                new { UserId=id, CurrentUserId=currentUserId }, commandType: CommandType.StoredProcedure);
            return (r.Result >= 0, r.Message);
        }

        private async Task<List<ProductDto>> ParseCsvAsync(IFormFile file)
        {
            var products = new List<ProductDto>();

            using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream);

            // Read header
            var header = await reader.ReadLineAsync();

            if (string.IsNullOrWhiteSpace(header))
                return products;

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();

                if (string.IsNullOrWhiteSpace(line))
                    continue;

                var cols = line.Split(',');

                // Expected CSV order:
                // 0 Barcode
                // 1 Name
                // 2 BrandName
                // 3 GenericName
                // 4 Description
                // 5 DosageStrength
                // 6 Unit
                // 7 Category Name
                // 8 Supplier Name
                // 9 CostPrice
                // 10 SellingPrice
                // 11 StockQuantity
                // 12 ReorderLevel
                // 13 RequiresPrescription
                // 14 ExpiryDate
                // 15 BatchNo

                var product = new ProductDto
                {
                    Id = 0,
                    Barcode = cols.ElementAtOrDefault(0) ?? "",
                    Name = cols.ElementAtOrDefault(1) ?? "",
                    BrandName = cols.ElementAtOrDefault(2) ?? "",
                    GenericName = cols.ElementAtOrDefault(3) ?? "",
                    Description = cols.ElementAtOrDefault(4) ?? "",
                    DosageStrength = cols.ElementAtOrDefault(5) ?? "",
                    Unit = cols.ElementAtOrDefault(6) ?? "pcs",

                    //CategoryId = int.TryParse(cols.ElementAtOrDefault(7), out var catId) ? catId : 0,
                    //SupplierId = int.TryParse(cols.ElementAtOrDefault(8), out var supId) ? supId : null,
                    CategoryName = cols.ElementAtOrDefault(7) ?? "",
                    SupplierName = cols.ElementAtOrDefault(8),

                    CostPrice = decimal.TryParse(cols.ElementAtOrDefault(9), out var cost) ? cost : 0,
                    SellingPrice = decimal.TryParse(cols.ElementAtOrDefault(10), out var sell) ? sell : 0,

                    StockQuantity = int.TryParse(cols.ElementAtOrDefault(11), out var qty) ? qty : 0,
                    ReorderLevel = int.TryParse(cols.ElementAtOrDefault(12), out var reorder) ? reorder : 10,

                    RequiresPrescription = bool.TryParse(cols.ElementAtOrDefault(13), out var rx) && rx,

                    ExpiryDate = DateTime.TryParse(cols.ElementAtOrDefault(14), out var exp)
                        ? exp
                        : null,

                    BatchNo = cols.ElementAtOrDefault(15) ?? "",

                    IsActive = true
                };

                products.Add(product);
            }

            return products;
        }

        // ── PRIVATE TYPED RESULT ROWS ─────────────────────────────────────────
        private class SpResult   { public int Result{get;set;} public string Message{get;set;}=""; }
        private class SaleResult { public int TransactionId{get;set;} public string Message{get;set;}=""; }

        private class XReadSession { public int SessionId{get;set;} public DateTime LoginTime{get;set;} public string Terminal { get; set; } = ""; public decimal OpeningCash{get;set;} public string CashierName{get;set;}=""; }
        private class XReadSummary { public int TotalTransactions{get;set;} public decimal GrossSales{get;set;} public decimal TotalDiscount{get;set;} public decimal TotalVat{get;set;} public decimal NetSales{get;set;} public decimal CashSales{get;set;} public decimal CardSales{get;set;} public decimal GCashSales{get;set;} public decimal PhilHealthSales{get;set;} public decimal RefundAmount{get;set;} public decimal VoidAmount{get;set;} }
        private class XReadItems   { public int ItemsSold{get;set;} }
        private class ZReadSession { public int SessionId{get;set;} public DateTime LoginTime{get;set;} public string Terminal { get; set; } = ""; public decimal OpeningCash{get;set;} public string CashierName{get;set;}=""; }
        private class ZReadSummary : XReadSummary { public int ItemsSold{get;set;} }
        private class DashboardSummary { public decimal TodaySales{get;set;} public int TodayTransactions{get;set;} public decimal AvgTransaction{get;set;} }
        private class LowCountRow { public int LowStockCount{get;set;} }
    }
}
