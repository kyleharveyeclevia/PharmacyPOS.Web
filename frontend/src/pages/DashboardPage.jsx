import { useEffect, useState } from 'react';

import { reportsApi } from '../services/api.js';

import {
  TrendingUp,
  ShoppingCart,
  BarChart2,
  AlertTriangle,
} from 'lucide-react';

import toast from 'react-hot-toast';

const php = (n) =>
  '₱' +
  (n ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    load();

    const t = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const { data: res } = await reportsApi.dashboard();

      if (res.Success) {
        setData(res.Data);
      }
    } catch {
      toast.error('Failed to load dashboard.');
    }
  };

  const stats = [
    {
      label: "Today's Sales",
      value: php(data?.TodaySales),
      Icon: TrendingUp,
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
    },
    {
      label: 'Transactions',
      value: String(data?.TodayTransactions ?? 0),
      Icon: ShoppingCart,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    {
      label: 'Avg Transaction',
      value: php(data?.AvgTransaction),
      Icon: BarChart2,
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      border: 'border-teal-200',
    },
    {
      label: 'Low Stock Items',
      value: String(data?.LowStockCount ?? 0),
      Icon: AlertTriangle,
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
    },
  ];

  const fmtTime = (d) =>
    d.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const fmtDate = (d) =>
    d.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard
          </h1>

          <p className="mt-0.5 text-sm text-gray-500">
            {fmtDate(time)}
          </p>
        </div>

        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-green-700">
            {fmtTime(time)}
          </div>

          <button
            onClick={load}
            className="mt-1 text-xs text-gray-400 transition-colors hover:text-green-600"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(
          ({
            label,
            value,
            Icon,
            bg,
            text,
            border,
          }) => (
            <div
              key={label}
              className={
                'rounded-xl border bg-white p-5 shadow-sm ' +
                border
              }
            >
              <div
                className={
                  'mb-3 inline-flex rounded-lg p-2 ' +
                  bg +
                  ' ' +
                  text
                }
              >
                <Icon size={20} />
              </div>

              <div className="text-2xl font-bold text-gray-800">
                {value}
              </div>

              <div className="mt-1 text-sm text-gray-500">
                {label}
              </div>
            </div>
          )
        )}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-800">
            Recent Transactions
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left">
                    Cashier
                  </th>
                  <th className="px-4 py-3 text-right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {(data?.RecentTransactions ?? []).map((tx) => (
                  <tr
                    key={tx.Id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-green-600">
                      {tx.ReceiptNumber}
                    </td>

                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {tx.CashierName}
                    </td>

                    <td className="px-4 py-2.5 text-right font-bold text-green-600">
                      {php(tx.TotalAmount)}
                    </td>
                  </tr>
                ))}

                {!data?.RecentTransactions?.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No transactions today
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-red-100 px-5 py-4 text-sm font-semibold text-gray-800">
            <AlertTriangle
              size={15}
              className="text-red-500"
            />

            Low Stock Alerts
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Product
                  </th>
                  <th className="px-4 py-3 text-center">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-center">
                    Min
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {(data?.LowStockItems ?? []).map((p) => (
                  <tr
                    key={p.Id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">
                        {p.Name}
                      </div>

                      <div className="text-xs text-gray-400">
                        {p.CategoryName}
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-center font-bold text-red-600">
                      {p.StockQuantity}
                    </td>

                    <td className="px-4 py-2.5 text-center text-gray-500">
                      {p.ReorderLevel}
                    </td>
                  </tr>
                ))}

                {!data?.LowStockItems?.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      All stock levels OK ✓
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
