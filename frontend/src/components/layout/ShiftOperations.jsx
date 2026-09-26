import {useState} from 'react';
import {authApi,reportsApi} from '../../services/api.js';
import toast from 'react-hot-toast';
import ShiftReport from '../../pages/reports/ShiftReport.jsx';
import {printReport,downloadCsv} from '../../pages/reports/reportUtils.js';
export default function ShiftOperations({onClose,onLogout}) {
  const [working,setWorking]=useState(false), [cash,setCash]=useState(''), [confirmation,setConfirmation]=useState('');
  const [xread,setXread]=useState(null),[zread,setZread]=useState(null);
  const generateX = async()=> {setWorking(true);try {const {data}=await reportsApi.xread();if(!data.Success)throw new Error(data.Message);setXread(data.Data);}catch(error){toast.error(error.response?.data?.Message || error.message || 'X-Read failed.');}finally{setWorking(false);}};
  const endShift = async()=> {
    if(confirmation.trim().toUpperCase()!=='ENDSHIFT'){toast.error('Enter ENDSHIFT to confirm.');return;}
    const amount=Number(cash);if(!cash.trim() || !Number.isFinite(amount) || amount<0){toast.error('Enter valid closing cash.');return;}
    setWorking(true);try {const {data}=await reportsApi.zread(amount);if(!data.Success)throw new Error(data.Message);setZread(data.Data);setXread(null);toast.success('Shift closed.');}
    catch(error){toast.error(error.response?.data?.Message || error.message || 'Unable to close shift.');}finally{setWorking(false);}
  };
  const logoutOnly=async()=>{setWorking(true);try {const {data}=await authApi.logout(0,false);if(!data.Success)throw new Error(data.Message);onLogout();}catch(error){toast.error(error.response?.data?.Message || error.message || 'Logout failed.');}finally{setWorking(false);}};
  const exportShift = mode => {
    const report=zread || xread;
    const rows=Object.entries(report).filter(([,value])=>!Array.isArray(value) && (value===null || typeof value!=='object')).map(([Metric,Value])=>({Metric,Value}));
    const columns=[{key:'Metric',label:'Metric'},{key:'Value',label:'Value'}];
    if(mode==='csv')downloadCsv(zread?'z-read.csv':'x-read.csv',columns,rows);else printReport(zread?'Z-Read':'X-Read','Current cashier session',columns,rows);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="shift-title" className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4"><h2 id="shift-title" className="text-xl font-bold">Logout / End Shift</h2><button disabled={working} onClick={zread?onLogout:onClose} className="text-sm text-gray-500">{zread?'Finish & Logout':'Close'}</button></div>
      {zread ? <p className="mb-4 text-green-700">Your session is closed. Review or print the Z-Read, then finish and log out.</p> : <>
        <p className="text-sm text-gray-500 mb-4">X-Read reviews the current shift. Z-Read reconciles your cash and closes the shift.</p>
        <button disabled={working} onClick={generateX} className="bg-teal-600 text-white rounded-lg px-4 py-2 mb-4 disabled:opacity-50">Generate X-Read</button>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <label className="text-sm">Actual closing cash (PHP)<input type="number" min="0" step="0.01" value={cash} onChange={e=>setCash(e.target.value)} className="block w-full mt-1 border rounded-lg p-2" placeholder="0.00"/></label>
          <label className="text-sm">Type ENDSHIFT to confirm<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="block w-full mt-1 border rounded-lg p-2"/></label>
        </div>
        <div className="flex gap-3 mb-5"><button disabled={working} onClick={logoutOnly} className="border rounded-lg px-4 py-2 disabled:opacity-50">Logout Only</button><button disabled={working} onClick={endShift} className="bg-red-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">Generate Z-Read & End Shift</button></div>
      </>}
      {(xread || zread) && <div className="flex gap-3 mb-4"><button onClick={()=>exportShift('print')} className="border rounded-lg px-3 py-2">Print</button><button onClick={()=>exportShift('csv')} className="border rounded-lg px-3 py-2">Export CSV</button></div>}
      <ShiftReport xread={xread} zread={zread} setXread={setXread} setZread={()=>{}}/>
      {zread && <button onClick={onLogout} className="mt-4 bg-green-700 text-white rounded-lg px-4 py-2">Finish & Logout</button>}
    </div>
  </div>;
}
