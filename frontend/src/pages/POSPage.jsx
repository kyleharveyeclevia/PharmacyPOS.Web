import { useState, useEffect, useRef, useCallback } from 'react';

import {
  productsApi,
  transactionsApi,
  customersApi,
} from '../services/api.js';

import toast from 'react-hot-toast';

import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  ShoppingCart,
  Printer,
} from 'lucide-react';

import ReceiptPreview from '../components/pos/ReceiptPreview.jsx';
import { useHardwareAgent } from '../context/HardwareAgentContext.jsx';
import { useTerminalAccess } from '../context/TerminalAccessContext.jsx';

const php = (n) =>
  '₱' +
  (n ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
  });

const toDecimal = (n, d) =>
  (n ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: d,
  });

const PAYMENTS = ['Cash', 'Card', 'GCash'];

const QUICK = [20, 50, 100, 200, 500, 1000];

export default function POSPage() {
  const { isAvailable } = useHardwareAgent();
  const { terminal } = useTerminalAccess();

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [isScPwd, setIsScPwd] = useState(false);
  const [discPct, setDiscPct] = useState(0);
  const [payment, setPayment] = useState('Cash');
  const [tendered, setTendered] = useState(0);
  const [rxNo, setRxNo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState('');
  const [receiptPreview,setReceiptPreview] = useState(null);
  const saleInFlight = useRef(false);
  const closeReceipt = () => { setReceiptPreview(null); setTimeout(()=>searchRef.current?.focus(),0); };

  const searchRef = useRef(null);
  const processSaleRef = useRef(null);

  useEffect(() => {
    customersApi.getAll().then((r) => {
      if (r.data.Success) {
        setCustomers(r.data.Data);
        setCustomerId(r.data.Data[0]?.Id ?? null);
      }
    });

    searchRef.current?.focus();
  }, []);

  // F12 global shortcut
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        processSaleRef.current?.();
      }
    };

    window.addEventListener('keydown', fn);

    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const { data } = await productsApi.search(search);

        if (data.Success) {
          setResults(data.Data);
        }
      } catch {
        // Ignore search errors
      }
    }, 200);

    return () => clearTimeout(t);
  }, [search]);

  const scanBarcode = async () => {
    const b = search.trim();

    if (!b) {
      return;
    }

    try {
      const { data } = await productsApi.byBarcode(b);

      if (data.Success) {
        addToCart(data.Data);
      } else {
        toast.error('Not found: ' + b);
      }
    } catch {
      toast.error('Product not found.');
    }
  };

  const addToCart = useCallback((p) => {
    if (!p.IsActive) {
      toast.error('Product is inactive.');
      return;
    }

    if (p.IsExpired) {
      toast.error(p.Name + ' is expired.');
      return;
    }

    setCart((prev) => {
      const ex = prev.find((c) => c.ProductId === p.Id);

      if (ex) {
        if (ex.Quantity >= (p.AvailableStockQuantity ?? p.StockQuantity)) {
          toast.error('Max stock: ' + (p.AvailableStockQuantity ?? p.StockQuantity));
          return prev;
        }

        return prev.map((c) =>
          c.ProductId === p.Id
            ? {
                ...c,
                Quantity: c.Quantity + 1,
                LineTotal: (c.Quantity + 1) * c.UnitPrice,
              }
            : c
        );
      }

      return [
        ...prev,
        {
          ProductId: p.Id,
          ProductName: p.Name,
          Barcode: p.Barcode,
          Quantity: 1,
          UnitPrice: p.SellingPrice,
          LineTotal: p.SellingPrice,
          RequiresPrescription: p.RequiresPrescription,
        },
      ];
    });

    setSearch('');
    setResults([]);
  }, []);

  const changeQty = (id, delta) =>
    setCart((prev) =>
      prev
        .map((c) =>
          c.ProductId === id
            ? {
                ...c,
                Quantity: Math.max(0, c.Quantity + delta),
                LineTotal:
                  Math.max(0, c.Quantity + delta) * c.UnitPrice,
              }
            : c
        )
        .filter((c) => c.Quantity > 0)
    );

  const removeItem = (id) =>
    setCart((prev) => prev.filter((c) => c.ProductId !== id));

  const clearCart = () => {
    if (!cart.length) {
      return;
    }

    if (!window.confirm('Clear all items?')) {
      return;
    }

    setCart([]);
  };

  // ── Totals: SC/PWD = RA 9994/RA 9442
  //    (20% on VAT-exclusive, VAT-exempt)
  const sub = cart.reduce((s, i) => s + i.LineTotal, 0);

  const {
    disc,
    vat,
    vatExemptAmount,
    total,
  } = (() => {
    if (isScPwd) {
      const vatExclusive = sub / 1.12;
      const removedVat = sub - vatExclusive;

      return {
        disc: vatExclusive * 0.20,
        vat: 0,
        vatExemptAmount: removedVat,
        total: vatExclusive * 0.80,
      };
    }

    const d = sub * (discPct / 100);

    return {
      disc: d,
      vat: ((sub - d) / 1.12) * 0.12,
      vatExemptAmount: 0,
      total: sub - d,
    };
  })();

  const change = tendered - total;

  const processSale = useCallback(async () => {
    if(saleInFlight.current || receiptPreview)return;
    if(!isAvailable){toast.error('Hardware agent is disconnected.');return;}
    if (!cart.length) {
      toast.error('Cart is empty.');
      return;
    }

    if (cart.some((i) => i.RequiresPrescription) && !rxNo) {
      if (
        !window.confirm(
          'Cart has Rx items. Continue without prescription number?'
        )
      ) {
        return;
      }
    }

    if (tendered < total) {
      toast.error(
        'Insufficient payment. Need: ' + php(total)
      );
      return;
    }

    saleInFlight.current=true;
    setProcessing(true);

    try {
      const { data } = await transactionsApi.sale({
        Items: cart,
        CustomerId: customerId,
        PaymentMethod: payment,
        AmountTendered: tendered,
        DiscountPercent: discPct,
        VatExemptAmount: vatExemptAmount,
        IsScPwd: isScPwd,
        PrescriptionNumber: rxNo || null,
        Notes: null,
        TerminalId: terminal?.Id,
      });

      if (!data.Success) {
        toast.error(data.Message);
        return;
      }

      setLastReceipt(data.Data.receiptNumber);
      setReceiptPreview({transaction:data.Data.transaction ?? null, transactionId:data.Data.transactionId, receiptNumber:data.Data.receiptNumber});

      toast.success(
        'Sale complete! Change: ' + php(data.Data.transaction?.Change ?? change)
      );

      setCart([]);
      setTendered(0);
      setDiscPct(0);
      setIsScPwd(false);
      setRxNo('');
      setCustomerId(customers[0]?.Id ?? null);

    } catch (e) {
      toast.error(
        e.response?.data?.Message ?? 'Sale failed.'
      );
    } finally {
      saleInFlight.current=false;
      setProcessing(false);
    }
  }, [
    cart,
    customerId,
    payment,
    tendered,
    discPct,
    isScPwd,
    rxNo,
    total,
    change,
    customers,
    terminal,
    vatExemptAmount,
    receiptPreview,
    isAvailable,
  ]);

  useEffect(() => {
    processSaleRef.current = processSale;
  }, [processSale]);

  return (
    <>
    <div inert={receiptPreview ? '' : undefined} aria-hidden={receiptPreview ? true : undefined} className="flex h-full overflow-hidden bg-gray-100">
      {/* Left: Search + Cart */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        {/* Search Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && scanBarcode()
                }
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Scan barcode or search product… (Enter to scan)"
              />
            </div>

            <button
              onClick={scanBarcode}
              className="rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              ADD
            </button>
          </div>

          {/* Dropdown Results */}
          {results.length > 0 && (
            <div className="mt-2 max-h-52 overflow-y-auto overflow-hidden rounded-lg border border-gray-200 shadow-md">
              {results.map((p) => (
                <button
                  key={p.Id}
                  onMouseDown={() => addToCart(p)}
                  className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-2.5 text-left text-sm last:border-0 hover:bg-green-50"
                >
                  <div>
                    <span className="font-semibold text-gray-800">
                      {p.Name}
                    </span>

                    {p.RequiresPrescription && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                        Rx
                      </span>
                    )}

                    <div className="mt-0.5 text-xs text-gray-400">
                      {p.GenericName} · {p.Barcode}
                    </div>
                  </div>

                  <div className="ml-4 shrink-0 text-right">
                    <div className="font-bold text-green-600">
                      {php(p.SellingPrice)}
                    </div>

                    <div
                      className={
                        'text-xs ' +
                        (p.IsLowStock
                          ? 'font-medium text-amber-600'
                          : 'text-gray-400')
                      }
                    >
                      Stock: {(p.AvailableStockQuantity ?? p.StockQuantity)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-green-100 bg-green-50 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <ShoppingCart size={15} />
              Cart — {cart.reduce((s, i) => s + i.Quantity, 0)} item(s)
            </div>

            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-600"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-16 text-gray-300">
                <ShoppingCart size={48} />
                <p className="mt-2 text-sm">Cart is empty</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">
                      Product
                    </th>

                    <th className="px-4 py-2.5 text-right">
                      Price
                    </th>

                    <th className="w-28 px-4 py-2.5 text-center">
                      Qty
                    </th>

                    <th className="px-4 py-2.5 text-right">
                      Total
                    </th>

                    <th className="w-8 px-2 py-2.5" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <tr
                      key={item.ProductId}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-800">
                          {item.ProductName}
                        </div>

                        {item.RequiresPrescription && (
                          <span className="text-xs font-medium text-red-500">
                            Rx Required
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {php(item.UnitPrice)}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              changeQty(item.ProductId, -1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"
                          >
                            <Minus size={11} />
                          </button>

                          <span className="w-6 text-center font-bold tabular-nums">
                            {item.Quantity}
                          </span>

                          <button
                            onClick={() =>
                              changeQty(item.ProductId, 1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 transition hover:bg-green-200"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right font-bold text-green-600">
                        {php(item.LineTotal)}
                      </td>

                      <td className="px-2 py-2.5">
                        <button
                          onClick={() =>
                            removeItem(item.ProductId)
                          }
                          className="text-gray-300 transition hover:text-red-500"
                        >
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

      {/* Right: Payment Panel */}
      <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto p-4">
        {/* Customer + Discount */}
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Customer
            </label>

            <select
              value={customerId ?? ''}
              onChange={(e) => {
                const c = customers.find(
                  (c) => c.Id === Number(e.target.value)
                );

                setCustomerId(c?.Id ?? null);
                setIsScPwd(
                  !!(c?.IsSeniorCitizen || c?.IsPWD)
                );
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
            >
              {customers.map((c) => (
                <option key={c.Id} value={c.Id}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={isScPwd}
              onChange={(e) =>
                setIsScPwd(e.target.checked)
              }
              className="h-4 w-4 accent-green-600"
            />

            <span className="text-sm font-semibold text-green-700">
              SC / PWD — 20% VAT-Exempt
            </span>
          </label>

          {!isScPwd && (
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-gray-600">
                Discount %
              </span>

              <input
                type="number"
                min={0}
                max={100}
                value={discPct}
                onChange={(e) =>
                  setDiscPct(
                    Math.min(
                      100,
                      Math.max(0, Number(e.target.value))
                    )
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          <input
            value={rxNo}
            onChange={(e) => setRxNo(e.target.value)}
            placeholder="Prescription # (if applicable)"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Totals */}
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Subtotal (VAT-incl.):
            </span>

            <span className="text-gray-800">
              {php(sub)}
            </span>
          </div>

          {disc > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {isScPwd
                  ? 'SC/PWD Disc (20% of excl.):'
                  : 'Discount (' + discPct + '%):'}
              </span>

              <span className="font-semibold text-red-600">
                − {php(disc)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              VAT (12%):
            </span>

            <span
              className={
                isScPwd
                  ? 'font-semibold italic text-amber-600'
                  : 'text-gray-500'
              }
            >
              {isScPwd ? 'EXEMPT' : php(vat)}
            </span>
          </div>

          {isScPwd && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs leading-relaxed text-amber-700">
              RA 9994/RA 9442 — 20% on VAT-exclusive price.
              Transaction is VAT-exempt.
            </p>
          )}

          <div className="flex items-center justify-between border-t border-green-200 pt-2">
            <span className="text-base font-bold text-green-900">
              TOTAL DUE
            </span>

            <span className="text-2xl font-bold tabular-nums text-green-700">
              {php(total)}
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
              Payment Method
            </label>

            <div className="flex flex-wrap gap-1.5">
              {PAYMENTS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition ' +
                    (payment === m
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-green-400 hover:text-green-600')
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Amount Tendered
            </label>

            <div className="flex items-stretch gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={tendered || ''}
                onChange={(e) =>
                  setTendered(Number(e.target.value))
                }
                className="min-w-0 w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-right text-xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />

              <button
                onClick={() =>
                  setTendered(Number(total.toFixed(2)))
                }
                className="rounded-lg bg-teal-600 px-1 text-xs font-bold text-white transition hover:bg-teal-700"
              >
                EXACT
              </button>
            </div>
          </div>

          {/* Quick Cash */}
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK.map((amt) => (
              <button
                key={amt}
                onClick={() =>
                  setTendered((p) => p + amt)
                }
                className="rounded-lg border border-gray-300 py-1.5 text-xs font-semibold transition hover:border-green-300 hover:bg-gray-50"
              >
                +₱{amt}
              </button>
            ))}
          </div>

          {/* Change */}
          <div
            className={
              'flex items-center justify-between rounded-xl px-4 py-3 ' +
              (change >= 0
                ? 'border border-green-200 bg-green-50'
                : 'border border-red-200 bg-red-50')
            }
          >
            <span className="text-sm font-bold text-gray-700">
              CHANGE
            </span>

            <span
              className={
                'text-2xl font-bold tabular-nums ' +
                (change >= 0
                  ? 'text-green-600'
                  : 'text-red-600')
              }
            >
              {php(Math.max(change, 0))}
            </span>
          </div>

          {/* Process Button */}
          <button
            onClick={processSale}
            disabled={
              processing || !!receiptPreview ||
              cart.length === 0 ||
              !isAvailable
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
          >
            {processing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle size={18} />
            )}

            {processing
              ? 'Processing...'
              : !isAvailable
                ? 'HARDWARE AGENT REQUIRED'
                : 'PROCESS SALE'}
          </button>

          {lastReceipt && (
            <div className="text-center">
              <span className="flex items-center justify-center gap-1 text-xs text-green-500">
                <Printer size={11} />
                Last: {lastReceipt}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
    {receiptPreview && <ReceiptPreview receipt={receiptPreview} terminalName={terminal?.TerminalName} onClose={closeReceipt}/>}
    </>
  );
}
