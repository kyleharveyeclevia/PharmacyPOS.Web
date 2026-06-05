import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Pill, LogIn } from 'lucide-react';
import { authApi } from '../services/api.js';

export default function TerminalSetupPage() {
  const navigate = useNavigate();
  const [terminalCode, setTerminalCode] = useState('');
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!terminalCode) {
    toast.error('Enter terminal code.');
    return;
  }

  setLoading(true);

  try {
    const { data } = await authApi.terminalActivate(terminalCode);
    console.log(terminalCode);
    
    if (!data.Success) {
      toast.error(data.Message || 'Activation failed.');
      return;
    }
    console.log('success');
    localStorage.setItem('terminalGuid', data.Data.TerminalGuid);

    toast.success('Terminal activated successfully!');
    navigate('/login');
  } catch (err) {
    toast.error(err.response?.data?.Message ?? 'Activation failed.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex">

        {/* Branding (same as LoginPage) */}
        <div className="hidden md:flex flex-col justify-center w-5/12 bg-gradient-to-b from-green-700 to-emerald-800 p-10 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/20 rounded-xl p-3">
              <img
                src="/images/logo.png"
                alt="Pharmacy Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lourdes Pharmacy</h1>
              <p className="text-green-200 text-sm">Plus POS System</p>
            </div>
          </div>

          <div className="text-green-100 text-sm space-y-2">
            <p>✓ Terminal Activation</p>
            <p>✓ POS Device Registration</p>
            <p>✓ Secure Session Tracking</p>
            <p>✓ Branch-based Sales Monitoring</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col justify-center p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Terminal Setup
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            Activate this device to use the POS system
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terminal Code
              </label>
              <input
                type="text"
                value={terminalCode}
                onChange={(e) => setTerminalCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                placeholder="e.g. POS-01"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Activating...' : 'Activate Terminal'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}