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
    public class TransactionsController : ControllerBase
    {
        private readonly IPharmacyService _svc;
        public TransactionsController(IPharmacyService svc) => _svc = svc;

        [HttpPost("sale")]
        public async Task<ActionResult<ApiResult<object>>> Sale([FromBody] ProcessSaleRequest req)
        {
            if (!req.Items.Any()) return BadRequest(ApiResult<object>.Fail("Cart is empty."));
            var (ok, msg, txId, receipt) = await _svc.ProcessSaleAsync(req, User.GetUserId(), User.GetSessionId());
            if (!ok) return BadRequest(ApiResult<object>.Fail(msg));
            var tx = await _svc.GetTransactionAsync(txId);
            return Ok(ApiResult<object>.Ok(new { transactionId = txId, receiptNumber = receipt, transaction = tx }, msg));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResult<TransactionDto>>> GetById(int id)
        {
            var tx = await _svc.GetTransactionAsync(id);
            if (tx == null) return NotFound(ApiResult<TransactionDto>.Fail("Transaction not found."));
            return Ok(ApiResult<TransactionDto>.Ok(tx));
        }

        [HttpGet("receipt/{receipt}")]
        public async Task<ActionResult<ApiResult<TransactionDto>>> GetByReceipt(string receipt)
        {
            var tx = await _svc.GetTransactionByReceiptAsync(receipt);
            if (tx == null) return NotFound(ApiResult<TransactionDto>.Fail("Receipt not found."));
            return Ok(ApiResult<TransactionDto>.Ok(tx));
        }

        [HttpGet]
        public async Task<ActionResult<ApiResult<List<TransactionDto>>>> GetByRange(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var list = await _svc.GetTransactionsByRangeAsync(startDate ?? DateTime.Today, endDate ?? DateTime.Today);
            return Ok(ApiResult<List<TransactionDto>>.Ok(list));
        }

        [HttpPost("{id:int}/void")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult>> Void(int id, [FromBody] VoidRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Reason)) return BadRequest(ApiResult.Fail("Void reason is required."));
            var (ok, msg) = await _svc.VoidTransactionAsync(id, req.Reason);
            if (!ok) return BadRequest(ApiResult.Fail(msg));
            return Ok(ApiResult.Ok(msg));
        }

        [HttpPost("{id:int}/return")]
        [Authorize(Roles = "Admin,Pharmacist")]
        public async Task<ActionResult<ApiResult<object>>> Return(int id, [FromBody] ReturnRequest req)
        {
            if (!req.Items.Any()) return BadRequest(ApiResult<object>.Fail("No items for return."));
            var (ok, msg, txId) = await _svc.ProcessReturnAsync(id, req, User.GetUserId(), User.GetSessionId());
            if (!ok) return BadRequest(ApiResult<object>.Fail(msg));
            var tx = await _svc.GetTransactionAsync(txId);
            return Ok(ApiResult<object>.Ok(new { transactionId = txId, transaction = tx }, msg));
        }
    }
}
