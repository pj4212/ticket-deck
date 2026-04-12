import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const CONFIGS = {
  success: { bg: 'bg-green-500', icon: CheckCircle2, dismiss: 1800 },
  warning: { bg: 'bg-yellow-500', icon: AlertTriangle, dismiss: 3000 },
  error: { bg: 'bg-red-500', icon: XCircle, dismiss: 3000 },
};

export default function ScanResultOverlay({ result, onDismiss }) {
  const config = CONFIGS[result.type] || CONFIGS.error;
  const Icon = config.icon;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(onDismiss, config.dismiss);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${config.bg} text-white p-8 transition-all duration-200 ease-out ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      onClick={onDismiss}
    >
      <div className={`transition-transform duration-300 ease-out ${visible ? 'scale-100' : 'scale-50'}`}>
        <Icon className="h-32 w-32 mb-6 mx-auto drop-shadow-lg" />
      </div>
      <p className="text-3xl font-bold text-center mb-2">{result.title}</p>
      {result.subtitle && <p className="text-xl text-center opacity-90">{result.subtitle}</p>}
      <p className="text-sm mt-6 opacity-60">Tap to dismiss</p>
    </div>
  );
}