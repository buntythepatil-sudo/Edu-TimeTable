import React from 'react';
import {
  Zap,
  Calendar,
  Users,
  Sliders,
  AlertTriangle,
  MoreHorizontal,
  FolderOpen,
  Printer,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { TimetableConflict } from '../types';

interface MobileBottomNavProps {
  hasGenerated: boolean;
  conflicts: TimetableConflict[];
  isConfigDrawerOpen: boolean;
  activeMobileTab: 'timetable' | 'config';
  onSelectMobileTab: (tab: 'timetable' | 'config') => void;
  onGenerate: () => void;
  onOpenConflicts: () => void;
  onOpenTeacherDirectory: () => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  hasGenerated,
  conflicts,
  isConfigDrawerOpen,
  activeMobileTab,
  onSelectMobileTab,
  onGenerate,
  onOpenConflicts,
  onOpenTeacherDirectory,
  onOpenMoreMenu,
}) => {
  const clashCount = conflicts.length;

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1.5 flex items-center justify-around text-[0.65rem] font-bold text-slate-400 select-none pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] print:hidden shadow-lg"
    >
      {/* 1. Timetable View */}
      <button
        type="button"
        onClick={() => onSelectMobileTab('timetable')}
        className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
          activeMobileTab === 'timetable' && !isConfigDrawerOpen
            ? 'text-indigo-400 bg-slate-800/80 shadow-2xs'
            : 'hover:text-slate-200'
        }`}
      >
        <Calendar className="w-4 h-4 mb-0.5" />
        <span className="leading-none">Schedule</span>
      </button>

      {/* 2. Setup / Classes & Bells */}
      <button
        type="button"
        onClick={() => onSelectMobileTab('config')}
        className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
          isConfigDrawerOpen
            ? 'text-indigo-400 bg-slate-800/80 shadow-2xs'
            : 'hover:text-slate-200'
        }`}
      >
        <Sliders className="w-4 h-4 mb-0.5 text-indigo-400" />
        <span className="leading-none">Setup</span>
      </button>

      {/* 3. Center Highlight: Generate Timetable */}
      <button
        type="button"
        onClick={onGenerate}
        className="flex flex-col items-center justify-center -mt-4 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-2xl w-12 h-12 shadow-lg shadow-indigo-500/30 border-2 border-slate-900 active:scale-95 transition-all cursor-pointer"
        title="Generate or re-run automated timetable schedule"
      >
        <Zap className="w-5 h-5 fill-white text-white" />
        <span className="text-[0.55rem] font-extrabold leading-none mt-0.5">Run</span>
      </button>

      {/* 4. Teachers & Workload */}
      <button
        type="button"
        onClick={onOpenTeacherDirectory}
        className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl hover:text-slate-200 transition-all cursor-pointer"
      >
        <Users className="w-4 h-4 mb-0.5 text-indigo-300" />
        <span className="leading-none">Faculty</span>
      </button>

      {/* 5. Clashes / Conflicts */}
      <button
        type="button"
        onClick={onOpenConflicts}
        className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl relative hover:text-slate-200 transition-all cursor-pointer"
      >
        <div className="relative">
          <AlertTriangle
            className={`w-4 h-4 mb-0.5 ${
              hasGenerated && clashCount > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          />
          {hasGenerated && clashCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[0.55rem] font-mono font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
              {clashCount > 9 ? '9+' : clashCount}
            </span>
          )}
          {hasGenerated && clashCount === 0 && (
            <span className="absolute -top-1 -right-1.5 bg-emerald-500 text-white text-[0.5rem] w-2.5 h-2.5 rounded-full flex items-center justify-center border border-slate-900">
              ✓
            </span>
          )}
        </div>
        <span className="leading-none">
          {hasGenerated && clashCount > 0 ? 'Clashes' : 'Conflicts'}
        </span>
      </button>

      {/* 6. More Actions Sheet */}
      <button
        type="button"
        onClick={onOpenMoreMenu}
        className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl hover:text-slate-200 transition-all cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4 mb-0.5 text-slate-400" />
        <span className="leading-none">More</span>
      </button>
    </nav>
  );
};
