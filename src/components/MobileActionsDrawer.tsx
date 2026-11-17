import React from 'react';
import {
  X,
  Shuffle,
  Eye,
  Printer,
  Download,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  Save,
  FolderOpen,
  Brush,
  RotateCcw,
  Sparkles,
  Sliders,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Users,
  Layers,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfigOptionTab } from '../types';

interface MobileActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: string;
  hasGenerated: boolean;
  onShuffle: () => void;
  onOpenPrintPreview: (clsName?: string) => void;
  onExportAllPDF: () => void;
  onExportClassPDF: (clsName: string) => void;
  onViewTeacherFreePeriods: (teacherId?: string, mode?: 'single' | 'all') => void;
  onOpenTeacherWorkloadChart: () => void;
  onOpenTeacherScheduleReport?: () => void;
  onOpenTeacherDirectory: () => void;
  onRemoveAllClashes: () => void;
  onClearTimetable: () => void;
  onOpenSave: () => void;
  onOpenRetrieve: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  selectedConfigOption?: ConfigOptionTab;
  onSelectConfigOption?: (option: ConfigOptionTab) => void;
  onOpenConfigDrawer?: () => void;
}

export const MobileActionsDrawer: React.FC<MobileActionsDrawerProps> = ({
  isOpen,
  onClose,
  activeClass,
  hasGenerated,
  onShuffle,
  onOpenPrintPreview,
  onExportAllPDF,
  onExportClassPDF,
  onViewTeacherFreePeriods,
  onOpenTeacherWorkloadChart,
  onOpenTeacherDirectory,
  onRemoveAllClashes,
  onClearTimetable,
  onOpenSave,
  onOpenRetrieve,
  onOpenProfile,
  onOpenAuth,
  selectedConfigOption = 'all',
  onSelectConfigOption,
  onOpenConfigDrawer,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[850] bg-slate-900/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150 print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[85vh] bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Drag handle & Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Quick Actions &amp; Options Menu
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Grid Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4 pb-12">
          {/* 1. Setup & Configuration Options Selection */}
          <div>
            <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Setup &amp; Config Options
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectConfigOption?.('teachers');
                  onOpenConfigDrawer?.();
                  onClose();
                }}
                className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/80 active:bg-indigo-100 flex items-center gap-2.5 text-xs font-bold text-indigo-950 transition-all cursor-pointer text-left"
              >
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Teacher Setup</div>
                  <div className="text-[0.65rem] font-normal text-indigo-700">Manage faculty</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectConfigOption?.('classes');
                  onOpenConfigDrawer?.();
                  onClose();
                }}
                className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/80 active:bg-indigo-100 flex items-center gap-2.5 text-xs font-bold text-indigo-950 transition-all cursor-pointer text-left"
              >
                <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Class &amp; Subjects</div>
                  <div className="text-[0.65rem] font-normal text-indigo-700">Curriculum setup</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectConfigOption?.('recess');
                  onOpenConfigDrawer?.();
                  onClose();
                }}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 active:bg-amber-100 flex items-center gap-2.5 text-xs font-bold text-amber-950 transition-all cursor-pointer text-left"
              >
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Recess &amp; Breaks</div>
                  <div className="text-[0.65rem] font-normal text-amber-700">Interval rules</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectConfigOption?.('restrictions');
                  onOpenConfigDrawer?.();
                  onClose();
                }}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 active:bg-rose-100 flex items-center gap-2.5 text-xs font-bold text-rose-950 transition-all cursor-pointer text-left"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Restrictions</div>
                  <div className="text-[0.65rem] font-normal text-rose-700">Period constraints</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Schedule Tools */}
          <div>
            <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Timetable Operations
            </div>
            <div className="grid grid-cols-2 gap-2">
              {hasGenerated && (
                <button
                  type="button"
                  onClick={() => {
                    onShuffle();
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/80 active:bg-indigo-100 flex items-center gap-2.5 text-xs font-bold text-indigo-900 transition-all cursor-pointer text-left"
                >
                  <Shuffle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="leading-tight truncate">Shuffle Grid</div>
                    <div className="text-[0.65rem] font-normal text-indigo-700">Re-seed slots</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenPrintPreview(activeClass);
                  onClose();
                }}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 active:bg-slate-100 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-all cursor-pointer text-left"
              >
                <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Print Preview</div>
                  <div className="text-[0.65rem] font-normal text-slate-500">A4 paper layout</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportClassPDF(activeClass);
                  onClose();
                }}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 active:bg-slate-100 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-all cursor-pointer text-left"
              >
                <Download className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Class PDF</div>
                  <div className="text-[0.65rem] font-normal text-slate-500">{activeClass} only</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportAllPDF();
                  onClose();
                }}
                className="p-3 rounded-xl border border-slate-900 bg-slate-900 active:bg-slate-800 flex items-center gap-2.5 text-xs font-bold text-white transition-all cursor-pointer text-left"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">All Classes PDF</div>
                  <div className="text-[0.65rem] font-normal text-slate-400">Bundle download</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Faculty & Workload Analysis */}
          <div>
            <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Faculty &amp; Workload
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenTeacherWorkloadChart();
                  onClose();
                }}
                className="p-3 rounded-xl border border-purple-200 bg-purple-50/80 active:bg-purple-100 flex items-center gap-2.5 text-xs font-bold text-purple-950 transition-all cursor-pointer text-left"
              >
                <BarChart3 className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Workload Chart</div>
                  <div className="text-[0.65rem] font-normal text-purple-700">Bar visualization</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewTeacherFreePeriods(undefined, 'all');
                  onClose();
                }}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/80 active:bg-emerald-100 flex items-center gap-2.5 text-xs font-bold text-emerald-950 transition-all cursor-pointer text-left"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Free Slots</div>
                  <div className="text-[0.65rem] font-normal text-emerald-700">Substitution finder</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Save, Cloud & Account */}
          <div>
            <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Save &amp; Cloud Storage
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenSave();
                  onClose();
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white active:bg-slate-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-all cursor-pointer text-left shadow-2xs"
              >
                <Save className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Save Schedule</div>
                  <div className="text-[0.65rem] font-normal text-slate-500">Local &amp; cloud</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenRetrieve();
                  onClose();
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white active:bg-slate-50 flex items-center gap-2.5 text-xs font-bold text-slate-800 transition-all cursor-pointer text-left shadow-2xs"
              >
                <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="leading-tight truncate">Saved Backups</div>
                  <div className="text-[0.65rem] font-normal text-slate-500">Restore timetables</div>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Danger / Reset Actions */}
          {hasGenerated && (
            <div>
              <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Clashes &amp; Reset
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRemoveAllClashes();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl border border-amber-200 bg-amber-50 active:bg-amber-100 flex items-center justify-between text-xs font-bold text-amber-900 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Brush className="w-4 h-4 text-amber-600" />
                    <span>Clear All Clashing Slots</span>
                  </span>
                  <span className="text-[0.65rem] text-amber-700 font-medium">Keep valid slots</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearTimetable();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl border border-rose-200 bg-rose-50 active:bg-rose-100 flex items-center justify-between text-xs font-bold text-rose-900 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>Clear Entire Generated Grid</span>
                  </span>
                  <span className="text-[0.65rem] text-rose-700 font-medium">Reset grid</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. User Account */}
          <div className="pt-2 border-t border-slate-200">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs font-black text-slate-900 truncate">{user.name}</div>
                      <span className="text-[0.6rem] bg-indigo-100 text-indigo-800 font-bold px-1 rounded uppercase">
                        {user.role}
                      </span>
                    </div>
                    <div className="text-[0.65rem] text-indigo-600 font-mono">@{user.username || 'principal'}</div>
                    <div className="text-[0.65rem] text-slate-500 truncate">{user.institutionName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile();
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold cursor-pointer"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenAuth();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
