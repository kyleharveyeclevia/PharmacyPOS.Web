import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useHardwareAgent } from '../../context/HardwareAgentContext.jsx';
import { authApi, reportsApi } from '../../services/api.js';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  LogOut,
  Printer,
  ChevronDown,
  X,
  Layers,
  Truck,
} from 'lucide-react';

const NAV = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    Icon: LayoutDashboard,
    roles: ['Admin', 'Pharmacist', 'Cashier'],
  },
  {
    to: '/pos',
    label: 'POS / Sales',
    Icon: ShoppingCart,
    roles: ['Admin', 'Pharmacist', 'Cashier'],
  },
  {
    to: '/inventory',
    label: 'Inventory',
    Icon: Package,
    roles: ['Admin', 'Pharmacist'],
  },
  {
    to: '/reports',
    label: 'Reports',
    Icon: BarChart3,
    roles: ['Admin', 'Pharmacist', 'Cashier'],
  },
  {
    to: '/users',
    label: 'Users',
    Icon: Users,
    roles: ['Admin'],
  },
  {
    to: '/categories',
    label: 'Categories',
    Icon: Layers,
    roles: ['Admin', 'Pharmacist'],
  },
  {
    to: '/suppliers',
    label: 'Suppliers',
    Icon: Truck,
    roles: ['Admin', 'Pharmacist'],
  },
  {
    to: '/customers',
    label: 'Customers',
    Icon: Users,
    roles: ['Admin', 'Pharmacist'],
  },
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
      <span className={`h-2 w-2 rounded-full ${color}`} />
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

  const visible = NAV.filter((n) =>
    n.roles.includes(user?.role ?? '')
  );

  const handleXRead = async () => {
    try {
      const { data } = await reportsApi.xread();

      if (data.Success) {
        toast.success('X-Read complete.');
      }
    } catch {
      toast.error('X-Read failed.');
    }
  };

  const doLogout = async (endShift) => {
    if (
      endShift &&
      endShiftText.trim().toUpperCase() !== 'ENDSHIFT'
    ) {
      toast.error('Please enter ENDSHIFT to end your shift.');
      return;
    }

    setWorking(true);

    try {
      await authApi.logout(0, endShift);
    } catch {
      toast.error('Logout error — clearing session anyway.');
    } finally {
      logout();
      navigate('/login', { replace: true });
      setWorking(false);
      setModal(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-gradient-to-b from-green-900 to-emerald-900 shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-green-800 px-5 py-4">
          <div className="rounded-xl bg-white/20 p-3">
            <img
              src="/images/logo.png"
              alt="Pharmacy Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div>
            <div className="text-sm font-bold leading-tight text-white">
              {__APP_NAME__}
            </div>

            <div className="text-xs text-green-300">
              {__APP_VERSION_DESCRIPTION__}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {visible.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'flex items-center gap-3 px-5 py-2.5 text-sm transition-all ' +
                (isActive
                  ? 'border-r-2 border-green-300 bg-white/15 font-semibold text-white'
                  : 'text-green-200 hover:bg-white/10 hover:text-white')
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}

          <div className="mx-4 my-3 border-t border-green-800" />

          <button
            onClick={handleXRead}
            className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm text-green-200 hover:bg-white/10 hover:text-white"
          >
            <Printer size={17} />
            X-Read
          </button>
        </nav>

        {/* User / Logout */}
        <div className="border-t border-green-800 p-4">
          <div className="mb-0.5 truncate text-xs font-medium text-green-100">
            {user?.fullName}
          </div>

          <div className="mb-3 text-xs text-green-400">
            {user?.role}
          </div>

          <button
            onClick={() => setModal(true)}
            className="flex w-full items-center gap-2 text-xs text-red-300 hover:text-red-200"
          >
            <LogOut size={13} />
            Logout / End Shift
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-PH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-700">
            <HardwareStatus />

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                {(user?.fullName?.[0] ?? 'U').toUpperCase()}
              </div>

              <span className="font-medium">
                {user?.fullName}
              </span>

              <ChevronDown
                size={13}
                className="text-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* End Shift Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                End of Shift
              </h3>

              <button
                onClick={() => setModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Description */}
            <p className="mb-5 text-sm text-gray-500">
              Enter <strong>ENDSHIFT</strong> to confirm that you
              want to end your shift.
            </p>

            {/* Confirmation Input */}
            <input
              type="text"
              value={endShiftText}
              onChange={(e) => setEndShiftText(e.target.value)}
              className="mb-5 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => doLogout(false)}
                disabled={working}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                Logout Only
              </button>

              <button
                onClick={() => doLogout(true)}
                disabled={working}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {working ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <LogOut size={14} />
                )}

                Logout + End Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}