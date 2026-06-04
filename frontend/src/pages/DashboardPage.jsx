import { useEffect, useState } from 'react';
import { reportsApi } from '../services/api.js';
import { TrendingUp, ShoppingCart, BarChart2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const php = (n) => '₱' + (n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    load();
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const { data: res } = await reportsApi.dashboard();
      if (res.Success) setData(res.Data);
    } catch { toast.error('Failed to load dashboard.'); }
  };

  const stats = [
    { label: "Today's Sales",    value: php(data?.TodaySales),              Icon: TrendingUp,    bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    { label: 'Transactions',     value: String(data?.TodayTransactions ?? 0), Icon: ShoppingCart,  bg: 'bg-blue-50',  text: 'text-blue-600',  border: 'border-blue-200'  },
    { label: 'Avg Transaction',  value: php(data?.AvgTransaction),            Icon: BarChart2,     bg: 'bg-teal-50',  text: 'text-teal-600',  border: 'border-teal-200'  },
    { label: 'Low Stock Items',  value: String(data?.LowStockCount ?? 0),     Icon: AlertTriangle, bg: 'bg-red-50',   text: 'text-red-600',   border: 'border-red-200'   },
  ];

  const fmtTime = (d) => d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d) => d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{fmtDate(time)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-700 font-mono">{fmtTime(time)}</div>
          <button onClick={load} className="text-xs text-gray-400 hover:text-blue-600 mt-1 transition-colors">↺ Refresh</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, Icon, bg, text, border }) => (
          <div key={label} className={'bg-white rounded-xl border ' + border + ' p-5 shadow-sm'}>
            <div className={'inline-flex p-2 rounded-lg ' + bg + ' ' + text + ' mb-3'}>
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800 text-sm">
            Recent Transactions
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt</th>
                  <th className="px-4 py-3 text-left">Cashier</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.RecentTransactions ?? []).map(tx => (
                  <tr key={tx.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{tx.ReceiptNumber}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs">{tx.CashierName}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-green-600">{php(tx.TotalAmount)}</td>
                  </tr>
                ))}
                {!data?.RecentTransactions?.length && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">No transactions today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 font-semibold text-gray-800 text-sm flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" /> Low Stock Alerts
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.LowStockItems ?? []).map(p => (
                  <tr key={p.Id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{p.Name}</div>
                      <div className="text-gray-400 text-xs">{p.CategoryName}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-red-600">{p.StockQuantity}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{p.ReorderLevel}</td>
                  </tr>
                ))}
                {!data?.LowStockItems?.length && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">All stock levels OK ✓</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
