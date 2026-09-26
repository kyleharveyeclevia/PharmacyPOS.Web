import {php} from './reportUtils.js';
export default function SalesSummaryReport({summary,previous,period}) {
  if(!summary)return null;
  const difference=summary.NetSales-(previous?.NetSales ?? 0);
  const change=previous?.NetSales ? (difference/Math.abs(previous.NetSales)*100).toFixed(1)+'%' : 'No prior sales baseline';
  return <><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[
    ['Sales Before Returns',php(summary.Sales)],['Returns',php(summary.Returns)],['Net Sales',php(summary.NetSales)],['Voided Amount',php(summary.Voids)],
    ['Sale Transactions',summary.TotalCount],['Discounts on Sales',php(summary.TotalDiscount)],['VAT on Sales',php(summary.TotalVat)],['Items Sold',summary.TotalItems],
  ].map(([label,value])=><div key={label} className="bg-white border rounded-xl p-5"><div className="text-sm text-gray-500">{label}</div><div className="text-2xl font-bold mt-2">{value}</div></div>)}</div>
  <p className="text-sm text-gray-500">Net sales = non-voided sales minus non-voided returns. Voided amounts are shown separately and are already excluded.</p>
  <div className="bg-white border rounded-xl p-5"><h2 className="font-semibold">Previous Period Comparison</h2><p className="text-sm text-gray-500 mt-1">{period.start} to {period.end} · Net sales: {php(previous?.NetSales)}</p><p className="text-lg mt-2">{difference>=0?'+':'−'}{php(Math.abs(difference))} · {change}</p></div></>;
}
