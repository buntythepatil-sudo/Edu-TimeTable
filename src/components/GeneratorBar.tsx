import React, { useState, useRef, useEffect } from 'react';
import { TimetableConflict, Teacher, ConfigOptionTab } from '../types';
import {
  Zap,
  Shuffle,
  AlertTriangle,
  CheckCircle2,
  Brush,
  Download,
  Users,
  UserCheck,
  XCircle,
  Sparkles,
  Printer,
  Eye,
  Wand2,
  CalendarCheck,
  Save,
  FolderOpen,
  Sliders,
  ChevronDown,
  Clock,
  Layers,
} from 'lucide-react';

interface GeneratorBarProps {
  conflicts: TimetableConflict[];
  hasGenerated: boolean;
  teachers?: Teacher[];
  onGenerate: () => void;
  onShuffle: () => void;
  onClear: () => void;
  onOpenConflicts: () => void;
  onOpenTeacherDirectory: () => void;
  onRemoveAllClashes: () => void;
  onResolveAllConflicts: () => void;
  onMassResolve?: () => void;
  onExportAllPDF: () => void;
  onOpenPrintPreview?: () => void;
  onViewTeacherFreePeriods?: (teacherId: string) => void;
  onGenerateAllTeachersFreePeriods?: () => void;
  onOpenSave?: () => void;
  onOpenRetrieve?: () => void;
  selectedConfigOption?: ConfigOptionTab;
  onSelectConfigOption?: (option: ConfigOptionTab) => void;
  isConfigDrawerOpen?: boolean;
  onToggleConfigDrawer?: () => void;
}

export const GeneratorBar: React.FC<GeneratorBarProps> = ({
  conflicts,
  hasGenerated,
  teachers = [],
  onGenerate,
  onShuffle,
  onClear,
  onOpenConflicts,
  onOpenTeacherDirectory,
  onRemoveAllClashes,
  onResolveAllConflicts,
  onMassResolve,
  onExportAllPDF,
  onOpenPrintPreview,
  onViewTeacherFreePeriods,
  onGenerateAllTeachersFreePeriods,
  onOpenSave,
  onOpenRetrieve,
  selectedConfigOption = 'all',
  onSelectConfigOption,
  isConfigDrawerOpen,
  onToggleConfigDrawer,
}) => {
  const clashCount = conflicts.length;
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [showFreeSlotsRow, setShowFreeSlotsRow] = useState<boolean>(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState<boolean>(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex flex-col gap-2 z-20 shadow-xs">
      {/* Primary Generator Action Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left: Timetable status & primary generate */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={onGenerate}
            className="h-9 px-3 sm:px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4 text-white fill-white" />
            <span className="hidden xs:inline">Generate Timetable</span>
            <span className="xs:hidden">Generate</span>
          </button>

          {/* Quick Save & Retrieve in action bar */}
          {onOpenSave && (
            <button
              onClick={onOpenSave}
              className="h-9 px-2.5 sm:px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Save current timetable state"
            >
              <Save className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {onOpenRetrieve && (
            <button
              onClick={onOpenRetrieve}
              className="h-9 px-2.5 sm:px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Retrieve saved timetable"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Retrieve</span>
            </button>
          )}

          {hasGenerated && (
            <button
              onClick={onOpenConflicts}
              className={`h-9 px-2.5 sm:px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                clashCount === 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70'
              }`}
            >
              {clashCount === 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Zero Clashes</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>{clashCount} Clash{clashCount > 1 ? 'es' : ''}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Secondary Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap ml-auto">
          {teachers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFreeSlotsRow(!showFreeSlotsRow)}
              className={`h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                showFreeSlotsRow
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Show / hide free slots quick view row"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Free Slots</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showFreeSlotsRow ? 'rotate-180' : ''}`} />
            </button>
          )}

          {hasGenerated && onMassResolve && (
            <button
              onClick={onMassResolve}
              className={`h-8 px-2.5 sm:px-3 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
                clashCount > 0
                  ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white ring-1 ring-violet-400/40'
                  : 'bg-slate-100 border border-slate-200 text-slate-800'
              }`}
              title="Global heuristic optimizer: Resolves all clashes in one click"
            >
              <Wand2 className={`w-3.5 h-3.5 ${clashCount > 0 ? 'text-amber-300' : 'text-indigo-600'}`} />
              <span className="hidden sm:inline">Mass Resolve</span>
              <span className="sm:hidden">Auto-Fix</span>
              {clashCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-white font-mono text-[0.65rem] font-bold">
                  {clashCount}
                </span>
              )}
            </button>
          )}

          {hasGenerated && (
            <button
              onClick={onShuffle}
              className="h-8 px-2 sm:px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Re-shuffle timetable with fresh random distribution"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          )}

          <button
            onClick={onOpenTeacherDirectory}
            className="h-8 px-2 sm:px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Faculty</span> Directory
          </button>

          {onOpenPrintPreview && (
            <button
              onClick={onOpenPrintPreview}
              className="h-8 px-2 sm:px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer hidden md:flex"
              title="Preview printable A4 layout"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Print Preview</span>
            </button>
          )}

          <button
            onClick={onExportAllPDF}
            className="h-8 px-2 sm:px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer hidden sm:flex"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF (All)</span>
          </button>

          <button
            onClick={onClear}
            className="h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Teacher Free Period Selector Row (Shown when toggled or selected from menu) */}
      {teachers.length > 0 && showFreeSlotsRow && (
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-2xs overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-[0.7rem] font-bold text-slate-700 px-1 flex items-center gap-1 shrink-0">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Teacher Free Periods:</span>
            <span className="sm:hidden">Free Slots:</span>
          </span>

          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 max-w-[130px] sm:max-w-[180px] truncate shrink-0"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onViewTeacherFreePeriods && onViewTeacherFreePeriods(selectedTeacherId || teachers[0]?.id)}
            className="h-7 px-2 sm:px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
            title="View free periods for the selected teacher"
          >
            <UserCheck className="w-3 h-3" />
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAllTeachersFreePeriods}
            className="h-7 px-2 sm:px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Generate list of all teachers with their day-by-day free periods"
          >
            <CalendarCheck className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">All Faculty Free Periods</span>
            <span className="sm:hidden">All Faculty</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFreeSlotsRow(false)}
            className="h-7 w-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors ml-auto cursor-pointer"
            title="Hide free slots bar"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
