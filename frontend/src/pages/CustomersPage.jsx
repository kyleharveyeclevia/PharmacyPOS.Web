import { useState, useEffect } from 'react';
import { customersApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  X,
  User,
  BadgeCheck
} from 'lucide-react';

const iCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

const blank = () => ({
  Name: '',
  Phone: '',
  Email: '',
  Address: '',
  IsSeniorCitizen: false,
  IsPWD: false,
  SCPWDId: '',
  Points: 0
});

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [editId, setEditId] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  const load = async () => {
    try {
      const { data } = await customersApi.getAll();

      if (data.Success)
        setCustomers(data.Data);

    } catch {
      toast.error('Failed to load customers.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm(blank());
    setIsNew(true);
    setEditId(0);
    setEditing(true);
  };

  const openEdit = (c) => {
    setForm({
      Name: c.Name,
      Phone: c.Phone ?? '',
      Email: c.Email ?? '',
      Address: c.Address ?? '',
      IsSeniorCitizen: c.IsSeniorCitizen,
      IsPWD: c.IsPWD,
      SCPWDId: c.SCPWDId ?? '',
      Points: c.Points
    });

    setIsNew(false);
    setEditId(c.Id);
    setEditing(true);
  };

  const setF = (k, v) =>
    setForm(f => ({ ...f, [k]: v }));

  const save = async () => {

    if (!form.Name.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    setSaving(true);

    try {

      const { data } = isNew
        ? await customersApi.create(form)
        : await customersApi.update(editId, form);

      if (!data.Success) {
        toast.error(data.Message);
        return;
      }

      toast.success(
        isNew
          ? "Customer created!"
          : "Customer updated!"
      );

      setEditing(false);
      load();

    } catch (e) {
      toast.error(
        e.response?.data?.Message ??
        "Save failed."
      );
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* TABLE */}

      <div className="flex-1 p-5 overflow-auto">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold">
            Customers
          </h1>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2"
          >
            <Plus size={16}/>
            Add Customer
          </button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

          <table className="w-full text-sm">

            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Points</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {customers.map(c => (

                <tr
                  key={c.Id}
                  className="border-b hover:bg-gray-50"
                >

                  <td className="px-5 py-3">

                    <div className="flex items-center gap-2">
                      <User
                        size={15}
                        className="text-blue-600"
                      />
                      <div>

                        <div className="font-medium">
                          {c.Name}
                        </div>

                        <div className="text-xs text-gray-500">
                          {c.Email}
                        </div>

                      </div>
                    </div>

                  </td>

                  <td className="px-5 py-3 text-center">
                    {c.Phone}
                  </td>

                  <td className="px-5 py-3 font-medium text-center">
                    {c.Points}
                  </td>

                  <td className="px-5 py-3">

                    <div className="flex justify-center items-center gap-2">

                      {c.IsSeniorCitizen && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                          Senior
                        </span>
                      )}

                      {c.IsPWD && (
                        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs">
                          PWD
                        </span>
                      )}

                      {!c.IsSeniorCitizen &&
                        !c.IsPWD &&
                        "Regular"}

                    </div>

                  </td>

                  <td className="text-center">

                    <button
                      onClick={() => openEdit(c)}
                      className="p-2 rounded hover:bg-blue-50 text-blue-600"
                    >
                      <Pencil size={14}/>
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* SIDE PANEL */}

      {editing && (

        <div className="w-96 bg-white border-l flex flex-col">

          <div className="flex justify-between items-center p-5 border-b">

            <h2 className="font-bold">
              {isNew
                ? "Add Customer"
                : "Edit Customer"}
            </h2>

            <button onClick={() => setEditing(false)}>
              <X size={18}/>
            </button>

          </div>

          <div className="flex-1 p-5 overflow-auto space-y-4">

            <Field label="Customer Name *">
              <input
                className={iCls}
                value={form.Name}
                onChange={e=>setF("Name",e.target.value)}
              />
            </Field>

            <Field label="Phone">
              <input
                className={iCls}
                value={form.Phone}
                onChange={e=>setF("Phone",e.target.value)}
              />
            </Field>

            <Field label="Email">
              <input
                className={iCls}
                value={form.Email}
                onChange={e=>setF("Email",e.target.value)}
              />
            </Field>

            <Field label="Address">
              <textarea
                rows={3}
                className={iCls}
                value={form.Address}
                onChange={e=>setF("Address",e.target.value)}
              />
            </Field>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.IsSeniorCitizen}
                onChange={e=>setF("IsSeniorCitizen",e.target.checked)}
              />
              Senior Citizen
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.IsPWD}
                onChange={e=>setF("IsPWD",e.target.checked)}
              />
              PWD
            </label>

            {(form.IsSeniorCitizen || form.IsPWD) && (
              <Field label="Senior/PWD ID">
                <input
                  className={iCls}
                  value={form.SCPWDId}
                  onChange={e=>setF("SCPWDId",e.target.value)}
                />
              </Field>
            )}

            <Field label="Points">
              <input
                type="number"
                className={iCls}
                value={form.Points}
                onChange={e=>setF("Points",Number(e.target.value))}
              />
            </Field>

          </div>

          <div className="p-4 border-t flex gap-2">

            <button
              className="flex-1 border rounded-lg py-2"
              onClick={()=>setEditing(false)}
            >
              Cancel
            </button>

            <button
              disabled={saving}
              onClick={save}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
            >
              {saving
                ? "Saving..."
                : "Save"}
            </button>

          </div>

        </div>

      )}

    </div>
  );
}