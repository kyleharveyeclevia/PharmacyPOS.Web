using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SuppliersController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        public SuppliersController(IPharmacyService svc) => _svc = svc;

        [HttpGet]
        public async Task<ActionResult<ApiResult<List<SupplierDto>>>> GetAll()
          => Ok(ApiResult<List<SupplierDto>>.Ok(await _svc.GetSuppliersAsync()));
    }
}
