using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        public CustomersController(IPharmacyService svc) => _svc = svc;

        [HttpGet]
        public async Task<ActionResult<ApiResult<List<CustomerDto>>>> GetAll()
           => Ok(ApiResult<List<CustomerDto>>.Ok(await _svc.GetCustomersAsync()));

        [HttpPost]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<int>>> Create([FromBody] CustomerDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(ApiResult<int>.Fail("Name required."));
            var (ok, msg, id) = await _svc.SaveCustomerAsync(req, isNew: true);
            if (!ok) return BadRequest(ApiResult<int>.Fail(msg));
            return Ok(ApiResult<int>.Ok(id, msg));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<int>>> Update(int id, [FromBody] CustomerDto req)
        {
            req.Id = id;
            if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(ApiResult<int>.Fail("Name required."));
            var (ok, msg, _) = await _svc.SaveCustomerAsync(req, isNew: false);
            if (!ok) return BadRequest(ApiResult<int>.Fail(msg));
            return Ok(ApiResult<int>.Ok(id, msg));
        }
    }
}
