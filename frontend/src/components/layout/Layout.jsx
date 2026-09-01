import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useHardwareAgent } from '../../context/HardwareAgentContext.jsx';
import { authApi, reportsApi } from '../../services/api.js';
import toast from 'react-hot-toast';
import { LayoutDashboard, ShoppingCart, Package, BarChart3, Users, LogOut, Printer, ChevronDown, X, Layers, Truck } from 'lucide-react';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, roles: ['Admin', 'Pharmacist', 'Cashier'] },
  { to: '/pos', label: 'POS / Sales', Icon: ShoppingCart, roles: ['Admin', 'Pharmacist', 'Cashier'] },
  { to: '/inventory', label: 'Inventory', Icon: Package, roles: ['Admin', 'Pharmacist'] },
  { to: '/reports', label: 'Reports', Icon: BarChart3, roles: ['Admin', 'Pharmacist', 'Cashier'] },
  { to: '/users', label: 'Users', Icon: Users, roles: ['Admin'] },
  { to: '/categories', label: 'Categories', Icon: Layers, roles: ['Admin', 'Pharmacist'] },
  { to: '/suppliers', label: 'Suppliers', Icon: Truck, roles: ['Admin', 'Pharmacist'] },
  { to: '/customers', label: 'Customers', Icon: Users, roles: ['Admin', 'Pharmacist'] },
];

function HardwareStatus() {
  const { isAvailable, isConnecting, macAddresses } = useHardwareAgent();

  const label = isConnecting
    ? 'Hardware: Checking'
    : isAvailable
      ? 'Hardware: Connected'
      : 'Hardware: Disconnected';

  const color = isConnecting
    ? 'bg-amber-400'
    : isAvailable
      ? 'bg-emerald-500'
      : 'bg-red-500';

  const containerColor = isConnecting
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : isAvailable
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div
      title={
        macAddresses.length
          ? `MAC: ${macAddresses.join(', ')}`
          : 'No hardware agent connected'
      }
      className={
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ' +
        containerColor
      }
    >
      <span className={'h-2 w-2 rounded-full ' + color} />
      {label}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [endShiftText, setEndShiftText] = useState('');
  const visible = NAV.filter(n => n.roles.includes(user?.role ?? ''));

  const handleXRead = async () => {
    try {
      const { data } = await reportsApi.xread();
      if (data.Success) toast.success('X-Read complete.');
    } catch { toast.error('X-Read failed.'); }
  };
  const doLogout = async (endShift) => {
    if (endShift && endShiftText.trim().toUpperCase() !== 'ENDSHIFT') { toast.error('Please enter ENDSHIFT to end your shift.'); return; }
    setWorking(true);
    try { await authApi.logout(0, endShift); }
    catch { toast.error('Logout error — clearing session anyway.'); }
    finally { logout(); navigate('/login', { replace: true }); setWorking(false); setModal(false); }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="w-56 bg-gradient-to-b from-green-900 to-emerald-900 flex flex-col shrink-0 shadow-xl">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-green-800">
          <div className="bg-white/20 rounded-xl p-3"><img src="/images/logo.png" alt="Pharmacy Logo" className="h-10 w-auto object-contain" /></div>
          <div><div className="text-white font-bold text-sm leading-tight">{__APP_NAME__}</div><div className="text-green-300 text-xs">{__APP_VERSION_DESCRIPTION__}</div></div>
        </div>
        <nav className="flex-1 py-2">
          {visible.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }) => 'flex items-center gap-3 px-5 py-2.5 text-sm transition-all ' + (isActive ? 'bg-white/15 text-white font-semibold border-r-2 border-green-300' : 'text-green-200 hover:bg-white/10 hover:text-white')}><Icon size={17} />{label}</NavLink>)}
          <div className="mx-4 my-3 border-t border-green-800" />
          <button onClick={handleXRead} className="flex items-center gap-3 px-5 py-2.5 text-sm text-green-200 hover:bg-white/10 hover:text-white w-full text-left"><Printer size={17} />X-Read</button>
        </nav>
        <div className="border-t border-green-800 p-4"><div className="text-green-100 text-xs font-medium truncate mb-0.5">{user?.fullName}</div><div className="text-green-400 text-xs mb-3">{user?.role}</div><button onClick={() => setModal(true)} className="flex items-center gap-2 text-red-300 hover:text-red-200 text-xs w-full"><LogOut size={13} />Logout / End Shift</button></div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div className="flex items-center gap-4 text-sm text-gray-700"><HardwareStatus /><div className="flex items-center gap-2"><div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{(user?.fullName?.[0] ?? 'U').toUpperCase()}</div><span className="font-medium">{user?.fullName}</span><ChevronDown size={13} className="text-gray-400" /></div></div>
        </header>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
      {modal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"><div className="flex items-center justify-between mb-2"><h3 className="text-lg font-bold text-gray-800">End of Shift</h3><button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><p className="text-gray-500 text-sm mb-5">Enter <strong>ENDSHIFT</strong> to confirm that you want to end your shift.</p><input type="text" value={endShiftText} onChange={e => setEndShiftText(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl font-bold focus:ring-2 focus:ring-green-500 outline-none mb-5 text-center" autoFocus /><div className="flex gap-3"><button onClick={() => doLogout(false)} disabled={working} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">Logout Only</button><button onClick={() => doLogout(true)} disabled={working} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">{working ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogOut size={14} />}Logout + End Shift</button></div></div></div>}
    </div>
  );
}
