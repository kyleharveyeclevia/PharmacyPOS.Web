import { useState, useEffect } from 'react';
import { productsApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, Layers } from 'lucide-react';

const iCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

const blank = () => ({
  Name: '',
  Description: ''
});

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [editId, setEditId] = useState(0);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await productsApi.categories();
      if (data.Success) setCategories(data.Data);
    } catch {
      toast.error('Failed to load categories.');
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(blank());
    setIsNew(true);
    setEditId(0);
    setEditing(true);
  };

  const openEdit = (c) => {
    setForm({
      Name: c.Name,
      Description: c.Description || ''
    });
    setIsNew(false);
    setEditId(c.Id);
    setEditing(true);
  };

  const save = async () => {
    if (!form.Name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setSaving(true);
    try {
      const { data } = isNew
        ? await categoriesApi.create(form)
        : await categoriesApi.update(editId, form);

      if (!data.Success) {
        toast.error(data.Message);
        return;
      }

      toast.success(isNew ? 'Category created!' : 'Category updated!');
      setEditing(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.Message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── TABLE ─────────────────────────────────────────────── */}
      <div className="flex-1 p-5 overflow-auto">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>

          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Plus size={16} /> Add Category
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">

            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left">Id</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {categories.map(c => (
                <tr key={c.Id} className="hover:bg-gray-50 transition">

                  <td className="px-5 py-3 font-medium text-gray-800 items-center gap-2">
                   
                    {c.Id}
                  </td>

                  <td className="px-5 py-3 font-medium text-gray-800 flex items-center gap-2">
                    <Layers size={14} className="text-blue-600" />
                    {c.Name}
                  </td>

                  <td className="px-5 py-3 text-gray-500 text-sm">
                    {c.Description || '—'}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-gray-400">
                    No categories found
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* ── SIDE PANEL ────────────────────────────────────────── */}
      {editing && (
        <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">
              {isNew ? 'Add Category' : 'Edit Category'}
            </h2>

            <button
              onClick={() => setEditing(false)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            <Field label="Category Name *">
              <input
                value={form.Name}
                onChange={e => setF('Name', e.target.value)}
                className={iCls}
                placeholder="e.g. Tablet, Syrup"
                autoFocus
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.Description}
                onChange={e => setF('Description', e.target.value)}
                className={iCls}
                rows={4}
                placeholder="Optional description"
              />
            </Field>

          </div>

          <div className="p-4 border-t border-gray-100 flex gap-2">

            <button
              onClick={() => setEditing(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold transition"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

          </div>

        </div>
      )}
    </div>
  );
}