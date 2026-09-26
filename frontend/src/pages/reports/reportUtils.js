export const php = n => '₱' + (n ?? 0).toLocaleString('en-PH', {minimumFractionDigits: 2});
export const localDate = (date = new Date()) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
export const fmtDt = s => new Date(s).toLocaleString('en-PH', {month:'2-digit',day:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
export const REPORTS = [
  {id:'sales', label:'Sales Summary'},
  {id:'transactions', label:'Transaction History'},
  {id:'fast-moving', label:'Fast-Moving Items'},
  {id:'slow-moving', label:'Slow-Moving Items'},
  {id:'low-stock', label:'Low Stock', roles:['Admin','Pharmacist']},
  {id:'expiry', label:'Expiry', roles:['Admin','Pharmacist']},
];

export function previousPeriod(start, end) {
  const first = new Date(start+'T00:00:00'), last = new Date(end+'T00:00:00');
  const days = Math.round((Date.UTC(last.getFullYear(),last.getMonth(),last.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/86400000)+1;
  const previousEnd = new Date(first); previousEnd.setDate(previousEnd.getDate()-1);
  const previousStart = new Date(first); previousStart.setDate(previousStart.getDate()-days);
  return {start:localDate(previousStart),end:localDate(previousEnd)};
}
export function salesTotals(summary, transactions) {
  let returns=0,voids=0;
  for (const tx of transactions) {
    if(tx.IsVoided) voids += Number(tx.TotalAmount ?? 0);
    else if(tx.TransactionType === 'Return') returns += Number(tx.TotalAmount ?? 0);
  }
  return {...summary, Sales:Number(summary.TotalSales ?? 0), Returns:returns, Voids:voids, NetSales:Number(summary.TotalSales ?? 0)-returns};
}
export function filterTransactions(items, cashier, payment, status) {
  return items.filter(tx => (!cashier || String(tx.UserId)===cashier) && (!payment || tx.PaymentMethod===payment)
    && (!status || (status==='voided' ? tx.IsVoided : !tx.IsVoided && tx.TransactionType===status)));
}
export function csvText(columns, rows) {
  const escape = value => { let text=String(value ?? ''); if (/^[=+@-]/.test(text) && typeof value !== 'number') text="'"+text; return '"'+text.replaceAll('"','""')+'"'; };
  return '\uFEFF'+[columns.map(c=>escape(c.label)).join(','),...rows.map(row=>columns.map(c=>escape(row[c.key])).join(','))].join('\r\n');
}
export function downloadCsv(filename, columns, rows) {
  const url=URL.createObjectURL(new Blob([csvText(columns,rows)],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function printReport(title, subtitle, columns, rows) {
  const frame=document.createElement('iframe'); frame.title='Report print preview'; frame.style.cssText='position:fixed;width:0;height:0;border:0;';document.body.appendChild(frame);
  const doc=frame.contentDocument; doc.open();doc.write('<!doctype html><html><head><title></title><style>body{font:12px Arial;color:#111;padding:24px}h1{font-size:22px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body></body></html>');doc.close();doc.title=title;
  for(const [tag,text] of [['h1',title],['p',subtitle]]) { const el=doc.createElement(tag);el.textContent=text;doc.body.appendChild(el); }
  const table=doc.createElement('table'),head=table.createTHead().insertRow();
  columns.forEach(c=>{const th=doc.createElement('th');th.textContent=c.label;head.appendChild(th);});
  const body=table.createTBody();rows.forEach(row=>{const tr=body.insertRow();columns.forEach(c=>{tr.insertCell().textContent=String(row[c.key] ?? '');});});doc.body.appendChild(table);
  frame.contentWindow.onafterprint=()=>frame.remove();setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();},100);
}
