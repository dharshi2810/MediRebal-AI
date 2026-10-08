import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 flex items-center gap-3 rounded-xl bg-amber-500/95 text-white px-4 py-3 shadow-xl backdrop-blur-md border border-amber-400 animate-bounce">
      <WifiOff className="w-5 h-5 flex-shrink-0" />
      <div className="text-xs">
        <p className="font-bold">Offline Mode Active</p>
        <p className="text-amber-100">Displaying cached data. Real-time hospital resource sync is paused.</p>
      </div>
    </div>
  );
};
