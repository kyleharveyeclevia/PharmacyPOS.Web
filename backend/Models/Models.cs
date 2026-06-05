namespace PharmacyApi.Models
{
    // ── AUTH ─────────────────────────────────────────────────────────────────
    public record LoginRequest(string Username, string Password, Guid TerminalGuid);
    public record LoginResponse(string Token, string FullName, string Username,
                                string Role, int UserId, int SessionId);
    public record LogoutRequest(decimal ClosingCash);
    public record TerminalActivateRequest(string TerminalCode);

    public record TerminalActivateResponse(
    int TerminalId,
    Guid TerminalGuid,
    string TerminalCode,
    string TerminalName,
    int BranchId
);

    // ── USER ─────────────────────────────────────────────────────────────────
    public class UserDto
    {
        public int       Id        { get; set; }
        public string    Username  { get; set; } = "";
        public string    FullName  { get; set; } = "";
        public string    Email     { get; set; } = "";
        public string    Phone     { get; set; } = "";
        public string    Role      { get; set; } = "Cashier";
        public bool      IsActive  { get; set; }
        public DateTime  CreatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
    }
    public class CreateUserRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email    { get; set; } = "";
        public string Phone    { get; set; } = "";
        public string Role     { get; set; } = "Cashier";
    }
    public class UpdateUserRequest
    {
        public string  FullName    { get; set; } = "";
        public string  Email       { get; set; } = "";
        public string  Phone       { get; set; } = "";
        public string  Role        { get; set; } = "Cashier";
        public string? NewPassword { get; set; }
    }

    // ── PRODUCT ──────────────────────────────────────────────────────────────
    public class ProductDto
    {
        public int       Id                   { get; set; }
        public string    Barcode              { get; set; } = "";
        public string    Name                 { get; set; } = "";
        public string    GenericName          { get; set; } = "";
        public string    Description          { get; set; } = "";
        public string    Unit                 { get; set; } = "pcs";
        public int       CategoryId           { get; set; }
        public string    CategoryName         { get; set; } = "";
        public int?      SupplierId           { get; set; }
        public string?   SupplierName         { get; set; }
        public decimal   CostPrice            { get; set; }
        public decimal   SellingPrice         { get; set; }
        public int       StockQuantity        { get; set; }
        public int       ReorderLevel         { get; set; }
        public bool      RequiresPrescription { get; set; }
        public bool      IsActive             { get; set; }
        public DateTime? ExpiryDate           { get; set; }
        public bool      IsLowStock           { get; set; }
        public bool      IsExpired            { get; set; }
        public bool      IsExpiringSoon       { get; set; }
    }
    public class SaveProductRequest
    {
        public int       Id                   { get; set; }
        public string    Barcode              { get; set; } = "";
        public string    Name                 { get; set; } = "";
        public string    GenericName          { get; set; } = "";
        public string    Description          { get; set; } = "";
        public string    Unit                 { get; set; } = "pcs";
        public int       CategoryId           { get; set; }
        public int?      SupplierId           { get; set; }
        public decimal   CostPrice            { get; set; }
        public decimal   SellingPrice         { get; set; }
        public int       StockQuantity        { get; set; }
        public int       ReorderLevel         { get; set; } = 10;
        public bool      RequiresPrescription { get; set; }
        public bool      IsActive             { get; set; } = true;
        public DateTime? ExpiryDate           { get; set; }
    }
    public record AdjustStockRequest(int Adjustment, string Reason);

    // ── LOOKUPS ───────────────────────────────────────────────────────────────
    public class CategoryDto { public int Id{get;set;} public string Name { get; set; } = ""; public string Description{get;set;}=""; }
    public class SupplierDto  { public int Id{get;set;} public string Name { get; set; } = ""; public string Phone{get;set;}=""; }
    public class CustomerDto
    {
        public int     Id              { get; set; }
        public string  Name            { get; set; } = "";
        public string  Phone           { get; set; } = "";
        public bool    IsSeniorCitizen { get; set; }
        public bool    IsPWD           { get; set; }
        public string? SCPWDId         { get; set; }
    }

    // ── SALE ──────────────────────────────────────────────────────────────────
    public class CartItemDto
    {
        public int     ProductId            { get; set; }
        public string  ProductName          { get; set; } = "";
        public string  Barcode              { get; set; } = "";
        public int     Quantity             { get; set; }
        public decimal UnitPrice            { get; set; }
        public bool    RequiresPrescription { get; set; }
        public decimal LineTotal            { get; set; }
    }
    public class ProcessSaleRequest
    {
        public List<CartItemDto> Items              { get; set; } = new();
        public int?              CustomerId         { get; set; }
        public string            PaymentMethod      { get; set; } = "Cash";
        public decimal           AmountTendered     { get; set; }
        public decimal           DiscountPercent    { get; set; }
        public bool              IsScPwd            { get; set; }
        public string?           PrescriptionNumber { get; set; }
        public string?           Notes              { get; set; }
    }
    public record VoidRequest(string Reason);
    public class ReturnRequest
    {
        public List<CartItemDto> Items  { get; set; } = new();
        public string            Reason { get; set; } = "";
    }

    // ── TRANSACTION ───────────────────────────────────────────────────────────
    public class TransactionDto
    {
        public int      Id                 { get; set; }
        public string   ReceiptNumber      { get; set; } = "";
        public int      SessionId          { get; set; }
        public int      UserId             { get; set; }
        public string   CashierName        { get; set; } = "";
        public int?     CustomerId         { get; set; }
        public string?  CustomerName       { get; set; }
        public DateTime TransactionDate    { get; set; }
        public string   TransactionType    { get; set; } = "Sale";
        public decimal  SubTotal           { get; set; }
        public decimal  DiscountAmount     { get; set; }
        public decimal  DiscountPercent    { get; set; }
        public decimal  VatAmount          { get; set; }
        public decimal  VatPercent         { get; set; }
        public decimal  TotalAmount        { get; set; }
        public decimal  AmountTendered     { get; set; }
        public decimal  Change             { get; set; }
        public string   PaymentMethod      { get; set; } = "Cash";
        public string?  PrescriptionNumber { get; set; }
        public bool     IsVoided           { get; set; }
        public string?  VoidReason         { get; set; }
        public List<TransactionItemDto> Items { get; set; } = new();
    }
    public class TransactionItemDto
    {
        public int     Id             { get; set; }
        public int     ProductId      { get; set; }
        public string  ProductName    { get; set; } = "";
        public string  ProductBarcode { get; set; } = "";
        public int     Quantity       { get; set; }
        public decimal UnitPrice      { get; set; }
        public decimal LineTotal      { get; set; }
    }

    // ── REPORTS ───────────────────────────────────────────────────────────────
    public class XReadDto
    {
        public int      SessionId         { get; set; }
        public string   Cashier           { get; set; } = "";
        public string   Terminal          { get; set; } = "";
        public DateTime GeneratedAt       { get; set; }
        public DateTime SessionStart      { get; set; }
        public int      TotalTransactions { get; set; }
        public decimal  GrossSales        { get; set; }
        public decimal  TotalDiscount     { get; set; }
        public decimal  TotalVat          { get; set; }
        public decimal  NetSales          { get; set; }
        public decimal  CashSales         { get; set; }
        public decimal  CardSales         { get; set; }
        public decimal  GCashSales        { get; set; }
        public decimal  PhilHealthSales   { get; set; }
        public decimal  RefundAmount      { get; set; }
        public decimal  VoidAmount        { get; set; }
        public int      ItemsSold         { get; set; }
    }
    public class ZReadDto : XReadDto
    {
        public DateTime              SessionEnd   { get; set; }
        public decimal               OpeningCash  { get; set; }
        public decimal               ClosingCash  { get; set; }
        public decimal               ExpectedCash { get; set; }
        public decimal               CashVariance { get; set; }
        public List<HourlySalesDto>  HourlySales  { get; set; } = new();
        public List<TopProductDto>   TopProducts  { get; set; } = new();
    }
    public class HourlySalesDto { public int Hour{get;set;} public int Count{get;set;} public decimal Amount{get;set;} }
    public class TopProductDto  { public string ProductName { get; set; } = ""; public int QuantitySold{get;set;} public decimal Revenue{get;set;} }

    public class DashboardDto
    {
        public decimal              TodaySales         { get; set; }
        public int                  TodayTransactions  { get; set; }
        public decimal              AvgTransaction     { get; set; }
        public int                  LowStockCount      { get; set; }
        public List<TransactionDto> RecentTransactions { get; set; } = new();
        public List<ProductDto>     LowStockItems      { get; set; } = new();
    }
    public class SalesSummaryDto
    {
        public int     TotalCount    { get; set; }
        public decimal TotalSales    { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalVat      { get; set; }
        public int     TotalItems    { get; set; }
    }

    public class MovingItemsDto
    {
        public int Rank { get; set; }

        public int ProductId { get; set; }

        public string ProductCode { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        public decimal QuantitySold { get; set; }

        public decimal TotalSales { get; set; }

        public decimal AverageSellingPrice { get; set; }
        public int StockQuantity { get; set; }
    }
    public class SessionSummaryDto
    {
        public int       Id          { get; set; }
        public string    CashierName { get; set; } = "";
        public DateTime  LoginTime   { get; set; }
        public DateTime? LogoutTime  { get; set; }
        public decimal   OpeningCash { get; set; }
        public decimal   ClosingCash { get; set; }
        public string    Terminal    { get; set; } = "";
        public bool      IsClosed    { get; set; }
        public int       TxCount     { get; set; }
        public decimal   NetSales    { get; set; }
    }

    // ── GENERIC API WRAPPER ───────────────────────────────────────────────────
    public class ApiResult<T>
    {
        public bool   Success { get; set; }
        public string Message { get; set; } = "";
        public T?     Data    { get; set; }
        public static ApiResult<T> Ok(T data, string msg = "") => new() { Success=true,  Data=data, Message=msg };
        public static ApiResult<T> Fail(string msg)            => new() { Success=false, Message=msg };
    }
    public class ApiResult
    {
        public bool   Success { get; set; }
        public string Message { get; set; } = "";
        public static ApiResult Ok(string msg = "") => new() { Success=true,  Message=msg };
        public static ApiResult Fail(string msg)    => new() { Success=false, Message=msg };
    }
}
