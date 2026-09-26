import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useHardwareAgent } from '../../context/HardwareAgentContext.jsx';
import {REPORTS} from '../../pages/reports/reportUtils.js';
import ShiftOperations from './ShiftOperations.jsx';
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
  Settings,
  Wrench,
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
];

const ADMINISTRATION_NAV = [
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
  const { pathname } = useLocation();
  const isAdministrationRoute = ADMINISTRATION_NAV.some(({ to }) =>
    pathname === to || pathname.startsWith(`${to}/`)
  );
  const [administrationOpen, setAdministrationOpen] = useState(isAdministrationRoute);

  useEffect(() => {
    if (isAdministrationRoute) setAdministrationOpen(true);
  }, [pathname, isAdministrationRoute]);

  const isReportsRoute = pathname === '/reports' || pathname.startsWith('/reports/');
  const [reportsOpen, setReportsOpen] = useState(isReportsRoute);
  useEffect(() => { if(isReportsRoute) setReportsOpen(true); }, [pathname, isReportsRoute]);

  const isUtilitiesRoute = pathname === '/utilities' || pathname.startsWith('/utilities/');
  const [utilitiesOpen,setUtilitiesOpen] = useState(isUtilitiesRoute);
  useEffect(()=>{if(isUtilitiesRoute)setUtilitiesOpen(true);},[pathname,isUtilitiesRoute]);

  const [modal, setModal] = useState(false);

  const visible = NAV.filter((n) =>
    n.roles.includes(user?.role ?? '')
  );
  const administrationItems = ADMINISTRATION_NAV.filter((n) =>
    n.roles.includes(user?.role ?? '')
  );

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
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
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

          {['Admin','Pharmacist','Cashier'].includes(user?.role) && (
            <div>
              <button
                type="button"
                aria-expanded={reportsOpen}
                aria-controls="reports-navigation"
                onClick={() => setReportsOpen((open) => !open)}
                className={
                  'flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors ' +
                  (isReportsRoute
                    ? 'font-semibold text-white'
                    : 'text-green-200 hover:bg-white/10 hover:text-white')
                }
              >
                <BarChart3 size={17} />
                <span className="flex-1">Reports</span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`transition-transform ${reportsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div id="reports-navigation" hidden={!reportsOpen}>
                {REPORTS.filter(item=>!item.roles || item.roles.includes(user?.role)).map(({ id, label }) => (
                  <NavLink
                    key={id}
                    to={`/reports/${id}`}
                    className={({ isActive }) =>
                      'flex items-center gap-3 py-2.5 pl-10 pr-5 text-sm transition-colors ' +
                      (isActive
                        ? 'border-r-2 border-green-300 bg-white/15 font-semibold text-white'
                        : 'text-green-200 hover:bg-white/10 hover:text-white')
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {administrationItems.length > 0 && (
            <div>
              <button
                type="button"
                aria-expanded={administrationOpen}
                aria-controls="administration-navigation"
                onClick={() => setAdministrationOpen((open) => !open)}
                className={
                  'flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors ' +
                  (isAdministrationRoute
                    ? 'font-semibold text-white'
                    : 'text-green-200 hover:bg-white/10 hover:text-white')
                }
              >
                <Settings size={17} />
                <span className="flex-1">Administration</span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`transition-transform ${administrationOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div id="administration-navigation" hidden={!administrationOpen}>
                {administrationItems.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      'flex items-center gap-3 py-2.5 pl-10 pr-5 text-sm transition-colors ' +
                      (isActive
                        ? 'border-r-2 border-green-300 bg-white/15 font-semibold text-white'
                        : 'text-green-200 hover:bg-white/10 hover:text-white')
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          <div>
            <button type="button" aria-expanded={utilitiesOpen} aria-controls="utilities-navigation" onClick={()=>setUtilitiesOpen(open=>!open)} className={'flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors '+(isUtilitiesRoute?'font-semibold text-white':'text-green-200 hover:bg-white/10 hover:text-white')}>
              <Wrench size={17}/><span className="flex-1">Utilities</span><ChevronDown size={15} aria-hidden="true" className={`transition-transform ${utilitiesOpen?'rotate-180':''}`}/>
            </button>
            <div id="utilities-navigation" hidden={!utilitiesOpen}>
              <NavLink to="/utilities/receipts" className={({isActive})=>'flex items-center py-2.5 pl-10 pr-5 text-sm transition-colors '+(isActive?'border-r-2 border-green-300 bg-white/15 font-semibold text-white':'text-green-200 hover:bg-white/10 hover:text-white')}>Receipts</NavLink>
            </div>
          </div>
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

      {modal && <ShiftOperations onClose={()=>setModal(false)} onLogout={()=>{logout();navigate('/login',{replace:true});}}/>}
    </div>
  );
}
