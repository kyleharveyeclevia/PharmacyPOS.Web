import { useState, useEffect, useRef, useCallback } from 'react';
import { productsApi, transactionsApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { Search, X, Plus, Minus, Trash2, CheckCircle, ShoppingCart, Printer } from 'lucide-react';

const php = (n) => '₱' + (n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const PAYMENTS = ['Cash', 'Card', 'GCash'];
const QUICK    = [20, 50, 100, 200, 500, 1000];

export default function POSPage() {
  const [cart, setCart]                     = useState([]);
  const [search, setSearch]                 = useState('');
  const [results, setResults]               = useState([]);
  const [customers, setCustomers]           = useState([]);
  const [customerId, setCustomerId]         = useState(null);
  const [isScPwd, setIsScPwd]               = useState(false);
  const [discPct, setDiscPct]               = useState(0);
  const [payment, setPayment]               = useState('Cash');
  const [tendered, setTendered]             = useState(0);
  const [rxNo, setRxNo]                     = useState('');
  const [processing, setProcessing]         = useState(false);
  const [lastReceipt, setLastReceipt]       = useState('');
  const searchRef    = useRef(null);
  const processSaleRef = useRef(null);

  useEffect(() => {
    productsApi.customers().then(r => {
      if (r.data.Success) {
        setCustomers(r.data.Data);
        setCustomerId(r.data.Data[0]?.Id ?? null);
      }
    });
    searchRef.current?.focus();
  }, []);

  // F12 global shortcut
  useEffect(() => {
    const fn = (e) => { if (e.key === 'F12') { e.preventDefault(); processSaleRef.current?.(); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await productsApi.search(search); if (data.Success) setResults(data.Data); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const scanBarcode = async () => {
    const b = search.trim();
    if (!b) return;
    try {
      const { data } = await productsApi.byBarcode(b);
      if (data.Success) addToCart(data.Data);
      else toast.error('Not found: ' + b);
    } catch { toast.error('Product not found.'); }
  };

  const addToCart = useCallback((p) => {
    if (!p.IsActive) { toast.error('Product is inactive.'); return; }
    if (p.IsExpired) { toast.error(p.Name + ' is expired.'); return; }
    setCart(prev => {
      const ex = prev.find(c => c.ProductId === p.Id);
      if (ex) {
        if (ex.Quantity >= p.StockQuantity) { toast.error('Max stock: ' + p.StockQuantity); return prev; }
        return prev.map(c => c.ProductId === p.Id
          ? { ...c, Quantity: c.Quantity + 1, LineTotal: (c.Quantity + 1) * c.UnitPrice } : c);
      }
      return [...prev, { ProductId: p.Id, ProductName: p.Name, Barcode: p.Barcode,
        Quantity: 1, UnitPrice: p.SellingPrice, LineTotal: p.SellingPrice,
        RequiresPrescription: p.RequiresPrescription }];
    });
    setSearch(''); setResults([]);
  }, []);

  const changeQty = (id, delta) =>
    setCart(prev => prev.map(c => c.ProductId === id
      ? { ...c, Quantity: Math.max(0, c.Quantity + delta), LineTotal: Math.max(0, c.Quantity + delta) * c.UnitPrice }
      : c).filter(c => c.Quantity > 0));

  const removeItem = (id) => setCart(prev => prev.filter(c => c.ProductId !== id));
  const clearCart  = () => { if (!cart.length) return; if (!window.confirm('Clear all items?')) return; setCart([]); };

  // ── Totals: SC/PWD = RA 9994/RA 9442 (20% on VAT-exclusive, VAT-exempt) ──
  const sub = cart.reduce((s, i) => s + i.LineTotal, 0);
  const { disc, vat, total } = (() => {
    if (isScPwd) {
      const x = sub / 1.12;
      return { disc: x * 0.20, vat: 0, total: x * 0.80 };
    }
    const d = sub * (discPct / 100);
    return { disc: d, vat: (sub - d) / 1.12 * 0.12, total: sub - d };
  })();
  const change = tendered - total;

  const processSale = useCallback(async () => {
    if (!cart.length) { toast.error('Cart is empty.'); return; }
    if (cart.some(i => i.RequiresPrescription) && !rxNo)
      if (!window.confirm('Cart has Rx items. Continue without prescription number?')) return;
    if (tendered < total) { toast.error('Insufficient payment. Need: ' + php(total)); return; }

    setProcessing(true);
    try {
      const { data } = await transactionsApi.sale({
        Items: cart, CustomerId: customerId, PaymentMethod: payment,
        AmountTendered: tendered, DiscountPercent: discPct,
        IsScPwd: isScPwd, PrescriptionNumber: rxNo || null, Notes: null
      });
      if (!data.Success) { toast.error(data.Message); return; }
      setLastReceipt(data.Data.receiptNumber);
      toast.success('✅ Sale complete!  Change: ' + php(change));
      setCart([]); setTendered(0); setDiscPct(0);
      setIsScPwd(false); setRxNo('');
      setCustomerId(customers[0]?.Id ?? null);
      searchRef.current?.focus();
    } catch (e) {
      toast.error(e.response?.data?.Message ?? 'Sale failed.');
    } finally { setProcessing(false); }
  }, [cart, customerId, payment, tendered, discPct, isScPwd, rxNo, total, change, customers]);

  useEffect(() => { processSaleRef.current = processSale; }, [processSale]);

  return (
    <div className="flex h-full overflow-hidden bg-gray-100">

      {/* ── Left: Search + Cart ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">

        {/* Search bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={searchRef} value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && scanBarcode()}
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Scan barcode or search product… (Enter to scan)" />
            </div>
            <button onClick={scanBarcode}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 rounded-lg text-sm font-semibold transition">
              ADD
            </button>
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto shadow-md">
              {results.map(p => (
                <button key={p.Id} onMouseDown={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 text-left text-sm border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-semibold text-gray-800">{p.Name}</span>
                    {p.RequiresPrescription && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Rx</span>}
                    <div className="text-xs text-gray-400 mt-0.5">{p.GenericName} · {p.Barcode}</div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <div className="font-bold text-green-600">{php(p.SellingPrice)}</div>
                    <div className={'text-xs ' + (p.IsLowStock ? 'text-amber-600 font-medium' : 'text-gray-400')}>
                      Stock: {p.StockQuantity}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <ShoppingCart size={15} />
              Cart — {cart.reduce((s, i) => s + i.Quantity, 0)} item(s)
            </div>
            <button onClick={clearCart} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 transition">
              <Trash2 size={12} /> Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
                <ShoppingCart size={48} />
                <p className="text-sm mt-2">Cart is empty</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 text-xs text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Product</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-center w-28">Qty</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-2 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map(item => (
                    <tr key={item.ProductId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-800">{item.ProductName}</div>
                        {item.RequiresPrescription && <span className="text-xs text-red-500 font-medium">Rx Required</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{php(item.UnitPrice)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => changeQty(item.ProductId, -1)}
                            className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition">
                            <Minus size={11} />
                          </button>
                          <span className="font-bold w-6 text-center tabular-nums">{item.Quantity}</span>
                          <button onClick={() => changeQty(item.ProductId, 1)}
                            className="w-6 h-6 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center transition">
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-600">{php(item.LineTotal)}</td>
                      <td className="px-2 py-2.5">
                        <button onClick={() => removeItem(item.ProductId)} className="text-gray-300 hover:text-red-500 transition">
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Payment Panel ─────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col gap-3 p-4 overflow-y-auto">

        {/* Customer + Discount */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Customer</label>
            <select value={customerId ?? ''} onChange={e => {
              const c = customers.find(c => c.Id === Number(e.target.value));
              setCustomerId(c?.Id ?? null);
              setIsScPwd(!!(c?.IsSeniorCitizen || c?.IsPWD));
            }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              {customers.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isScPwd} onChange={e => setIsScPwd(e.target.checked)} className="w-4 h-4 accent-green-600" />
            <span className="text-sm font-semibold text-green-700">SC / PWD — 20% VAT-Exempt</span>
          </label>

          {!isScPwd && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">Discount %</span>
              <input type="number" min={0} max={100} value={discPct}
                onChange={e => setDiscPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          )}

          <input value={rxNo} onChange={e => setRxNo(e.target.value)}
            placeholder="Prescription # (if applicable)"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
        </div>

        {/* Totals */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal (VAT-incl.):</span>
            <span className="text-gray-800">{php(sub)}</span>
          </div>
          {disc > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{isScPwd ? 'SC/PWD Disc (20% of excl.):' : 'Discount (' + discPct + '%):'}</span>
              <span className="text-red-600 font-semibold">− {php(disc)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (12%):</span>
            <span className={isScPwd ? 'text-amber-600 font-semibold italic' : 'text-gray-500'}>
              {isScPwd ? 'EXEMPT' : php(vat)}
            </span>
          </div>
          {isScPwd && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 leading-relaxed">
              RA 9994/RA 9442 — 20% on VAT-exclusive price. Transaction is VAT-exempt.
            </p>
          )}
          <div className="border-t border-green-200 pt-2 flex justify-between items-center">
            <span className="text-base font-bold text-green-900">TOTAL DUE</span>
            <span className="text-2xl font-bold text-green-700 tabular-nums">{php(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Payment Method</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENTS.map(m => (
                <button key={m} onClick={() => setPayment(m)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-semibold border transition ' +
                    (payment === m ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-600')}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount Tendered</label>
            <div className="flex gap-2 items-stretch">
              <input type="number" min={0} step={0.01} value={tendered || ''}
                onChange={e => setTendered(Number(e.target.value))}
                 className="w-full min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xl font-bold text-right tabular-nums focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="0.00" />
              <button onClick={() => setTendered(total)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-1 rounded-lg text-xs font-bold transition">
                EXACT
              </button>
            </div>
          </div>

          {/* Quick cash */}
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK.map(amt => (
              <button key={amt} onClick={() => setTendered(p => p + amt)}
                className="border border-gray-300 rounded-lg py-1.5 text-xs font-semibold hover:bg-gray-50 hover:border-green-300 transition">
                +₱{amt}
              </button>
            ))}
          </div>

          {/* Change */}
          <div className={'rounded-xl px-4 py-3 flex justify-between items-center ' +
            (change >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
            <span className="text-sm font-bold text-gray-700">CHANGE</span>
            <span className={'text-2xl font-bold tabular-nums ' + (change >= 0 ? 'text-green-600' : 'text-red-600')}>
              {php(Math.max(change, 0))}
            </span>
          </div>

          {/* Process button */}
          <button onClick={processSale} disabled={processing || cart.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-md text-sm">
            {processing
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <CheckCircle size={18} />}
            {processing ? 'Processing...' : 'PROCESS SALE '}
          </button>

          {lastReceipt && (
            <div className="text-center">
              <span className="text-xs text-green-500 flex items-center gap-1 justify-center">
                <Printer size={11} /> Last: {lastReceipt}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
