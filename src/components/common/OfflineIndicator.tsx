import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 flex items-center justify-between gap-2.5 rounded-xl bg-slate-900/95 text-amber-300 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold shadow-xl backdrop-blur-xs animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-slate-100">Đang ở chế độ Ngoại tuyến (Offline).</span>
      </div>
      <span className="text-[11px] text-amber-300/80 font-normal">Dữ liệu được lưu trong bộ nhớ máy</span>
    </div>
  );
};
