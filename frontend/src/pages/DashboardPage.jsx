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
    <div className="w-full min-w-0 p-4 sm:p-6 xl:p-8 2xl:p-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between 2xl:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 xl:text-3xl 2xl:text-4xl">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500 xl:text-base">
            {fmtDate(time)}
          </p>
        </div>

        <div className="sm:text-right">
          <div className="font-mono text-2xl font-bold text-green-700 xl:text-3xl 2xl:text-4xl">
            {fmtTime(time)}
          </div>

          <button
            onClick={load}
            className="mt-2 text-sm text-gray-500 transition-colors hover:text-green-600"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-6 2xl:mb-8">
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
                'min-w-0 rounded-xl border bg-white p-5 shadow-sm xl:p-6 2xl:min-h-52 2xl:p-8 ' +
                border
              }
            >
              <div
                className={
                  'mb-3 inline-flex rounded-lg p-2 2xl:mb-5 2xl:p-3 ' +
                  bg +
                  ' ' +
                  text
                }
              >
                <Icon size={20} className="h-5 w-5 2xl:h-7 2xl:w-7" />
              </div>

              <div className="break-words text-2xl font-bold text-gray-800 xl:text-3xl 2xl:text-4xl">
                {value}
              </div>

              <div className="mt-2 text-sm text-gray-500 xl:text-base">
                {label}
              </div>
            </div>
          )
        )}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:gap-8">
        {/* Recent Transactions */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-800 xl:px-6 xl:py-5 xl:text-base 2xl:text-lg">
            Recent Transactions
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm 2xl:text-base">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 2xl:text-sm">
                <tr>
                  <th className="px-4 py-3 text-left xl:px-6 xl:py-4">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left xl:px-6 xl:py-4">
                    Cashier
                  </th>
                  <th className="px-4 py-3 text-right xl:px-6 xl:py-4">
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
                    <td className="px-4 py-2.5 font-mono text-xs text-green-600 xl:px-6 xl:py-4 2xl:text-sm">
                      {tx.ReceiptNumber}
                    </td>

                    <td className="px-4 py-2.5 text-xs text-gray-700 xl:px-6 xl:py-4 2xl:text-base">
                      {tx.CashierName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold text-green-600 xl:px-6 xl:py-4">
                      {php(tx.TotalAmount)}
                    </td>
                  </tr>
                ))}

                {!data?.RecentTransactions?.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-400 xl:py-12 2xl:py-16 2xl:text-base"
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
        <div className="min-w-0 overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-red-100 px-5 py-4 text-sm font-semibold text-gray-800 xl:px-6 xl:py-5 xl:text-base 2xl:text-lg">
            <AlertTriangle
              size={15}
              className="text-red-500 2xl:h-5 2xl:w-5"
            />

            Low Stock Alerts
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm 2xl:text-base">
              <thead className="bg-red-50 text-xs uppercase text-gray-500 2xl:text-sm">
                <tr>
                  <th className="px-4 py-3 text-left xl:px-6 xl:py-4">
                    Product
                  </th>
                  <th className="px-4 py-3 text-center xl:px-6 xl:py-4">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-center xl:px-6 xl:py-4">
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
                    <td className="px-4 py-2.5 xl:px-6 xl:py-4">
                      <div className="font-medium text-gray-800">
                        {p.Name}
                      </div>

                      <div className="mt-1 text-xs text-gray-400 2xl:text-sm">
                        {p.CategoryName}
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-center font-bold text-red-600 xl:px-6 xl:py-4">
                      {p.StockQuantity}
                    </td>

                    <td className="px-4 py-2.5 text-center text-gray-500 xl:px-6 xl:py-4">
                      {p.ReorderLevel}
                    </td>
                  </tr>
                ))}

                {!data?.LowStockItems?.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-400 xl:py-12 2xl:py-16 2xl:text-base"
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
