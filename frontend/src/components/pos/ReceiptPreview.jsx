import {useState,useEffect,useRef,useMemo} from 'react';
import {transactionsApi} from '../../services/api.js';
import {useHardwareAgent} from '../../context/HardwareAgentContext.jsx';
import {receiptText} from './receiptText.js';

export default function ReceiptPreview({receipt,terminalName,onClose,reprint = false}) {
  const {isAvailable,printReceipt}=useHardwareAgent();
  const [transaction,setTransaction]=useState(receipt.transaction);
  const [loading,setLoading]=useState(!receipt.transaction);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [printing,setPrinting]=useState(false);
  const [sent,setSent]=useState(false);
  const printInFlight=useRef(false),dialogRef=useRef(null),closeRef=useRef(null);
  const text=useMemo(()=>transaction?receiptText(transaction,{storeName:__APP_NAME__,terminalName,reprint}):'', [transaction,terminalName,reprint]);
  useEffect(()=>{
    if(receipt.transaction)return;
    let active=true;setLoading(true);setError('');
    const request=receipt.transactionId?transactionsApi.getById(receipt.transactionId):transactionsApi.byReceipt(receipt.receiptNumber);
    request.then(({data})=>{if(!data.Success || !data.Data)throw new Error(data.Message || 'Receipt unavailable.');if(active)setTransaction(data.Data);})
      .catch(error=>{if(active)setError(error.response?.data?.Message || error.message || 'Unable to load receipt.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[receipt,retry]);
  useEffect(()=>{closeRef.current?.focus();},[]);
  const sendPrint=async()=> {
    if(printInFlight.current || sent || !transaction)return;
    printInFlight.current=true;setPrinting(true);setError('');
    try {await printReceipt(text);setSent(true);}
    catch(error){setError(error.message || 'Unable to send receipt to the hardware agent.');}
    finally{printInFlight.current=false;setPrinting(false);}
  };
  const onKeyDown=e=> {
    if(e.key==='Escape'){e.preventDefault();if(!printing)onClose();}
    if(e.key==='Tab'){
      const buttons=Array.from(dialogRef.current.querySelectorAll('button:not(:disabled)'));
      const first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div ref={dialogRef} onKeyDown={onKeyDown} role="dialog" aria-modal="true" aria-labelledby="receipt-preview-title" className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-gray-50 shadow-2xl">
      <div className="border-b bg-white px-6 py-4 rounded-t-2xl"><h2 id="receipt-preview-title" className="text-lg font-bold text-gray-800">{reprint ? 'Receipt Details / Reprint' : 'Receipt Preview'}</h2><p className="text-sm text-green-700">{reprint ? 'Saved receipt' : 'Sale completed'} · {receipt.receiptNumber}</p></div>
      <div className="min-h-0 overflow-y-auto p-5">
        {loading?<p role="status" className="text-center text-gray-500 p-6">Loading receipt…</p>:transaction?<pre className="whitespace-pre-wrap break-words rounded-lg border bg-white p-5 font-mono text-sm leading-relaxed text-gray-800">{text}</pre>:null}
        {error && <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}{!transaction && <button onClick={()=>setRetry(value=>value+1)} className="ml-2 underline">Retry</button>}</div>}
        {sent && <p role="status" className="mt-3 text-sm text-green-700">Receipt sent to the hardware agent.</p>}
        {!isAvailable && !sent && <p className="mt-3 text-sm text-amber-700">Hardware agent disconnected. You can close this preview without printing.</p>}
      </div>
      <div className="flex gap-3 border-t bg-white p-4 rounded-b-2xl">
        <button ref={closeRef} disabled={printing} onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Close</button>
        <button disabled={printing || loading || !transaction || !isAvailable || sent} onClick={sendPrint} className="flex-1 rounded-lg bg-green-700 px-4 py-2.5 font-semibold text-white hover:bg-green-800 disabled:opacity-50">{printing?'Sending…':sent?'Sent':reprint?'Reprint':'Print'}</button>
      </div>
    </div>
  </div>;
}
