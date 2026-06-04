import { useState, useEffect } from 'react';
import { usersApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, KeyRound } from 'lucide-react';

const ROLES = ['Admin', 'Pharmacist', 'Cashier'];
const iCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const blank = () => ({ Username:'', Password:'', FullName:'', Email:'', Phone:'', Role:'Cashier', NewPassword:'' });

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew]     = useState(true);
  const [editId, setEditId]   = useState(0);
  const [form, setForm]       = useState(blank());
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    try {
      const { data } = await usersApi.getAll();
      if (data.Success) setUsers(data.Data);
    } catch { toast.error('Failed to load users.'); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(blank());
    setIsNew(true);
    setEditId(0);
    setEditing(true);
  };

  const openEdit = (u) => {
    setForm({ Username: u.Username, Password: '', FullName: u.FullName, Email: u.Email, Phone: u.Phone, Role: u.Role, NewPassword: '' });
    setIsNew(false);
    setEditId(u.Id);
    setEditing(true);
  };

  const save = async () => {
    if (!form.FullName.trim())                            { toast.error('Full name is required.');    return; }
    if (isNew && !form.Username.trim())                   { toast.error('Username is required.');     return; }
    if (isNew && !form.Password)                          { toast.error('Password is required.');     return; }
    if (isNew && form.Password.length < 6)                { toast.error('Password min 6 chars.');     return; }
    if (!isNew && form.NewPassword && form.NewPassword.length < 6) { toast.error('New password min 6 chars.'); return; }

    setSaving(true);
    try {
      const { data } = isNew
        ? await usersApi.create({ Username: form.Username, Password: form.Password, FullName: form.FullName, Email: form.Email, Phone: form.Phone, Role: form.Role })
        : await usersApi.update(editId, { FullName: form.FullName, Email: form.Email, Phone: form.Phone, Role: form.Role, NewPassword: form.NewPassword || undefined });

      if (!data.Success) { toast.error(data.Message); return; }
      toast.success(isNew ? 'User created!' : 'User updated!');
      setEditing(false);
      load();
    } catch (e) { toast.error(e.response?.data?.Message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  const toggle = async (u) => {
    if (u.Id === me?.userId) { toast.error("You cannot deactivate yourself."); return; }
    if (!window.confirm((u.IsActive ? 'Deactivate ' : 'Activate ') + u.FullName + '?')) return;
    try {
      const { data } = await usersApi.toggle(u.Id);
      if (!data.Success) { toast.error(data.Message); return; }
      toast.success(data.Message);
      load();
    } catch { toast.error('Toggle failed.'); }
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const fmtLogin = (s) => s
    ? new Date(s).toLocaleString('en-PH', { month:'2-digit', day:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
    : 'Never';

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Users Table ─────────────────────────────────────────────────── */}
      <div className="flex-1 p-5 overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition">
            <Plus size={16} /> Add User
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left">Full Name</th>
                <th className="px-5 py-3 text-left">Username</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Last Login</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.Id} className={'hover:bg-gray-50 transition ' + (!u.IsActive ? 'opacity-60' : '')}>
                  <td className="px-5 py-3 font-medium text-gray-800">{u.FullName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{u.Username}</td>
                  <td className="px-5 py-3">
                    <span className={
                      'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (u.Role === 'Admin'      ? 'bg-purple-100 text-purple-700' :
                       u.Role === 'Pharmacist' ? 'bg-teal-100   text-teal-700'   :
                                                 'bg-blue-100   text-blue-700')
                    }>{u.Role}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{u.Email || '—'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{fmtLogin(u.LastLogin)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (u.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {u.IsActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} title="Edit"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => toggle(u)} title={u.IsActive ? 'Deactivate' : 'Activate'}
                        className={'p-1.5 rounded-lg transition ' + (u.IsActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}>
                        {u.IsActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit / Add Panel ─────────────────────────────────────────────── */}
      {editing && (
        <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">{isNew ? 'Add New User' : 'Edit User'}</h2>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 transition">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isNew && (
              <Field label="Username *">
                <input value={form.Username} onChange={e => setF('Username', e.target.value)}
                  className={iCls} placeholder="Enter username" autoFocus />
              </Field>
            )}
            <Field label="Full Name *">
              <input value={form.FullName} onChange={e => setF('FullName', e.target.value)}
                className={iCls} placeholder="Enter full name" autoFocus={!isNew} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.Email} onChange={e => setF('Email', e.target.value)}
                className={iCls} placeholder="user@email.com" />
            </Field>
            <Field label="Phone">
              <input value={form.Phone} onChange={e => setF('Phone', e.target.value)}
                className={iCls} placeholder="09XXXXXXXXX" />
            </Field>
            <Field label="Role *">
              <select value={form.Role} onChange={e => setF('Role', e.target.value)} className={iCls}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
                <KeyRound size={12} />
                {isNew ? 'Password *' : 'Change Password (leave blank to keep)'}
              </div>
              <input
                type="password"
                value={isNew ? form.Password : form.NewPassword}
                onChange={e => setF(isNew ? 'Password' : 'NewPassword', e.target.value)}
                className={iCls}
                placeholder="Min 6 characters"
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => setEditing(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold transition">
              {saving ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
