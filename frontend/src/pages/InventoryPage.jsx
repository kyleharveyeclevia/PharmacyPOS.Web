import { useEffect, useState, useCallback } from 'react';
import { productsApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, PackageMinus, ToggleLeft, ToggleRight, RefreshCw, X, AlertTriangle } from 'lucide-react';

const php  = (n) => '₱' + (n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const iCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const blank = () => ({
  Id: 0, Barcode: '', Name: '', GenericName: '', Description: '',
  Unit: 'tab', CategoryId: 0, SupplierId: null,
  CostPrice: 0, SellingPrice: 0, StockQuantity: 0, ReorderLevel: 10,
  RequiresPrescription: false, IsActive: true, ExpiryDate: null
});

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function InventoryPage() {
  const [products, setProducts]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('All');
  const [lowOnly, setLowOnly]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editTitle, setEditTitle]   = useState('');
  const [form, setForm]             = useState(blank());
  const [saving, setSaving]         = useState(false);
  const [adjProduct, setAdjProduct] = useState(null);
  const [adjQty, setAdjQty]         = useState('');
  const [adjReason, setAdjReason]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        productsApi.getAll(), productsApi.categories(), productsApi.suppliers()
      ]);
      if (pRes.data.Success) setProducts(pRes.data.Data);
      if (cRes.data.Success) setCategories(cRes.data.Data);
      if (sRes.data.Success) setSuppliers(sRes.data.Data);
    } catch { toast.error('Failed to load inventory.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let f = products;
    if (search) f = f.filter(p =>
      p.Name.toLowerCase().includes(search.toLowerCase()) ||
      p.GenericName.toLowerCase().includes(search.toLowerCase()) ||
      p.Barcode.includes(search));
    if (catFilter !== 'All') f = f.filter(p => p.CategoryName === catFilter);
    if (lowOnly) f = f.filter(p => p.IsLowStock);
    setFiltered(f);
  }, [products, search, catFilter, lowOnly]);

  const openAdd = () => {
    setForm(blank());
    setEditTitle('Add New Product');
    setEditing(true);
  };

  const openEdit = (p) => {
    setForm({
      Id: p.Id, Barcode: p.Barcode, Name: p.Name,
      GenericName: p.GenericName, Description: p.Description,
      Unit: p.Unit, CategoryId: p.CategoryId, SupplierId: p.SupplierId,
      CostPrice: p.CostPrice, SellingPrice: p.SellingPrice,
      StockQuantity: p.StockQuantity, ReorderLevel: p.ReorderLevel,
      RequiresPrescription: p.RequiresPrescription, IsActive: p.IsActive,
      ExpiryDate: p.ExpiryDate ? p.ExpiryDate.split('T')[0] : null
    });
    setEditTitle('Edit Product');
    setEditing(true);
  };

  const save = async () => {
    if (!form.Barcode)          { toast.error('Barcode is required.');     return; }
    if (!form.Name)             { toast.error('Name is required.');        return; }
    if (form.SellingPrice <= 0) { toast.error('Selling price must > 0.'); return; }
    if (!form.CategoryId)       { toast.error('Select a category.');       return; }
    setSaving(true);
    try {
      const isNew = form.Id === 0;
      const { data } = isNew
        ? await productsApi.create(form)
        : await productsApi.update(form.Id, form);
      if (!data.Success) { toast.error(data.Message); return; }
      toast.success(isNew ? 'Product added!' : 'Product updated!');
      setEditing(false);
      load();
    } catch (e) { toast.error(e.response?.data?.Message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    if (!window.confirm((p.IsActive ? 'Deactivate' : 'Activate') + ' "' + p.Name + '"?')) return;
    try {
      const { data } = await productsApi.toggle(p.Id, {
        ...p, IsActive: p.IsActive,
        ExpiryDate: p.ExpiryDate ? p.ExpiryDate.split('T')[0] : null
      });
      if (!data.Success) { toast.error(data.Message); return; }
      toast.success(data.Message);
      load();
    } catch { toast.error('Toggle failed.'); }
  };

  const adjustStock = async () => {
    const qty = parseInt(adjQty);
    if (isNaN(qty) || qty === 0) { toast.error('Enter a non-zero adjustment.'); return; }
    if (!adjReason.trim())       { toast.error('Reason is required.');          return; }
    try {
      const { data } = await productsApi.adjustStock(adjProduct.Id, qty, adjReason);
      if (!data.Success) { toast.error(data.Message); return; }
      toast.success(data.Message);
      setAdjProduct(null); setAdjQty(''); setAdjReason('');
      load();
    } catch { toast.error('Adjustment failed.'); }
  };

  const cats       = ['All', ...Array.from(new Set(products.map(p => p.CategoryName)))];
  const totalValue = products.filter(p => p.IsActive).reduce((s, p) => s + p.StockQuantity * p.CostPrice, 0);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Table area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                ['blue',  'Total: '      + products.length],
                ['red',   'Low Stock: '  + products.filter(p => p.IsLowStock && p.IsActive).length],
                ['amber', 'Expired: '    + products.filter(p => p.IsExpired  && p.IsActive).length],
                ['green', 'Value: '      + php(totalValue)],
              ].map(([color, label]) => (
                <span key={label} className={
                  'px-2.5 py-0.5 rounded-full text-xs font-medium ' + (
                    color === 'blue'  ? 'bg-blue-100  text-blue-700'  :
                    color === 'red'   ? 'bg-red-100   text-red-700'   :
                    color === 'amber' ? 'bg-amber-100 text-amber-700' :
                                       'bg-green-100 text-green-700')
                }>{label}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mb-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, barcode or generic..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="accent-red-600" />
            <span className="text-red-600 font-medium">Low Stock Only</span>
          </label>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Rx</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.Id} className={
                    'hover:bg-gray-50 transition ' +
                    (p.IsExpired ? 'bg-red-50' : p.IsLowStock ? 'bg-amber-50' : '')
                  }>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.Barcode}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{p.Name}</div>
                      <div className="text-xs text-gray-400">{p.GenericName}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{p.CategoryName}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{php(p.CostPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-green-600">{php(p.SellingPrice)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={'font-bold text-base ' + (p.IsLowStock ? 'text-red-600' : 'text-gray-800')}>
                        {p.StockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.RequiresPrescription
                        ? <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Rx</span>
                        : <span className="text-xs text-green-600">OTC</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={
                        'px-2 py-0.5 rounded-full text-xs font-medium ' +
                        (p.IsExpired   ? 'bg-red-100   text-red-700'   :
                         !p.IsActive   ? 'bg-gray-100  text-gray-500'  :
                         p.IsExpiringSoon ? 'bg-amber-100 text-amber-700' :
                                        'bg-green-100 text-green-700')
                      }>
                        {p.IsExpired ? 'EXPIRED' : !p.IsActive ? 'INACTIVE' : p.IsExpiringSoon ? 'EXPIRING' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { setAdjProduct(p); setAdjQty(''); setAdjReason(''); }} title="Adjust Stock"
                          className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition">
                          <PackageMinus size={14} />
                        </button>
                        <button onClick={() => toggleActive(p)} title={p.IsActive ? 'Deactivate' : 'Activate'}
                          className={'p-1.5 rounded-lg transition ' + (p.IsActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}>
                          {p.IsActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Edit / Add panel ────────────────────────────────────────────── */}
      {editing && (
        <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">{editTitle}</h2>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <Field label="Barcode *">
              <input value={form.Barcode} onChange={e => setF('Barcode', e.target.value)} className={iCls} placeholder="Scan or type barcode" />
            </Field>
            <Field label="Product Name *">
              <input value={form.Name} onChange={e => setF('Name', e.target.value)} className={iCls} />
            </Field>
            <Field label="Generic Name">
              <input value={form.GenericName} onChange={e => setF('GenericName', e.target.value)} className={iCls} />
            </Field>
            <Field label="Unit (tab, cap, btl, pcs…)">
              <input value={form.Unit} onChange={e => setF('Unit', e.target.value)} className={iCls} />
            </Field>
            <Field label="Category *">
              <select value={form.CategoryId} onChange={e => setF('CategoryId', Number(e.target.value))} className={iCls}>
                <option value={0}>Select category…</option>
                {categories.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
              </select>
            </Field>
            <Field label="Supplier">
              <select value={form.SupplierId ?? ''} onChange={e => setF('SupplierId', e.target.value ? Number(e.target.value) : null)} className={iCls}>
                <option value="">None</option>
                {suppliers.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cost Price *">
                <input type="number" step="0.01" value={form.CostPrice} onChange={e => setF('CostPrice', Number(e.target.value))} className={iCls} />
              </Field>
              <Field label="Selling Price *">
                <input type="number" step="0.01" value={form.SellingPrice} onChange={e => setF('SellingPrice', Number(e.target.value))} className={iCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Stock Qty">
                <input type="number" value={form.StockQuantity} onChange={e => setF('StockQuantity', Number(e.target.value))} className={iCls} />
              </Field>
              <Field label="Reorder Level">
                <input type="number" value={form.ReorderLevel} onChange={e => setF('ReorderLevel', Number(e.target.value))} className={iCls} />
              </Field>
            </div>
            <Field label="Expiry Date">
              <input type="date" value={form.ExpiryDate ?? ''} onChange={e => setF('ExpiryDate', e.target.value || null)} className={iCls} />
            </Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.RequiresPrescription} onChange={e => setF('RequiresPrescription', e.target.checked)} className="accent-red-600" />
              <span className="text-red-600 font-medium">Requires Prescription (Rx)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.IsActive} onChange={e => setF('IsActive', e.target.checked)} className="accent-green-600" />
              <span className="text-green-600 font-medium">Active / Available for Sale</span>
            </label>
          </div>

          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold transition">
              {saving ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </div>
      )}

      {/* ── Stock Adjustment Modal ───────────────────────────────────────── */}
      {adjProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-bold text-gray-800">Adjust Stock</h3>
            </div>
            <p className="text-sm text-gray-600 mb-0.5">{adjProduct.Name}</p>
            <p className="text-xs text-gray-400 mb-4">
              Current stock: <strong>{adjProduct.StockQuantity}</strong> {adjProduct.Unit}
            </p>
            <Field label="Adjustment (+ to add, − to reduce)">
              <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)}
                placeholder="e.g. 50 or -10" className={iCls + ' mb-3'} autoFocus />
            </Field>
            <Field label="Reason *">
              <input value={adjReason} onChange={e => setAdjReason(e.target.value)}
                placeholder="e.g. Received new delivery" className={iCls} />
            </Field>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAdjProduct(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button onClick={adjustStock} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-bold transition">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
