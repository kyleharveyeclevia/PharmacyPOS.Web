import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { Pill, Eye, EyeOff, LogIn } from 'lucide-react';
import { useTerminalAccess } from '../context/TerminalAccessContext.jsx';


export default function LoginPage() {
  const { login } = useAuth();
  const { terminal } = useTerminalAccess();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Enter username and password.'); return; }
    
    if (!terminal) {
      toast.error('This machine does not have POS access.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.login(username, password, terminal.TerminalGuid);
      if (!data.Success) { toast.error(data.Message); return; }
      const d = data.Data;
      login({ userId: d.UserId, sessionId: d.SessionId, username: d.Username, fullName: d.FullName, role: d.Role, token: d.Token });
      toast.success('Welcome, ' + d.FullName + '!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.Message ?? 'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex">

        {/* Branding */}
        <div className="hidden md:flex flex-col justify-center w-5/12 bg-gradient-to-b from-green-700 to-emerald-800 p-10 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/20 rounded-xl p-3"> <img
              src="/images/logo.png"
              alt="Pharmacy Logo"
              className="h-10 w-auto object-contain"
            /></div>
            <div>
              <h1 className="text-2xl font-bold">{__APP_NAME__}</h1>
              <p className="text-green-200 text-sm">{__APP_VERSION_DESCRIPTION__}</p>
              <p className="text-green-200 text-xs">Version: {__APP_VERSION__} </p>
            </div>
          </div>
          {['Complete POS & Inventory', 'X-Read / Z-Read Reports', 'SC/PWD VAT-Exempt (RA 9994/9442)',
            'User & Session Management', 'BIR-Compliant VAT Breakdown'].map(f => (
              <div key={f} className="flex items-center gap-2 text-green-100 text-sm mb-2">
                <span className="text-green-300">✓</span>{f}
              </div>
            ))}
          <div className="mt-8 pt-6 border-t border-green-600 text-green-300 text-xs">
            {/* <p className="font-semibold mb-1">Default credentials:</p>
            <p className="font-mono">admin / admin123</p>
            <p className="font-mono">cashier1 / cashier123</p>
            <p className="font-mono">pharmacist1 / pharma123</p> */}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col justify-center p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Sign In</h2>
          <p className="text-gray-500 text-sm mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                placeholder="Enter username" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Enter password" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
