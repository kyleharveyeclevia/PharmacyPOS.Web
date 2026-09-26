const amount = value => Number(value ?? 0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
export function receiptText(transaction, {storeName, terminalName, reprint = false} = {}) {
  const lines=[storeName || 'Pharmacy', ...(reprint ? ['*** REPRINT ***'] : []), transaction.TransactionType === 'Return' ? 'RETURN RECEIPT' : 'SALES RECEIPT', 'Receipt: '+transaction.ReceiptNumber,
    new Date(transaction.TransactionDate).toLocaleString('en-PH'), 'Cashier: '+transaction.CashierName];
  if(terminalName)lines.push('Terminal: '+terminalName);
  if(transaction.CustomerName)lines.push('Customer: '+transaction.CustomerName);
  if(transaction.IsVoided){lines.push('STATUS: VOIDED');if(transaction.VoidReason)lines.push('Void reason: '+transaction.VoidReason);}
  lines.push('--------------------------------');
  for(const item of transaction.Items ?? []) {
    lines.push(item.ProductName, '  '+item.Quantity+' x PHP '+amount(item.UnitPrice)+' = PHP '+amount(item.LineTotal));
  }
  lines.push('--------------------------------', 'Subtotal: PHP '+amount(transaction.SubTotal), 'Discount: PHP '+amount(transaction.DiscountAmount),
    'VAT included: PHP '+amount(transaction.VatAmount), 'TOTAL: PHP '+amount(transaction.TotalAmount),
    'Payment: '+transaction.PaymentMethod, 'Tendered: PHP '+amount(transaction.AmountTendered), 'Change: PHP '+amount(transaction.Change));
  if(transaction.PrescriptionNumber)lines.push('Prescription: '+transaction.PrescriptionNumber);
  lines.push('--------------------------------','Thank you!');
  return lines.join('\n');
}
