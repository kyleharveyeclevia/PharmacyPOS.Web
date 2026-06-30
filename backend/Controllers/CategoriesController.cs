using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        public CategoriesController(IPharmacyService svc) => _svc = svc;

        [HttpGet]
        public async Task<ActionResult<ApiResult<List<CategoryDto>>>> GetAll()
        => Ok(ApiResult<List<CategoryDto>>.Ok(await _svc.GetCategoriesAsync()));

        [HttpPost]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<int>>> Create([FromBody] CategoryDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(ApiResult<int>.Fail("Name required."));
            var (ok, msg, id) = await _svc.SaveCategoryAsync(req, isNew: true);
            if (!ok) return BadRequest(ApiResult<int>.Fail(msg));
            return Ok(ApiResult<int>.Ok(id, msg));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<int>>> Update(int id, [FromBody] CategoryDto req)
        {
            req.Id = id;
            if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(ApiResult<int>.Fail("Name required."));
            var (ok, msg, _) = await _svc.SaveCategoryAsync(req, isNew: false);
            if (!ok) return BadRequest(ApiResult<int>.Fail(msg));
            return Ok(ApiResult<int>.Ok(id, msg));
        }
    }
}
