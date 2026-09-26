import {Ban} from 'lucide-react';
import {php, fmtDt} from './reportUtils.js';
export default function TransactionHistoryReport({txList, loading, canVoid, setVoidTx, setVoidReason}) { return <>
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


</>; }
