import React from 'react';
import { BarChart3, Users2, CheckSquare, Building2 } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'overview' | 'crm' | 'tasks' | 'ansanh';
  onSelectTab: (tab: 'overview' | 'crm' | 'tasks' | 'ansanh') => void;
  crmCount?: number;
  taskCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  crmCount = 0,
  taskCount = 0,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] safe-bottom">
      <div className="grid grid-cols-4 h-15">
        {/* Tab 1: Tổng Quan */}
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation ${
            currentTab === 'overview'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${currentTab === 'overview' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] leading-none tracking-tight">Tổng Quan</span>
        </button>

        {/* Tab 2: CRM */}
        <button
          type="button"
          onClick={() => onSelectTab('crm')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation relative ${
            currentTab === 'crm'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors relative ${currentTab === 'crm' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <Users2 className="w-5 h-5" />
            {crmCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-full ring-2 ring-white">
                {crmCount > 99 ? '99+' : crmCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-none tracking-tight">1. CRM</span>
        </button>

        {/* Tab 3: Task */}
        <button
          type="button"
          onClick={() => onSelectTab('tasks')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation relative ${
            currentTab === 'tasks'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors relative ${currentTab === 'tasks' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <CheckSquare className="w-5 h-5" />
            {taskCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-black rounded-full ring-2 ring-white">
                {taskCount > 99 ? '99+' : taskCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-none tracking-tight">2. Task</span>
        </button>

        {/* Tab 4: An Sanh */}
        <button
          type="button"
          onClick={() => onSelectTab('ansanh')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation ${
            currentTab === 'ansanh'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${currentTab === 'ansanh' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] leading-none tracking-tight">3. An Sanh</span>
        </button>
      </div>
    </nav>
  );
};
