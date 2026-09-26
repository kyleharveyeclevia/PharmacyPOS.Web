import {useState, useEffect} from 'react';
import {transactionsApi, reportsApi} from '../services/api.js';
import toast from 'react-hot-toast';
import {Search, X} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import {localDate, REPORTS, previousPeriod, salesTotals, filterTransactions, downloadCsv, printReport} from './reports/reportUtils.js';
import SalesSummaryReport from './reports/SalesSummaryReport.jsx';
import TransactionHistoryReport from './reports/TransactionHistoryReport.jsx';
import MovementReport from './reports/MovementReport.jsx';
import InventoryReport from './reports/InventoryReport.jsx';
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

export default function ReportsPage({report = 'sales'}) {
  const {user} = useAuth();
  const canVoid = ['Admin','Pharmacist'].includes(user?.role);
  const title = REPORTS.find(item => item.id === report)?.label;
  const [start, setStart] = useState(localDate());
  const [end, setEnd] = useState(localDate());
  const [range, setRange] = useState({start:localDate(), end:localDate()});
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting,setExporting]=useState(false);
  const [cashier,setCashier]=useState('');
  const [payment,setPayment]=useState('');
  const [status,setStatus]=useState('');
  const [expiryDays,setExpiryDays]=useState(90);
  const inventory=['low-stock','expiry'].includes(report);
  const period=previousPeriod(range.start,range.end);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [voidTx, setVoidTx] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const unwrap = response => {if(!response.data.Success)throw new Error(response.data.Message || 'Failed to load report.');return response.data.Data;};
  useEffect(() => {
    let active=true;setLoading(true);setError('');setResult(null);
    const load=async()=> {
      if(report==='sales') {
        const [current,currentTx,prior,priorTx]=await Promise.all([reportsApi.summary(range.start,range.end),transactionsApi.byRange(range.start,range.end),reportsApi.summary(period.start,period.end),transactionsApi.byRange(period.start,period.end)]);
        return {summary:salesTotals(unwrap(current),unwrap(currentTx)),previous:salesTotals(unwrap(prior),unwrap(priorTx))};
      }
      if(report==='transactions')return unwrap(await transactionsApi.byRange(range.start,range.end));
      if(report==='low-stock')return unwrap(await reportsApi.lowStock());
      if(report==='expiry')return unwrap(await reportsApi.expiry(expiryDays));
      return unwrap(await (report==='fast-moving'?reportsApi.getFastMovingItemsWithOffset(range.start,range.end,page,10):reportsApi.getSlowMovingItemsWithOffset(range.start,range.end,page,10)));
    };
    load().then(data=>{if(active)setResult(data);}).catch(error=>{if(active)setError(error.response?.data?.Message || error.message || 'Failed to load report.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[report,range,page,refresh,expiryDays]);
  const transactions=report==='transactions'?filterTransactions(result ?? [],cashier,payment,status):[];
  const exportReport=async mode=> {
    setExporting(true);
    try {
      let rows,columns;
      if(report==='sales') {rows=Object.entries(result.summary).filter(([key])=>['Sales','Returns','NetSales','Voids','TotalCount','TotalDiscount','TotalVat','TotalItems'].includes(key)).map(([key,Value])=>({Metric:({Sales:'Sales Before Returns',Returns:'Returns',NetSales:'Net Sales',Voids:'Voided Amount',TotalCount:'Sale Transactions',TotalDiscount:'Discounts on Sales',TotalVat:'VAT on Sales',TotalItems:'Items Sold'})[key],Value}));rows.push({Metric:'Previous period net sales',Value:result.previous.NetSales});columns=[{key:'Metric',label:'Metric'},{key:'Value',label:'Value'}];}
      else if(report==='transactions'){rows=transactions.map(tx=>({...tx,Status:tx.IsVoided?'VOIDED':tx.TransactionType==='Return'?'RETURN':'PAID'}));columns=[['ReceiptNumber','Receipt'],['TransactionDate','Date & Time'],['CashierName','Cashier'],['TransactionType','Type'],['PaymentMethod','Payment'],['DiscountAmount','Discount'],['TotalAmount','Total'],['Status','Status']];}
      else if(inventory){rows=result ?? [];columns=report==='expiry'?[['ProductName','Product'],['BatchNo','Batch'],['ExpiryDate','Expiry'],['StockQuantity','Stock'],['Status','Status']]:[['ProductName','Product'],['CategoryName','Category'],['StockQuantity','Total Stock'],['AvailableStockQuantity','Available'],['ReorderLevel','Reorder Level'],['SuggestedOrder','Suggested Minimum Order']];}
      else {rows=unwrap(await(report==='fast-moving'?reportsApi.getFastMovingItems(range.start,range.end):reportsApi.getSlowMovingItems(range.start,range.end)));columns=[['Rank','Rank'],['ProductName','Product'],['QuantitySold','Qty Sold'],['TotalSales','Sales'],['AverageSellingPrice','Average Price'],['StockQuantity','Stock']];}
      columns=columns.map(c=>Array.isArray(c)?{key:c[0],label:c[1]}:c);
      const details=inventory?(report==='expiry'?'Expired stock and batches expiring within '+expiryDays+' days':'Current stock'):'Period: '+range.start+' to '+range.end+(report==='transactions'?' · Cashier: '+((result ?? []).find(tx=>String(tx.UserId)===cashier)?.CashierName || 'All')+' · Payment: '+(payment || 'All')+' · Status: '+(status || 'All'):'');
      if(mode==='csv')downloadCsv(report+'-'+localDate()+'.csv',columns,rows);else printReport(title,details,columns,rows);
    }catch(error){toast.error(error.response?.data?.Message || error.message || 'Export failed.');}finally{setExporting(false);}
  };
  const applyRange = (from = start, to = end) => {
    if (!from || !to || from > to) { toast.error('Choose a valid date range.'); return; }
    setStart(from); setEnd(to); setPage(1); setCashier(''); setPayment(''); setStatus(''); setRange({start:from,end:to});
  };
  const setThisWeek = () => { const date = new Date(); date.setDate(date.getDate()-date.getDay()); applyRange(localDate(date),localDate()); };
  const setThisMonth = () => { const date = new Date(); applyRange(localDate(new Date(date.getFullYear(),date.getMonth(),1)),localDate()); };
  const doVoid = async () => {
    if (!voidTx || !voidReason.trim()) { toast.error('Reason required.'); return; }
    setWorking(true);
    try { const {data} = await transactionsApi.void(voidTx.Id,voidReason.trim()); if(!data.Success) throw new Error(data.Message); setVoidTx(null); setVoidReason(''); setRefresh(value=>value+1); toast.success('Transaction voided.'); }
    catch(error) { toast.error(error.response?.data?.Message || error.message || 'Void failed.'); }
    finally { setWorking(false); }
  };
  return (
    <div className="w-full min-w-0 p-4 sm:p-6 xl:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-gray-500 mb-1">Reports</p><h1 className="text-2xl font-bold text-gray-800">{title}</h1></div>
        <div className="flex gap-2"><button disabled={loading || !!error || !result || exporting} onClick={()=>exportReport('print')} className="border bg-white rounded-lg px-4 py-2 disabled:opacity-50">Print</button><button disabled={loading || !!error || !result || exporting} onClick={()=>exportReport('csv')} className="bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">{exporting?'Preparing…':'Export CSV'}</button></div>
      </div>
<>
      {!inventory && <>
      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm text-gray-600">From</span>
        <input type="date" value={start} onChange={e => setStart(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <span className="text-sm text-gray-600">To</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <button onClick={() => applyRange()} disabled={loading}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Search size={14} />{loading ? 'Loading…' : 'Search'}
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => applyRange(localDate(),localDate())} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 transition">Today</button>
          <button onClick={setThisWeek} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 transition">This Week</button>
          <button onClick={setThisMonth} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 transition">This Month</button>
        </div>
      </div>


      <p className="text-sm text-gray-500">Showing {range.start} to {range.end}</p>
      </>}
      {inventory && <div className="flex flex-wrap gap-3 items-center text-sm text-gray-600"><span>Current inventory snapshot</span>{report==='expiry' && <label>Include batches expiring within <select value={expiryDays} onChange={e=>setExpiryDays(Number(e.target.value))} className="border rounded-lg p-2 ml-2">{[30,60,90,180,365].map(days=><option key={days} value={days}>{days} days</option>)}</select> (includes expired batches)</label>}<button onClick={()=>setRefresh(value=>value+1)} className="border rounded-lg px-3 py-2">Refresh</button></div>}
      {report==='transactions' && <div className="flex flex-wrap gap-3 bg-white border rounded-xl p-4"><label className="text-sm">Cashier<select aria-label="Cashier filter" value={cashier} onChange={e=>setCashier(e.target.value)} className="block border rounded-lg p-2 mt-1"><option value="">All cashiers</option>{Array.from(new Map((result ?? []).map(tx=>[tx.UserId,tx.CashierName]))).map(([id,name])=><option key={id} value={String(id)}>{name}</option>)}</select></label><label className="text-sm">Payment<select aria-label="Payment filter" value={payment} onChange={e=>setPayment(e.target.value)} className="block border rounded-lg p-2 mt-1"><option value="">All methods</option>{Array.from(new Set((result ?? []).map(tx=>tx.PaymentMethod))).map(method=><option key={method}>{method}</option>)}</select></label><label className="text-sm">Status<select aria-label="Status filter" value={status} onChange={e=>setStatus(e.target.value)} className="block border rounded-lg p-2 mt-1"><option value="">All transactions</option><option value="Sale">Paid sales</option><option value="Return">Returns</option><option value="voided">Voided</option></select></label><button onClick={()=>{setCashier('');setPayment('');setStatus('');}} className="text-sm underline">Clear filters</button></div>}
      {loading && <div role="status" className="bg-white rounded-xl border p-6 text-gray-500">Loading report…</div>}
      {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error} <button onClick={()=>setRefresh(value=>value+1)} className="underline ml-2">Retry</button></div>}
      {!loading && !error && report === 'sales' && <SalesSummaryReport summary={result?.summary} previous={result?.previous} period={period}/>}
      {!loading && !error && report === 'transactions' && <TransactionHistoryReport txList={transactions} loading={loading} canVoid={canVoid} setVoidTx={setVoidTx} setVoidReason={setVoidReason}/>}
      {!loading && !error && ['fast-moving','slow-moving'].includes(report) && <MovementReport title={title} items={result?.Items ?? []} loading={loading} page={page} totalPages={Math.max(1,Math.ceil((result?.TotalRecords ?? 0)/10))} setPage={setPage}/>}
      {!loading && !error && inventory && <InventoryReport items={result ?? []} expiry={report==='expiry'}/>}
      </>
      {/* Void modal */}
      {voidTx && (
        <Modal title={'Void ' + voidTx.ReceiptNumber} onClose={() => setVoidTx(null)}>
          <p className="text-sm text-gray-600 mb-4">Enter the reason for voiding this transaction.</p>
          <input value={voidReason} onChange={e => setVoidReason(e.target.value)} autoFocus
            placeholder="Void reason…"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => setVoidTx(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button disabled={working} onClick={doVoid} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-bold transition">Void Transaction</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
