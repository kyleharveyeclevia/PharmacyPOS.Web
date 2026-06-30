import { useState, useEffect } from 'react';
import { transactionsApi, reportsApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { Search, Printer, Ban, BarChart3, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const php = (n) => '₱' + (n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];
const fmtDt = (s) => new Date(s).toLocaleString('en-PH', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const debugging = true;

const WriteToConsole = (text, data) => {
  if (debugging) {
    if (data === undefined)
      data = '';
    console.log(text, data);
  }
}

const Modal = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function ReportsPage() {
  const { user } = useAuth();
  const canVoid = user?.role === 'Admin' || user?.role === 'Pharmacist';

  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [txList, setTxList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [xread, setXread] = useState(null);
  const [zread, setZread] = useState(null);
  const [cash, setCash] = useState('');
  const [showZ, setShowZ] = useState(false);
  const [voidTx, setVoidTx] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  // Slow moving items
  const [slowMovingItems, setSlowMovingItems] = useState([]);
  const [slowPage, setSlowPage] = useState(1);
  const [slowTotalPages, setSlowTotalPages] = useState(1);
  const slowPageSize = 10;

  // fast moving items 
  const [fastMovingItems, setFastMovingItems] = useState([]);
  const [fastPage, setFastPage] = useState(1);
  const [fastTotalPages, setFastTotalPages] = useState(1);
  const fastPageSize = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [txRes, sumRes] = await Promise.all([
        transactionsApi.byRange(start, end),
        reportsApi.summary(start, end),
      ]);
      if (txRes.data.Success) setTxList(txRes.data.Data);
      if (sumRes.data.Success) setSummary(sumRes.data.Data);

    } catch (error) {
      toast.error('Failed to load.');
      console.log(error);
    }
    finally { setLoading(false); }
  };

  const loadSlowMovingItems = async () => {
    setLoading(true);
    WriteToConsole('load slow moving items');

    try {
      const [slowMovingItemsRes] = await Promise.all([
        reportsApi.getSlowMovingItemsWithOffset(start, end, slowPage, slowPageSize),
      ]);


      if (slowMovingItemsRes.data.Success) {
        setSlowMovingItems(slowMovingItemsRes.data.Data.Items ?? []);

        let totalPages = Math.ceil(
          slowMovingItemsRes.data.Data.TotalRecords / slowPageSize
        );

        setSlowTotalPages(totalPages);

        WriteToConsole('Total Records:', slowMovingItemsRes.data.Data.TotalRecords);
        WriteToConsole('Calculated Total Pages:', totalPages);
      }
    }

    catch {
      toast.error('Failed to load slow moving items');
    }

    finally {
      setLoading(false);
    }
  }

  const loadFastMovingItems = async () => {
    setLoading(true);
    WriteToConsole('load fast moving items');

    try {
      const [fastMovingItemsRes] = await Promise.all([
        reportsApi.getFastMovingItemsWithOffset(start, end, fastPage, fastPageSize),
      ]);


      if (fastMovingItemsRes.data.Success) {
        setFastMovingItems(fastMovingItemsRes.data.Data.Items ?? []);

        let totalPages = Math.ceil(
          fastMovingItemsRes.data.Data.TotalRecords / fastPageSize
        );

        setFastTotalPages(totalPages);

        WriteToConsole('Total Records:', fastMovingItemsRes.data.Data.TotalRecords);
        WriteToConsole('Calculated Total Pages:', totalPages);
      }
    }

    catch {
      toast.error('Failed to load slow moving items');
    }

    finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadSlowMovingItems() }, [slowPage]);
  useEffect(() => { loadFastMovingItems() }, [fastPage]);

  const genXRead = async () => {
    try {
      const { data } = await reportsApi.xread();
      if (data.Success) { setXread(data.Data); toast.success('X-Read generated.'); }
    } catch { toast.error('X-Read failed.'); }
  };

  const genZRead = async () => {
    const c = parseFloat(cash);
    if (isNaN(c)) { toast.error('Enter valid cash amount.'); return; }
    try {
      const { data } = await reportsApi.zread(c);
      if (data.Success) { setZread(data.Data); setShowZ(false); toast.success('Z-Read done. Session closed.'); }
    } catch { toast.error('Z-Read failed.'); }
  };

  const doVoid = async () => {
    if (!voidTx) return;
    if (!voidReason.trim()) { toast.error('Reason required.'); return; }
    try {
      const { data } = await transactionsApi.void(voidTx.Id, voidReason);
      if (!data.Success) { toast.error(data.Message); return; }
      toast.success('Transaction voided.');
      setVoidTx(null); setVoidReason(''); load();
    } catch { toast.error('Void failed.'); }
  };

  const setThisWeek = () => {
    const d = new Date();
    setStart(new Date(d.setDate(d.getDate() - d.getDay())).toISOString().split('T')[0]);
    setEnd(today());
  };
  const setThisMonth = () => {
    const d = new Date();
    setStart(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEnd(today());
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <div className="flex gap-2">
          <button onClick={genXRead}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Printer size={14} /> X-Read
          </button>
          <button onClick={() => setShowZ(true)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <BarChart3 size={14} /> Z-Read / End Day
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm text-gray-600">From</span>
        <input type="date" value={start} onChange={e => setStart(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <span className="text-sm text-gray-600">To</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <button onClick={() => { load(); loadSlowMovingItems(); loadFastMovingItems();}} disabled={loading}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Search size={14} />{loading ? 'Loading…' : 'Search'}
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => { setStart(today()); setEnd(today()); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 transition">Today</button>
          <button onClick={setThisWeek} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 transition">This Week</button>
          <button onClick={setThisMonth} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 transition">This Month</button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Net Sales', php(summary.TotalSales), 'text-green-600'],
            ['Transactions', summary.TotalCount, 'text-blue-600'],
            ['Discounts', php(summary.TotalDiscount), 'text-red-600'],
            ['VAT Collected', php(summary.TotalVat), 'text-teal-600'],
            ['Items Sold', summary.TotalItems, 'text-purple-600'],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-xs text-gray-500 uppercase mb-1">{label}</div>
              <div className={'text-xl font-bold ' + color}>{value}</div>
            </div>
          ))}
        </div>
      )}

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
            <button onClick={() => setZread(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            {[
              ['Net Sales', php(zread.NetSales)], ['Opening Cash', php(zread.OpeningCash)],
              ['Expected Cash', php(zread.ExpectedCash)], ['Actual Cash', php(zread.ClosingCash)],
              ['Cash Variance', php(zread.CashVariance)], ['Returns', php(zread.RefundAmount)],
              ['Transactions', zread.TotalTransactions], ['Items Sold', zread.ItemsSold],
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

      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Transaction History</span>
          <span className="ml-2 text-sm text-gray-400">({txList.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Receipt #</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
                <th className="px-4 py-3 text-left">Cashier</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                {canVoid && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {txList.map(tx => (
                <tr key={tx.Id ?? tx.ReceiptNumber}
                  className={'hover:bg-gray-50 transition ' + (tx.IsVoided ? 'opacity-60 bg-red-50' : tx.TransactionType === 'Return' ? 'bg-amber-50' : '')}>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{tx.ReceiptNumber}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDt(tx.TransactionDate)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{tx.CashierName}</td>
                  <td className="px-4 py-2.5">
                    <span className={
                      'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (tx.TransactionType === 'Return' ? 'bg-amber-100 text-amber-700' :
                        tx.TransactionType === 'Void' ? 'bg-red-100   text-red-700' :
                          'bg-blue-100  text-blue-700')
                    }>{tx.TransactionType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{tx.PaymentMethod}</td>
                  <td className="px-4 py-2.5 text-right text-red-500 text-xs">
                    {tx.DiscountAmount > 0 ? '− ' + php(tx.DiscountAmount) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-green-600">{php(tx.TotalAmount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={
                      'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (tx.IsVoided ? 'bg-red-100   text-red-700' :
                        tx.TransactionType === 'Return' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700')
                    }>
                      {tx.IsVoided ? 'VOIDED' : tx.TransactionType === 'Return' ? 'RETURN' : 'PAID'}
                    </span>
                  </td>
                  {canVoid && (
                    <td className="px-4 py-2.5 text-center">
                      {!tx.IsVoided && tx.TransactionType === 'Sale' && (
                        <button onClick={() => { setVoidTx(tx); setVoidReason(''); }}
                          className="text-red-400 hover:text-red-600 transition" title="Void">
                          <Ban size={15} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {txList.length === 0 && !loading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No transactions in this range</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fast Moving Items */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Fast Moving Items</span>
          <span className="ml-2 text-sm text-gray-400">({fastMovingItems.length})</span>
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
              {fastMovingItems.map(fstmovingitm => (
                <tr key={fstmovingitm.ProductId}
                  className={'hover:bg-gray-50 transition'}>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{fstmovingitm.Rank}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fstmovingitm.ProductName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{fstmovingitm.QuantitySold}</td>
                  <td className="px-4 py-2.5">
                    <span className={
                      'px-4 py-2.5 text-green-700 font-bold'
                    }>{php(fstmovingitm.TotalSales)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{php(fstmovingitm.AverageSellingPrice)}</td>
                  <td className={"px-4 py-2.5 text-right " + (fstmovingitm.StockQuantity <= 10 ? "text-red-500" : "text-green-500") + " text-xs"}>
                    {fstmovingitm.StockQuantity}
                  </td>
                </tr>
              ))}
              {fastMovingItems.length === 0 && !loading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No transactions in this range</td></tr>
              )}
            </tbody>
          </table>
          {fastMovingItems.length > 0 && (
            <div className="flex justify-end items-center gap-2 p-4 border-t">
              <button
                disabled={fastPage === 1}
                onClick={() => setFastPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm">
                Page {fastPage} of {fastTotalPages}
              </span>

              <button

                disabled={fastPage === fastTotalPages}
                onClick={() => setFastPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slow Moving Items */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Slow Moving Items</span>
          <span className="ml-2 text-sm text-gray-400">({slowMovingItems.length})</span>
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
              {slowMovingItems.map(slwmovingitm => (
                <tr key={slwmovingitm.ProductId}
                  className={'hover:bg-gray-50 transition'}>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{slwmovingitm.Rank}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{slwmovingitm.ProductName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{slwmovingitm.QuantitySold}</td>
                  <td className="px-4 py-2.5">
                    <span className={
                      'px-4 py-2.5 text-green-700 font-bold'
                    }>{php(slwmovingitm.TotalSales)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{php(slwmovingitm.AverageSellingPrice)}</td>
                  <td className={"px-4 py-2.5 text-right " + (slwmovingitm.StockQuantity <= 10 ? "text-red-500" : "text-green-500") + " text-xs"}>
                    {slwmovingitm.StockQuantity}
                  </td>
                </tr>
              ))}
              {slowMovingItems.length === 0 && !loading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No transactions in this range</td></tr>
              )}
            </tbody>
          </table>
          {slowMovingItems.length > 0 && (
            <div className="flex justify-end items-center gap-2 p-4 border-t">
              <button
                disabled={slowPage === 1}
                onClick={() => setSlowPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm">
                Page {slowPage} of {slowTotalPages}
              </span>

              <button

                disabled={slowPage === slowTotalPages}
                onClick={() => setSlowPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>



      {/* Z-Read modal */}
      {showZ && (
        <Modal title="Z-Read / End of Day" onClose={() => setShowZ(false)}>
          <p className="text-sm text-gray-600 mb-4">Enter actual cash in drawer for reconciliation.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Closing Cash (PHP)</label>
          <input type="number" step="0.01" value={cash} onChange={e => setCash(e.target.value)} autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-lg text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none mb-4"
            placeholder="0.00" />
          <div className="flex gap-3">
            <button onClick={() => setShowZ(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button onClick={genZRead} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-bold transition">Generate Z-Read</button>
          </div>
        </Modal>
      )}

      {/* Void modal */}
      {voidTx && (
        <Modal title={'Void ' + voidTx.ReceiptNumber} onClose={() => setVoidTx(null)}>
          <p className="text-sm text-gray-600 mb-4">Enter the reason for voiding this transaction.</p>
          <input value={voidReason} onChange={e => setVoidReason(e.target.value)} autoFocus
            placeholder="Void reason…"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => setVoidTx(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button onClick={doVoid} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-bold transition">Void Transaction</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
