import {php} from './reportUtils.js';
export default function MovementReport({title, items, loading, page, totalPages, setPage}) { return <>
      {/* {title} */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800">{title}</span>
          <span className="ml-2 text-sm text-gray-400">({items.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Product Name</th>
                <th className="px-4 py-3 text-left">Qty Sold</th>
                <th className="px-4 py-3 text-left">Total Sales</th>
                <th className="px-4 py-3 text-left">Avg Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 fmi">
              {items.map(item => (
                <tr key={item.ProductId}
                  className={'hover:bg-gray-50 transition'}>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{item.Rank}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{item.ProductName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{item.QuantitySold}</td>
                  <td className="px-4 py-2.5">
                    <span className={
                      'px-4 py-2.5 text-green-700 font-bold'
                    }>{php(item.TotalSales)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{php(item.AverageSellingPrice)}</td>
                  <td className={"px-4 py-2.5 text-right " + (item.StockQuantity <= 0 ? "text-red-500" : "text-green-500") + " text-xs"}>
                    {item.StockQuantity}
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No products found in this range</td></tr>
              )}
            </tbody>
          </table>
          {items.length > 0 && (
            <div className="flex justify-end items-center gap-2 p-4 border-t">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm">
                Page {page} of {totalPages}
              </span>

              <button

                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>


</>; }
