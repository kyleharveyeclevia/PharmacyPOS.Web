import { useState, useEffect } from 'react';
import { suppliersApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Truck } from 'lucide-react';

const iCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

const blank = () => ({
  Name: '',
  Contact: '',
  Phone: '',
  Email: '',
  Address: '',
  IsActive: true
});

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [editId, setEditId] = useState(0);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await suppliersApi.getAll();
      if (data.Success) setSuppliers(data.Data);
    } catch {
      toast.error('Failed to load suppliers.');
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(blank());
    setIsNew(true);
    setEditId(0);
    setEditing(true);
  };

  const openEdit = (s) => {
    setForm({
      Name: s.Name,
      Contact: s.Contact,
      Phone: s.Phone,
      Email: s.Email,
      Address: s.Address,
      IsActive: s.IsActive
    });
    setIsNew(false);
    setEditId(s.Id);
    setEditing(true);
  };

  const save = async () => {
    if (!form.Name.trim()) {
      toast.error('Supplier name is required.');
      return;
    }

    setSaving(true);
    try {
      const { data } = isNew
        ? await suppliersApi.create(form)
        : await suppliersApi.update(editId, form);

      if (!data.Success) {
        toast.error(data.Message);
        return;
      }

      toast.success(isNew ? 'Supplier created!' : 'Supplier updated!');
      setEditing(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.Message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s) => {
    try {
      const { data } = await suppliersApi.toggle(s.Id);
      if (!data.Success) {
        toast.error(data.Message);
        return;
      }
      toast.success(data.Message);
      load();
    } catch {
      toast.error('Toggle failed.');
    }
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── TABLE ───────────────────────────────────────────── */}
      <div className="flex-1 p-5 overflow-auto">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>

          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <table className="w-full text-sm">

            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {suppliers.map(s => (
                <tr key={s.Id} className="hover:bg-gray-50 transition">


                  <td className="px-5 py-3 font-medium text-gray-800 flex items-center gap-2">
                    <Truck size={14} className="text-orange-600" />
                    {s.Name}
                  </td>

                  <td className="px-5 py-3 text-gray-600">{s.Contact || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.Phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.Email || '—'}</td>

                  <td className="px-5 py-3 text-center">
                    <span className={
                      'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (s.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')
                    }>
                      {s.IsActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">

                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => toggle(s)}
                        className={'p-1.5 rounded-lg transition ' +
                          (s.IsActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}
                      >
                        {s.IsActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>

                    </div>
                  </td>

                </tr>
              ))}

              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* ── SIDE PANEL ─────────────────────────────────────── */}
      {editing && (
        <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">
              {isNew ? 'Add Supplier' : 'Edit Supplier'}
            </h2>

            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            <Field label="Supplier Name *">
              <input className={iCls} value={form.Name}
                onChange={e => setF('Name', e.target.value)} />
            </Field>

            <Field label="Contact Person">
              <input className={iCls} value={form.Contact}
                onChange={e => setF('Contact', e.target.value)} />
            </Field>

            <Field label="Phone">
              <input className={iCls} value={form.Phone}
                onChange={e => setF('Phone', e.target.value)} />
            </Field>

            <Field label="Email">
              <input type="email" className={iCls} value={form.Email}
                onChange={e => setF('Email', e.target.value)} />
            </Field>

            <Field label="Address">
              <textarea className={iCls} rows={3}
                value={form.Address}
                onChange={e => setF('Address', e.target.value)} />
            </Field>

          </div>

          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}