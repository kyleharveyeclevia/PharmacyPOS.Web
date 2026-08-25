import { useHardwareAgent } from '../context/HardwareAgentContext.jsx';
import { useTerminalAccess } from '../context/TerminalAccessContext.jsx';

export default function TerminalGuard({ children }) {
  const { isAvailable, isConnecting } = useHardwareAgent();
  const { hasAccess, isChecking } = useTerminalAccess();

  if (isConnecting || isChecking) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Checking hardware agent…</div>;
  }

  if (!isAvailable) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-6 text-center">
        <div className="max-w-md rounded-xl bg-white p-8 shadow">
          <img src="/images/logo-full.png" alt="Pharmacy Logo" className="mx-auto mb-6 h-14 w-auto object-contain" />
          <h1 className="text-xl font-bold text-gray-800">Hardware agent required</h1>
          <p className="mt-3 text-sm text-gray-600">Start the Pharmacy Hardware Agent on this POS machine, then refresh this page.</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <div className="min-h-screen grid place-items-center bg-gray-50 p-6 text-center"><div className="max-w-md rounded-xl bg-white p-8 shadow"><img src="/images/logo-full.png" alt="Pharmacy Logo" className="mx-auto mb-6 h-14 w-auto object-contain" /><h1 className="text-xl font-bold text-gray-800">POS access denied</h1><p className="mt-3 text-sm text-gray-600">This machine's MAC address is not registered as an active terminal.</p></div></div>;
  }
  return children;
}
