using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Middleware;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProductsController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        public ProductsController(IPharmacyService svc) => _svc = svc;

        [HttpGet] public async Task<ActionResult<ApiResult<List<ProductDto>>>> GetAll()
            => Ok(ApiResult<List<ProductDto>>.Ok(await _svc.GetAllProductsAsync()));

        [HttpGet("search")] public async Task<ActionResult<ApiResult<List<ProductDto>>>> Search([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q)) return Ok(ApiResult<List<ProductDto>>.Ok(new()));
            return Ok(ApiResult<List<ProductDto>>.Ok(await _svc.SearchProductsAsync(q)));
        }

        [HttpGet("barcode/{barcode}")] public async Task<ActionResult<ApiResult<ProductDto>>> ByBarcode(string barcode)
        {
            var p = await _svc.GetProductByBarcodeAsync(barcode);
            if (p == null) return NotFound(ApiResult<ProductDto>.Fail("Not found: " + barcode));
            return Ok(ApiResult<ProductDto>.Ok(p));
        }

        [HttpGet("lowstock")] public async Task<ActionResult<ApiResult<List<ProductDto>>>> LowStock()
            => Ok(ApiResult<List<ProductDto>>.Ok(await _svc.GetLowStockProductsAsync()));

        [HttpPost]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<int>>> Create([FromBody] SaveProductRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Barcode)) return BadRequest(ApiResult<int>.Fail("Barcode required."));
            if (string.IsNullOrWhiteSpace(req.Name))    return BadRequest(ApiResult<int>.Fail("Name required."));
            if (req.SellingPrice <= 0)                  return BadRequest(ApiResult<int>.Fail("Price must be > 0."));
            if (req.CategoryId == 0)                    return BadRequest(ApiResult<int>.Fail("Category required."));
            var (ok, msg, id) = await _svc.SaveProductAsync(req, isNew: true);
            if (!ok) return BadRequest(ApiResult<int>.Fail(msg));
            return Ok(ApiResult<int>.Ok(id, msg));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult>> Update(int id, [FromBody] SaveProductRequest req)
        {
            req.Id = id;
            if (string.IsNullOrWhiteSpace(req.Barcode)) return BadRequest(ApiResult.Fail("Barcode required."));
            if (string.IsNullOrWhiteSpace(req.Name))    return BadRequest(ApiResult.Fail("Name required."));
            if (req.SellingPrice <= 0)                  return BadRequest(ApiResult.Fail("Price must be > 0."));
            var (ok, msg, _) = await _svc.SaveProductAsync(req, isNew: false);
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }

        [HttpPatch("{id:int}/toggle")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult>> Toggle(int id, [FromBody] SaveProductRequest req)
        {
            req.Id = id;
            var (ok, msg) = await _svc.ToggleProductAsync(req);
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }

        [HttpPost("{id:int}/stock")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult>> AdjustStock(int id, [FromBody] AdjustStockRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Reason)) return BadRequest(ApiResult.Fail("Reason required."));
            var (ok, msg) = await _svc.AdjustStockAsync(id, User.GetUserId(), req.Adjustment, req.Reason);
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }

        [HttpPost("import")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<ProductImportResult>>> ImportProducts([FromForm] ProductImportRequest request)
        {
            if (request == null)
                return BadRequest(ApiResult<ProductImportResult>.Fail("Import request is required."));

            if (request.File == null || request.File.Length == 0)
                return BadRequest(ApiResult<ProductImportResult>.Fail("Please select a file to import."));

            var result = await _svc.ImportProductsAsync(
                request.File,
                User.GetUserId());

            return Ok(ApiResult<ProductImportResult>.Ok(
                result,
                $"Import completed. {result.SuccessCount} succeeded, {result.FailedCount} failed."
            ));
        }

        [HttpGet("customers")]  public async Task<ActionResult<ApiResult<List<CustomerDto>>>> Customers()
            => Ok(ApiResult<List<CustomerDto>>.Ok(await _svc.GetCustomersAsync()));
    }
}
