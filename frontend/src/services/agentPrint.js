export async function sendReceiptToAgent(connection, text, printer = null) {
  if(!connection || connection.state !== 'Connected')throw new Error('Hardware agent is disconnected. Reconnect it before printing.');
  if(!text?.trim())throw new Error('Receipt text is empty.');
  const result=await connection.invoke('Print',{Text:text,Printer:printer});
  const success=result?.Success ?? result?.success;
  if(!success)throw new Error(result?.Message || result?.message || 'Hardware agent rejected the print request.');
  return result;
}
