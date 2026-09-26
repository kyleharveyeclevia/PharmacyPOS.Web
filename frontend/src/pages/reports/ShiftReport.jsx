import {Printer, BarChart3} from 'lucide-react';
import {php} from './reportUtils.js';
export default function ShiftReport({xread, zread, setXread, setZread}) { return <>
      {xread && (
  <div className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">

    {/* HEADER */}
    <div className="flex items-center gap-2 mb-4">
      <Printer size={16} className="text-teal-600" />
      <h2 className="font-bold text-gray-800">
        X-Read — {new Date(xread.GeneratedAt).toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </h2>

      <button
        onClick={() => setXread(null)}
        className="ml-auto text-xs text-gray-400 hover:text-gray-600"
      >
        ✕ Close
      </button>
    </div>

    {/* =========================
        X-READ SUMMARY
    ========================= */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      {[
        ['Cashier', xread.Cashier],
        ['Terminal', xread.Terminal],
        ['Transactions', xread.TotalTransactions],
        ['Items Sold', xread.ItemsSold],
        ['Gross Sales', php(xread.GrossSales)],
        ['Discounts', php(xread.TotalDiscount)],
        ['VAT', php(xread.TotalVat)],
        ['Net Sales', php(xread.NetSales)],
        ['Cash', php(xread.CashSales)],
        ['Card', php(xread.CardSales)],
        ['GCash', php(xread.GCashSales)],
        ['PhilHealth', php(xread.PhilHealthSales)],
        ['HMO', php(xread.HMOSales)],
        ['Returns', php(xread.RefundAmount)],
        ['Voids', php(xread.VoidAmount)],
      ].map(([k, v]) => (
        <div key={k}>
          <div className="text-gray-400 text-xs">{k}</div>
          <div className="font-semibold text-gray-800">{v}</div>
        </div>
      ))}
    </div>

    {/* LINE BREAK / SPACING */}
    <div className="my-5 border-t border-gray-200"></div>

    {/* =========================
        PRODUCT BREAKDOWN
    ========================= */}
    {xread?.TransactionItems?.length > 0 && (
      <div>

        <h3 className="font-semibold text-gray-800 mb-3">
          Products Sold
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">

            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Barcode</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Unit Price</th>
                <th className="text-right p-2">Total</th>
              </tr>
            </thead>

            <tbody>
              {xread.TransactionItems.map((item) => (
                <tr key={item.Id} className="border-t">
                  <td className="p-2">{item.ProductName}</td>
                  <td className="p-2 text-gray-500">{item.ProductBarcode}</td>
                  <td className="p-2 text-right">{item.Quantity}</td>
                  <td className="p-2 text-right">{php(item.UnitPrice)}</td>
                  <td className="p-2 text-right font-semibold">
                    {php(item.LineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    )}

  </div>
)}

      {/* Z-Read inline panel */}
      {zread && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-red-600" />
            <h2 className="font-bold text-gray-800">Z-Read — Session Closed</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            {[
              ['Net Sales', php(zread.NetSales)], ['Opening Cash', php(zread.OpeningCash)],
              ['Expected Cash', php(zread.ExpectedCash)], ['Actual Cash', php(zread.ClosingCash)],
              ['Cash Variance', php(zread.CashVariance)], ['Returns', php(zread.RefundAmount)],
              ['Transactions', zread.TotalTransactions], ['Items Sold', zread.ItemsSold],
              ['HMO', php(zread.HMOSales)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-gray-400 text-xs">{k}</div>
                <div className={'font-semibold ' + (k === 'Cash Variance' && zread.CashVariance < 0 ? 'text-red-600' : 'text-gray-800')}>{v}</div>
              </div>
            ))}
          </div>
          {zread.TopProducts?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Products</div>
              <div className="flex flex-wrap gap-2">
                {zread.TopProducts.slice(0, 5).map(p => (
                  <div key={p.ProductName} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-medium text-gray-800">{p.ProductName}</span>
                    <span className="text-gray-400 ml-2">{p.QuantitySold} sold · {php(p.Revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


</>; }
