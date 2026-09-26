import {useState,useEffect,useRef} from 'react';
import {receiptsApi} from '../services/api.js';
import ReceiptPreview from '../components/pos/ReceiptPreview.jsx';
import {php,fmtDt} from './reports/reportUtils.js';

const PAGE_SIZE=25;
export default function ReceiptsPage() {
  const [search,setSearch]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[status,setStatus]=useState('');
  const [filters,setFilters]=useState({}),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
  const [data,setData]=useState({Items:[],TotalRecords:0}),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [selected,setSelected]=useState(null),actionRef=useRef(null);
  useEffect(()=> {
    let active=true;setLoading(true);setError('');
    receiptsApi.list({...filters,pageNumber:page,pageSize:PAGE_SIZE}).then(({data})=>{
      if(!data.Success)throw new Error(data.Message || 'Unable to load receipts.');if(active)setData(data.Data);
    }).catch(error=>{if(active)setError(error.response?.data?.Message || error.message || 'Unable to load receipts.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[filters,page,refresh]);
  const apply=e=> {
    e.preventDefault();
    if(start && end && start>end){setError('From date must be on or before To date.');return;}
    setPage(1);setFilters({search:search.trim() || undefined,startDate:start || undefined,endDate:end || undefined,status:status || undefined});
  };
  const clear=()=>{setSearch('');setStart('');setEnd('');setStatus('');setPage(1);setFilters({});};
  const openReceipt=(tx,event)=>{actionRef.current=event.currentTarget;setSelected({transactionId:tx.Id,receiptNumber:tx.ReceiptNumber,transaction:null});};
  const close=()=>{setSelected(null);setTimeout(()=>actionRef.current?.focus(),0);};
  const totalPages=Math.max(1,Math.ceil(data.TotalRecords/PAGE_SIZE));
  return <>
    <div inert={selected?'':undefined} aria-hidden={selected?true:undefined} className="w-full min-w-0 p-4 sm:p-6 xl:p-8 space-y-5">
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm text-gray-500 mb-1">Utilities</p><h1 className="text-2xl font-bold text-gray-800">Receipts</h1><p className="text-sm text-gray-500 mt-1">View saved sales, returns, and voided receipts. Open a receipt to review its data and reprint.</p></div><button disabled={loading} onClick={()=>setRefresh(value=>value+1)} className="border rounded-lg bg-white px-4 py-2 text-sm disabled:opacity-50">Refresh</button></div>
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3 bg-white border rounded-xl p-4">
        <label className="text-sm flex-1 min-w-[200px]">Search<input value={search} maxLength={200} onChange={e=>setSearch(e.target.value)} placeholder="Receipt number, cashier, or customer" className="block w-full border rounded-lg p-2 mt-1"/></label>
        <label className="text-sm">From<input type="date" value={start} onChange={e=>setStart(e.target.value)} className="block border rounded-lg p-2 mt-1"/></label>
        <label className="text-sm">To<input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="block border rounded-lg p-2 mt-1"/></label>
        <label className="text-sm">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="block border rounded-lg p-2 mt-1"><option value="">All receipts</option><option value="Sale">Paid sales</option><option value="Return">Returns</option><option value="Voided">Voided</option></select></label>
        <button type="submit" disabled={loading} className="bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">Search</button><button type="button" onClick={clear} className="border rounded-lg px-4 py-2">Clear</button>
      </form>
      <p className="text-sm text-gray-500">{filters.startDate || filters.endDate ? (filters.startDate || 'Beginning')+' to '+(filters.endDate || 'Latest') : 'All dates'} · {data.TotalRecords} receipt(s)</p>
      {error && <div role="alert" className="border border-red-200 rounded-xl bg-red-50 p-4 text-red-700">{error} <button onClick={()=>setRefresh(value=>value+1)} className="underline ml-2">Retry</button></div>}
      {loading ? <div role="status" className="bg-white border rounded-xl p-8 text-gray-500">Loading receipts…</div> : !error && <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{['Receipt #','Date & Time','Cashier','Customer','Type','Payment','Total','Status',''].map((label,index)=><th key={index} className="px-4 py-3 text-left">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{data.Items.map(tx=><tr key={tx.Id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs break-all">{tx.ReceiptNumber}</td><td className="px-4 py-3 whitespace-nowrap">{fmtDt(tx.TransactionDate)}</td><td className="px-4 py-3">{tx.CashierName}</td><td className="px-4 py-3">{tx.CustomerName || 'Walk-in'}</td><td className="px-4 py-3">{tx.TransactionType}</td><td className="px-4 py-3">{tx.PaymentMethod}</td><td className="px-4 py-3 font-semibold whitespace-nowrap">{php(tx.TotalAmount)}</td><td className="px-4 py-3"><span className={'rounded-full px-2 py-1 text-xs '+(tx.IsVoided?'bg-red-100 text-red-700':tx.TransactionType==='Return'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700')}>{tx.IsVoided?'VOIDED':tx.TransactionType==='Return'?'RETURN':'PAID'}</span></td><td className="px-4 py-3"><button onClick={event=>openReceipt(tx,event)} className="whitespace-nowrap rounded-lg border border-green-200 px-3 py-2 text-green-700 hover:bg-green-50">View / Reprint</button></td></tr>)}{!data.Items.length && <tr><td colSpan={9} className="p-10 text-center text-gray-500">No receipts found.</td></tr>}</tbody>
        </table></div>
        <div className="flex justify-end items-center gap-3 border-t p-4 text-sm"><button disabled={page<=1} onClick={()=>setPage(value=>value-1)} className="border rounded-lg px-3 py-2 disabled:opacity-50">Previous</button><span>Page {page} of {totalPages}</span><button disabled={page>=totalPages} onClick={()=>setPage(value=>value+1)} className="border rounded-lg px-3 py-2 disabled:opacity-50">Next</button></div>
      </div>}
    </div>
    {selected && <ReceiptPreview key={selected.transactionId} receipt={selected} reprint onClose={close}/>}
  </>;
}
