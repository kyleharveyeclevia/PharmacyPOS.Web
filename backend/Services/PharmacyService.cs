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
        Task<List<SessionSummaryDto>> GetSessionsAsync(DateTime date);
        Task<List<UserDto>>         GetUsersAsync();
        Task<(bool ok, string msg)> CreateUserAsync(CreateUserRequest req);
        Task<(bool ok, string msg)> UpdateUserAsync(int id, UpdateUserRequest req);
        Task<(bool ok, string msg)> ToggleUserAsync(int id, int currentUserId);
    }

    public class PharmacyService : IPharmacyService
    {
        private readonly IDbConnectionFactory _db;
        private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = null };
        private static int _receiptCounter = 1;
        private static readonly object _lock = new();
        private string NextReceipt() { lock (_lock) return $"RCP-{DateTime.Now:yyyyMMdd}-{_receiptCounter++:D4}"; }

        public PharmacyService(IDbConnectionFactory db) => _db = db;

        // ── PRODUCTS ─────────────────────────────────────────────────────────
        public async Task<List<ProductDto>> GetAllProductsAsync()
        {
            using var c = _db.Create();
            return (await c.QueryAsync<ProductDto>("sp_GetAllProducts", commandType: CommandType.StoredProcedure)).ToList();
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
            using var c = _db.Create();
            SpResult r;
            if (isNew)
                r = await c.QueryFirstAsync<SpResult>("sp_AddProduct", new {
                    req.Barcode, req.Name, req.GenericName, req.Description, req.Unit,
                    req.CategoryId, req.SupplierId, req.CostPrice, req.SellingPrice,
                    req.StockQuantity, req.ReorderLevel, req.RequiresPrescription, req.ExpiryDate
                }, commandType: CommandType.StoredProcedure);
            else
                r = await c.QueryFirstAsync<SpResult>("sp_UpdateProduct", new {
                    req.Id, req.Barcode, req.Name, req.GenericName, req.Description, req.Unit,
                    req.CategoryId, req.SupplierId, req.CostPrice, req.SellingPrice,
                    req.ReorderLevel, req.RequiresPrescription, req.IsActive, req.ExpiryDate
                }, commandType: CommandType.StoredProcedure);
            return (r.Result > 0, r.Message, r.Result > 0 ? r.Result : 0);
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
            return (await c.QueryAsync<MovingItemsDto>("sp_GetFastMovingItemByDateRange",
                new { StartDate = start.Date, EndDate = end.Date }, commandType: CommandType.StoredProcedure)).ToList();
        }

        public async Task<List<MovingItemsDto>> GetSlowMovingItemsAsync(DateTime start, DateTime end)
        {
            using var c = _db.Create();
            return (await c.QueryAsync<MovingItemsDto>("sp_GetSlowMovingItemsByDateRange",
                new { StartDate = start.Date, EndDate = end.Date }, commandType: CommandType.StoredProcedure)).ToList();
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
