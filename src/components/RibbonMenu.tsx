import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Teacher,
  ClassEntry,
  ScheduleEntry,
  TimetableGrid,
  TimetableConflict,
  SavedTimetable,
  AutoSaveSession,
  RecessPreferences,
  ConfigOptionTab,
} from '../types';
import { exportTimetablePDF, exportTeacherSchedulePDF, exportFreePeriodsReportPDF } from '../utils/pdfExport';
import { AutoSaveIndicator, AutoSaveStatus } from './AutoSaveIndicator';
import {
  Zap,
  Shuffle,
  Brush,
  Sparkles,
  Wand2,
  Eye,
  Printer,
  Download,
  Upload,
  Save,
  FolderOpen,
  FileSpreadsheet,
  Users,
  UserCheck,
  CalendarCheck,
  School,
  BookOpen,
  Layers,
  PlusCircle,
  Settings,
  Clock,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  Grid,
  Trash2,
  FileText,
  LayoutGrid,
  User as UserIcon,
  LogOut,
  Info,
  Calendar,
  XCircle,
  HelpCircle,
  ArrowRight,
  Maximize2,
  Minimize2,
  BarChart3,
  Crown,
  KeyRound,
} from 'lucide-react';

export type RibbonTabType = 'home' | 'teachers' | 'classes' | 'subjects' | 'exports' | 'settings' | 'file';

interface RibbonMenuProps {
  // App state
  teachers: Teacher[];
  classes: ClassEntry[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  conflicts: TimetableConflict[];
  activeClass: string;
  nperiods: number;
  startTime: string;
  recessPrefs: RecessPreferences;
  notFirstPeriod: string[];
  notLastPeriod: string[];
  savedCount: number;
  savedTimetables: SavedTimetable[];

  // Setters & Actions
  onSelectClass: (clsName: string) => void;
  onGenerate: () => void;
  onShuffle: () => void;
  onClear: () => void;
  onOpenSave: () => void;
  onOpenRetrieve: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenProfile: (tab?: 'profile' | 'institution' | 'security') => void;
  onOpenAuth: () => void;
  onOpenSuperuserConsole?: () => void;
  onLoadTimetable: (id: string) => void;
  onDeleteTimetable: (id: string, name: string) => void;

  // Conflict tools
  onOpenConflicts: () => void;
  onRemoveAllClashes: () => void;
  onResolveAllConflicts: () => void;
  onMassResolve?: () => void;
  onRemoveClashesForClass: (clsName: string) => void;
  onResolveTeacherClash?: (teacherId: string) => void;
  onResolveAllFacultyClashes?: () => void;

  // Modals & Panels
  onOpenTeacherDirectory: () => void;
  onOpenTeacherWorkloadChart?: () => void;
  onOpenTeacherScheduleReport?: (teacherId: string) => void;
  onViewTeacherFreePeriods?: (teacherId?: string, mode?: 'single' | 'all') => void;
  onOpenSubjectSummary: (clsName: string) => void;
  onOpenClassInfo: (clsName: string) => void;
  onOpenAddSubjectModal: (targetClass?: string) => void;
  onOpenPrintPreview: (clsName?: string) => void;

  // Exports
  onExportAllPDF: () => void;
  onExportClassPDF: (clsName: string) => void;

  // Clear actions
  onClearAllTeachers?: () => void;
  onClearAllSubjects?: () => void;
  onClearClassSubjects?: (clsName: string) => void;

  // Auto-Save controls & state
  autoSaveStatus?: AutoSaveStatus;
  lastAutoSavedAt?: string | null;
  isAutoSaveEnabled?: boolean;
  onToggleAutoSave?: (enabled: boolean) => void;
  onTriggerManualAutoSave?: () => void;
  onRestoreAutoSave?: () => void;
  latestAutoSaveSession?: AutoSaveSession | null;

  // Configuration Drawer toggle & options
  isConfigDrawerOpen?: boolean;
  onToggleConfigDrawer?: () => void;
  selectedConfigOption?: ConfigOptionTab;
  onSelectConfigOption?: (option: ConfigOptionTab) => void;

  // Active Ribbon Tab
  activeRibbonTab?: RibbonTabType;
  onSelectRibbonTab?: (tab: RibbonTabType) => void;
}

export const RibbonMenu: React.FC<RibbonMenuProps> = ({
  teachers,
  classes,
  schedule,
  tt,
  conflicts,
  activeClass,
  nperiods,
  startTime,
  recessPrefs,
  notFirstPeriod,
  notLastPeriod,
  savedCount,
  savedTimetables,
  onSelectClass,
  onGenerate,
  onShuffle,
  onClear,
  onOpenSave,
  onOpenRetrieve,
  onExportJSON,
  onImportJSON,
  onOpenProfile,
  onOpenAuth,
  onOpenSuperuserConsole,
  onLoadTimetable,
  onDeleteTimetable,
  onOpenConflicts,
  onRemoveAllClashes,
  onResolveAllConflicts,
  onMassResolve,
  onRemoveClashesForClass,
  onResolveTeacherClash,
  onResolveAllFacultyClashes,
  onOpenTeacherDirectory,
  onOpenTeacherWorkloadChart,
  onOpenTeacherScheduleReport,
  onViewTeacherFreePeriods,
  onOpenSubjectSummary,
  onOpenClassInfo,
  onOpenAddSubjectModal,
  onOpenPrintPreview,
  onExportAllPDF,
  onExportClassPDF,
  onClearAllTeachers,
  onClearAllSubjects,
  onClearClassSubjects,
  autoSaveStatus = 'idle',
  lastAutoSavedAt = null,
  isAutoSaveEnabled = true,
  onToggleAutoSave,
  onTriggerManualAutoSave,
  onRestoreAutoSave,
  latestAutoSaveSession = null,
  isConfigDrawerOpen,
  onToggleConfigDrawer,
  selectedConfigOption = 'all',
  onSelectConfigOption,
  activeRibbonTab,
  onSelectRibbonTab,
}) => {
  const { user, isAuthenticated, isSuperuser, logout } = useAuth();

  // Ribbon state
  const [internalActiveTab, setInternalActiveTab] = useState<RibbonTabType>('home');
  const activeTab = activeRibbonTab || internalActiveTab;

  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [optionsDropdownOpen, setOptionsDropdownOpen] = useState<boolean>(false);
  const [quickRetrieveOpen, setQuickRetrieveOpen] = useState<boolean>(false);
  const [fileMenuOpen, setFileMenuOpen] = useState<boolean>(false);

  // Selected faculty in Teachers tab defaults to "None" ("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const retrieveMenuRef = useRef<HTMLDivElement>(null);
  const fileBackstageRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setOptionsDropdownOpen(false);
      }
      if (retrieveMenuRef.current && !retrieveMenuRef.current.contains(e.target as Node)) {
        setQuickRetrieveOpen(false);
      }
      if (fileBackstageRef.current && !fileBackstageRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasGenerated = Object.keys(tt).length > 0;
  const clashCount = conflicts.length;
  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const currentClass = activeClass || classes[0]?.name || '';

  const handleTabClick = (tabKey: RibbonTabType) => {
    if (tabKey === 'file') {
      setFileMenuOpen(true);
      return;
    }
    setInternalActiveTab(tabKey);
    onSelectRibbonTab?.(tabKey);
    if (isRibbonCollapsed) {
      setIsRibbonCollapsed(false);
    }
    // Set appropriate options display when selecting tabs from menu
    if (tabKey === 'home') {
      onSelectConfigOption?.('all');
    } else if (tabKey === 'teachers') {
      onSelectConfigOption?.('teachers');
    } else if (tabKey === 'classes') {
      onSelectConfigOption?.('classes');
    } else if (tabKey === 'subjects') {
      onSelectConfigOption?.('classes');
    } else if (tabKey === 'settings') {
      onSelectConfigOption?.('recess');
    }
  };

  const handleTabDoubleClick = (tabKey: RibbonTabType) => {
    if (tabKey !== 'file') {
      setIsRibbonCollapsed(!isRibbonCollapsed);
    }
  };

  const handleDirectPrint = () => {
    window.print();
  };

  return (
    <div id="office-ribbon-container" className="bg-slate-900 select-none z-30 shrink-0 print:hidden shadow-md">
      {/* 1. TOP TITLE BAR & QUICK ACCESS TOOLBAR (QAT) */}
      <div className="h-9 px-3 sm:px-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        {/* Left: Brand Identity & Quick Access Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Brand badge */}
          <div className="flex items-center gap-1.5 font-bold text-white tracking-tight">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Grid className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-xs">
              School<span className="text-indigo-400">Grid</span>
            </span>
            <span className="text-[0.62rem] bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.2 rounded font-mono font-semibold">
              Ribbon Pro
            </span>
          </div>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5 hidden sm:block" />

          {/* Quick Access Toolbar (QAT) Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenSave}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Quick Save (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={onOpenRetrieve}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open / Retrieve Schedule (Ctrl+O)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={onGenerate}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Quick Auto-Generate Timetable"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {hasGenerated && (
              <button
                type="button"
                onClick={onShuffle}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Shuffle & Re-seed Timetable"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-300" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenPrintPreview(activeClass)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Print Preview (A4 Layout)"
            >
              <Eye className="w-3.5 h-3.5 text-slate-300" />
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Direct Print (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Center: Document Title & School Name */}
        <div className="hidden md:flex items-center gap-2 text-center text-slate-300 font-medium text-[0.72rem] truncate px-4">
          <span className="font-bold text-white truncate">
            {activeClass ? `${activeClass} — Master Timetable` : 'Master Timetable Schedule'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 truncate">
            {user?.institutionName || 'SchoolGrid Academy'}
          </span>
          {hasGenerated && (
            <span
              className={`text-[0.65rem] px-1.5 py-0.2 rounded font-bold ${
                clashCount === 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950 text-rose-300 border border-rose-800/60 animate-pulse'
              }`}
            >
              {clashCount === 0 ? '✓ Zero Clashes' : `⚠ ${clashCount} Clash${clashCount > 1 ? 'es' : ''}`}
            </span>
          )}
        </div>

        {/* Right: Superuser Console, Auto-Save, Account & Ribbon Collapse Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isSuperuser && onOpenSuperuserConsole && (
            <button
              type="button"
              onClick={onOpenSuperuserConsole}
              className="h-6 px-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[0.68rem] flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
              title="Open Superuser Console — Manage Schools & Block/Unblock Admins"
            >
              <Crown className="w-3 h-3" />
              <span className="hidden sm:inline">Superuser Console</span>
            </button>
          )}

          {/* Auto-Save Indicator Component */}
          {onToggleAutoSave && onTriggerManualAutoSave && (
            <AutoSaveIndicator
              status={autoSaveStatus}
              lastSavedAt={lastAutoSavedAt}
              isAutoSaveEnabled={isAutoSaveEnabled}
              onToggleAutoSave={onToggleAutoSave}
              onTriggerManualAutoSave={onTriggerManualAutoSave}
              onRestoreAutoSave={onRestoreAutoSave}
              latestSession={latestAutoSaveSession}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* User Account / Profile */}
          <div className="relative" ref={userMenuRef}>
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white cursor-pointer"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-4 h-4 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[0.68rem] font-bold max-w-[80px] truncate hidden sm:inline">
                  {isSuperuser ? 'Superuser' : user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="h-6 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[0.68rem] flex items-center gap-1 cursor-pointer"
              >
                <UserIcon className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}

            {userDropdownOpen && isAuthenticated && user && (
              <div
                className="absolute top-[calc(100%+4px)] right-0 bg-white border border-slate-200 rounded-xl shadow-xl w-[250px] p-2 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2.5 bg-slate-50 rounded-lg mb-1.5 border border-slate-200">
                  <div className="text-xs font-black text-slate-900">{user.name}</div>
                  <div className="text-[0.68rem] text-slate-500 truncate">{user.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-[0.65rem] font-bold px-1.5 py-0.2 rounded border ${
                        isSuperuser
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span className="text-[0.65rem] text-slate-500">{user.academicYear}</span>
                  </div>
                </div>

                {isSuperuser && onOpenSuperuserConsole && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenSuperuserConsole();
                    }}
                    className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors mb-1 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Superuser Console</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenProfile('profile');
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Profile &amp; Institution</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenProfile('security');
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Security &amp; Password</span>
                </button>

                <div className="h-[1px] bg-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Ribbon Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isRibbonCollapsed ? 'Expand Ribbon Menu' : 'Collapse Ribbon Menu'}
          >
            {isRibbonCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. RIBBON TABS STRIP (MS Office Style) */}
      <div className="bg-slate-900 px-3 sm:px-4 flex items-center justify-between overflow-x-auto scrollbar-none border-b border-slate-800">
        <div className="flex items-center gap-0.5">
          {/* File Menu Tab (Accent Button) */}
          <button
            type="button"
            onClick={() => setFileMenuOpen(true)}
            className="h-8 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-t-md transition-colors flex items-center gap-1.5 mr-1.5 cursor-pointer shadow-2xs"
          >
            <span>File</span>
          </button>

          {/* Core Feature Tabs */}
          {[
            { id: 'home', label: 'Home / Timetable', icon: Grid },
            { id: 'teachers', label: 'Teacher', icon: Users, badge: teachers.length },
            { id: 'classes', label: 'Classes, Subjects & Faculty', icon: Layers, badge: classes.length },
            { id: 'exports', label: 'Exports & Print', icon: Download },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComp = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id as RibbonTabType)}
                onDoubleClick={() => handleTabDoubleClick(tab.id as RibbonTabType)}
                className={`h-8 px-3 sm:px-3.5 text-xs font-bold rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 border-t-2 border-indigo-600 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[0.62rem] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pin status icon */}
        <button
          type="button"
          onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
          className="text-slate-400 hover:text-slate-200 p-1 text-xs flex items-center gap-1 transition-colors cursor-pointer hidden lg:flex"
          title={isRibbonCollapsed ? 'Ribbon is collapsed (click to pin open)' : 'Pin ribbon open'}
        >
          {isRibbonCollapsed ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3 text-indigo-400" />}
          <span className="text-[0.68rem]">{isRibbonCollapsed ? 'Expand' : 'Pinned'}</span>
        </button>
      </div>

      {/* 3. RIBBON TOOLBAR BODY (Groups of Tools with Dividers & Captions) */}
      {!isRibbonCollapsed && (
        <div className="bg-slate-100 text-slate-900 border-b border-slate-300 px-3 sm:px-4 py-2 min-h-[92px] overflow-x-auto shadow-inner flex items-stretch">
          {/* ========================================================================= */}
          {/* TAB 1: HOME / TIMETABLE */}
          {/* ========================================================================= */}
          {activeTab === 'home' && (
            <div className="flex items-stretch gap-2 animate-in fade-in duration-100">
              {/* Group 1: Generator Engine */}
              <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Large Primary Generate Button */}
                  <button
                    type="button"
                    onClick={onGenerate}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Run intelligent timetable algorithm to populate all class schedules"
                  >
                    <Zap className="w-5 h-5 text-amber-300 fill-amber-300 mb-0.5" />
                    <span className="leading-tight text-center">Generate<br />Timetable</span>
                  </button>

                  {/* Mass Resolve button */}
                  {onMassResolve && (
                    <button
                      type="button"
                      onClick={onMassResolve}
                      disabled={!hasGenerated}
                      className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[70px]"
                      title="Mass Resolve: Global heuristic optimizer clears all clashes in one click"
                    >
                      <Wand2 className="w-4 h-4 text-amber-300 mb-0.5" />
                      <span className="leading-tight text-center">Mass<br />Resolve</span>
                    </button>
                  )}

                  {/* Stacked tools: Shuffle & Clear */}
                  <div className="flex flex-col gap-1 justify-center">
                    <button
                      type="button"
                      onClick={onShuffle}
                      disabled={!hasGenerated}
                      className="h-[27px] px-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-800 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Re-seed timetable with fresh distribution"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Shuffle Seeds</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClear}
                      disabled={!hasGenerated}
                      className="h-[27px] px-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Clear generated grid"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Clear Grid</span>
                    </button>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  GENERATION ENGINE
                </div>
              </div>

              {/* Group 2: Clash Diagnostics & Resolution */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Big Conflict Center Button */}
                  <button
                    type="button"
                    onClick={onOpenConflicts}
                    disabled={!hasGenerated}
                    className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[80px] ${
                      !hasGenerated
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : clashCount === 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
                    }`}
                    title="Open Conflict Diagnostics Center"
                  >
                    {clashCount === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 mb-0.5" />
                    )}
                    <span className="leading-tight text-center">
                      {clashCount === 0 ? 'Zero\nClashes' : `${clashCount} Clash\nCenter`}
                    </span>
                  </button>

                  {/* Resolution actions */}
                  <div className="flex flex-col gap-1 justify-center">
                    <button
                      type="button"
                      onClick={() => onResolveAllConflicts()}
                      disabled={!hasGenerated || clashCount === 0}
                      className="h-[27px] px-2.5 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Auto-resolve all conflicts"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto Resolve</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRemoveAllClashes}
                      disabled={!hasGenerated || clashCount === 0}
                      className="h-[27px] px-2.5 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Remove clashing assignments"
                    >
                      <Brush className="w-3.5 h-3.5" />
                      <span>Remove Clashes</span>
                    </button>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  CLASH RESOLVER
                </div>
              </div>

              {/* Group 3: Active Class View & Switching */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1 justify-center min-w-[130px]">
                    <span className="text-[0.68rem] font-bold text-slate-500">Active Class View:</span>
                    <select
                      value={currentClass}
                      onChange={(e) => onSelectClass(e.target.value)}
                      disabled={classes.length === 0}
                      className="h-[30px] px-2 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-900 outline-none focus:border-indigo-600 shadow-2xs disabled:opacity-50"
                    >
                      {classes.length === 0 ? (
                        <option value="">No classes</option>
                      ) : (
                        classes.map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 justify-center">
                    <button
                      type="button"
                      onClick={() => onOpenClassInfo(currentClass)}
                      disabled={!currentClass}
                      className="h-[27px] px-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="View Class Info & Breakdown"
                    >
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Class Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSubjectSummary(currentClass)}
                      disabled={!currentClass}
                      className="h-[27px] px-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="View Subject Allocation Sheet"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Summary</span>
                    </button>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  CLASS SHEET
                </div>
              </div>

              {/* Group 4: Quick Preview & Print */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenPrintPreview(currentClass)}
                    disabled={!currentClass}
                    className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 text-indigo-900 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[70px]"
                    title="Open A4 Print Preview layout"
                  >
                    <Eye className="w-4 h-4 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Print<br />Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[65px]"
                    title="Direct standard print"
                  >
                    <Printer className="w-4 h-4 text-slate-700 mb-0.5" />
                    <span className="leading-tight text-center">Direct<br />Print</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  OUTPUT &amp; PRINT
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TEACHERS (Faculty Management, Workload, Free Periods & Substitution) */}
          {/* ========================================================================= */}
          {activeTab === 'teachers' && (
            <div className="flex items-stretch gap-2 animate-in fade-in duration-100">
              {/* Group 1: Faculty Directory */}
              <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Large Faculty Directory button */}
                  <button
                    type="button"
                    onClick={onOpenTeacherDirectory}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                    title="Open full Faculty Directory, Workload & Assignments table"
                  >
                    <Users className="w-5 h-5 text-indigo-200 mb-0.5" />
                    <span className="leading-tight text-center">Faculty<br />Directory</span>
                  </button>

                  {/* Clear all faculty button */}
                  {onClearAllTeachers && (
                    <button
                      type="button"
                      onClick={onClearAllTeachers}
                      disabled={teachers.length === 0}
                      className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                      title="Clear or remove all registered faculty members"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600 mb-0.5" />
                      <span className="leading-tight text-center">Clear All<br />Faculty</span>
                    </button>
                  )}

                  {/* Registered count display card */}
                  <div className="flex flex-col justify-center bg-white p-2 rounded-lg border border-slate-300 h-[58px] min-w-[100px] text-center">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase">Registered</span>
                    <span className="text-base font-black text-indigo-600 font-mono leading-none">
                      {teachers.length} Faculty
                    </span>
                    <span className="text-[0.62rem] text-slate-400 mt-0.5 truncate">
                      {classes.length} Classes taught
                    </span>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  REGISTRY
                </div>
              </div>

              {/* Group 2: Workload & Schedule Report */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1 justify-center min-w-[140px]">
                    <span className="text-[0.68rem] font-bold text-slate-500">Select Faculty:</span>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="h-[30px] px-2 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-900 outline-none focus:border-indigo-600 shadow-2xs max-w-[160px] truncate"
                    >
                      <option value="">— None —</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Large Teacher Schedule Report button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenTeacherScheduleReport && selectedTeacherId) {
                        onOpenTeacherScheduleReport(selectedTeacherId);
                      } else {
                        onOpenTeacherDirectory();
                      }
                    }}
                    className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title={selectedTeacherId ? "Open detailed Schedule Report for selected faculty" : "Open full Faculty Directory"}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Schedule<br />Report</span>
                  </button>

                  {/* Large Workload Chart Visualizer button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenTeacherWorkloadChart) {
                        onOpenTeacherWorkloadChart();
                      } else {
                        onOpenTeacherDirectory();
                      }
                    }}
                    className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Open interactive workload bar chart to spot faculty imbalances"
                  >
                    <BarChart3 className="w-5 h-5 text-purple-600 mb-0.5" />
                    <span className="leading-tight text-center">Workload<br />Chart</span>
                  </button>

                  <div className="flex flex-col gap-1 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        exportTeacherSchedulePDF(teachers, classes, schedule, tt);
                      }}
                      className="h-[27px] px-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Export Faculty Master Schedule PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Export Faculty PDF</span>
                    </button>

                    {onResolveTeacherClash && (
                      <button
                        type="button"
                        disabled={!selectedTeacherId}
                        onClick={() => {
                          if (selectedTeacherId) onResolveTeacherClash(selectedTeacherId);
                        }}
                        className="h-[27px] px-2 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:pointer-events-none text-amber-900 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title={selectedTeacherId ? "Resolve clashes for selected teacher" : "Select a faculty member first"}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fix Teacher Clashes</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  WORKLOAD &amp; ASSESSMENT
                </div>
              </div>

              {/* Group 3: Free Periods & Substitution Finder */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Single Teacher Free Periods */}
                  <button
                    type="button"
                    onClick={() => onViewTeacherFreePeriods && onViewTeacherFreePeriods(selectedTeacherId, 'single')}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[78px]"
                    title="View free periods and substitution availability for selected teacher"
                  >
                    <UserCheck className="w-5 h-5 text-emerald-200 mb-0.5" />
                    <span className="leading-tight text-center">Teacher<br />Free Slots</span>
                  </button>

                  {/* All Teachers Free Periods List */}
                  <button
                    type="button"
                    onClick={() => onViewTeacherFreePeriods && onViewTeacherFreePeriods('', 'all')}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[86px]"
                    title="Generate complete roster of all faculty members and their day-by-day free slots"
                  >
                    <CalendarCheck className="w-5 h-5 text-emerald-700 mb-0.5" />
                    <span className="leading-tight text-center">All Free<br />Periods Roster</span>
                  </button>

                  <div className="flex flex-col gap-1 justify-center">
                    <button
                      type="button"
                      onClick={() => exportFreePeriodsReportPDF(teachers, classes, schedule, tt)}
                      className="h-[27px] px-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-[0.72rem] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Export Free Periods PDF for all faculty"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Free Slots PDF</span>
                    </button>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  SUBSTITUTION &amp; AVAILABILITY
                </div>
              </div>

              {/* Group 4: Faculty Clash Resolver */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-center gap-1.5 flex-1">
                  {onResolveAllFacultyClashes && (
                    <button
                      type="button"
                      onClick={onResolveAllFacultyClashes}
                      disabled={!hasGenerated}
                      className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                      title="Apply heuristic slot swaps to resolve clashes across all faculty members"
                    >
                      <Sparkles className="w-5 h-5 text-amber-600 mb-0.5" />
                      <span className="leading-tight text-center">Resolve All<br />Faculty Clashes</span>
                    </button>
                  )}
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  CLASH ACTIONS
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CLASSES (Class Rosters, Subject Allocations, Single Class Operations) */}
          {/* ========================================================================= */}
          {activeTab === 'classes' && (
            <div className="flex items-stretch gap-2 animate-in fade-in duration-100">
              {/* Group 1: Class Selection & Info */}
              <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1 justify-center min-w-[140px]">
                    <span className="text-[0.68rem] font-bold text-slate-500">Selected Class:</span>
                    <select
                      value={activeClass}
                      onChange={(e) => onSelectClass(e.target.value)}
                      className="h-[30px] px-2 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-900 outline-none focus:border-indigo-600 shadow-2xs"
                    >
                      {classes.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name} ({c.subjects?.length || 0} subjects)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class Info / Breakdown */}
                  <button
                    type="button"
                    onClick={() => onOpenClassInfo(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="View Class Info, Period breakdown and faculty list"
                  >
                    <Info className="w-5 h-5 text-indigo-200 mb-0.5" />
                    <span className="leading-tight text-center">Class<br />Breakdown</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  CLASS SELECTOR
                </div>
              </div>

              {/* Group 2: Curriculum & Subject Allotment */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Add Subject button */}
                  <button
                    type="button"
                    onClick={() => onOpenAddSubjectModal(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Add a new subject to this class"
                  >
                    <PlusCircle className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Add<br />Subject</span>
                  </button>

                  {/* Subject Summary sheet */}
                  <button
                    type="button"
                    onClick={() => onOpenSubjectSummary(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Subject Allocation and periods distribution sheet"
                  >
                    <BookOpen className="w-5 h-5 text-slate-700 mb-0.5" />
                    <span className="leading-tight text-center">Subject<br />Summary</span>
                  </button>

                  {/* Clear Class Subjects */}
                  {onClearClassSubjects && (
                    <button
                      type="button"
                      onClick={() => onClearClassSubjects(activeClass)}
                      disabled={!classes.find((c) => c.name === activeClass)?.subjects.length}
                      className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                      title="Clear or remove all subjects from currently active class"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600 mb-0.5" />
                      <span className="leading-tight text-center">Clear Class<br />Subjects</span>
                    </button>
                  )}
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  CURRICULUM
                </div>
              </div>

              {/* Group 3: Class Clash Tools */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => onRemoveClashesForClass(activeClass)}
                    disabled={!hasGenerated}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                    title="Clear clashes only in this class sheet"
                  >
                    <Brush className="w-5 h-5 text-rose-600 mb-0.5" />
                    <span className="leading-tight text-center">Clear Class<br />Clashes</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  CLASS CLASH RESOLVER
                </div>
              </div>

              {/* Group 4: Publishing & Printing for Active Class */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => onExportClassPDF(activeClass)}
                    disabled={!hasGenerated}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Export single class timetable PDF"
                  >
                    <Download className="w-5 h-5 text-indigo-300 mb-0.5" />
                    <span className="leading-tight text-center">Class<br />PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPrintPreview(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[70px]"
                    title="Open Print Preview for this class"
                  >
                    <Eye className="w-5 h-5 text-slate-700 mb-0.5" />
                    <span className="leading-tight text-center">Print<br />Preview</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  PUBLISH CLASS
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SUBJECTS (Curriculum Setup, Allocations & Restrictions) */}
          {/* ========================================================================= */}
          {activeTab === 'subjects' && (
            <div className="flex items-stretch gap-2 animate-in fade-in duration-100">
              {/* Group 1: Subject Operations */}
              <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenAddSubjectModal(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                    title="Add a subject across one or multiple classes"
                  >
                    <PlusCircle className="w-5 h-5 text-white mb-0.5" />
                    <span className="leading-tight text-center">Add Subject<br />Wizard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenSubjectSummary(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                    title="View comprehensive subject load & allocations across classes"
                  >
                    <BookOpen className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Subject<br />Allocation</span>
                  </button>

                  {/* Clear All Subjects */}
                  {onClearAllSubjects && (
                    <button
                      type="button"
                      onClick={onClearAllSubjects}
                      disabled={!classes.some((c) => c.subjects.length > 0)}
                      className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                      title="Clear or remove all subjects across all classes"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600 mb-0.5" />
                      <span className="leading-tight text-center">Clear All<br />Subjects</span>
                    </button>
                  )}
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  SUBJECT OPERATIONS
                </div>
              </div>

              {/* Group 2: Recess & Period Rules Status */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col justify-center bg-white p-2 rounded-lg border border-slate-300 h-[58px] min-w-[130px]">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase">Recess Rules</span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      Before: {recessPrefs.before?.length || 0} subjs
                    </span>
                    <span className="text-[0.65rem] text-slate-500 truncate">
                      After: {recessPrefs.after?.length || 0} subjs
                    </span>
                  </div>

                  <div className="flex flex-col justify-center bg-white p-2 rounded-lg border border-slate-300 h-[58px] min-w-[130px]">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase">Period Restrictions</span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      Not 1st: {notFirstPeriod?.length || 0} subjs
                    </span>
                    <span className="text-[0.65rem] text-slate-500 truncate">
                      Not Last: {notLastPeriod?.length || 0} subjs
                    </span>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  RULES &amp; CONSTRAINTS
                </div>
              </div>

              {/* Group 3: Drawer Shortcut */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-center gap-1.5 flex-1">
                  {onToggleConfigDrawer && (
                    <button
                      type="button"
                      onClick={onToggleConfigDrawer}
                      className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                      title="Open preferences card drawer to edit recess & restrictions"
                    >
                      <Sliders className="w-5 h-5 text-indigo-600 mb-0.5" />
                      <span className="leading-tight text-center">Edit Rules<br />In Drawer</span>
                    </button>
                  )}
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  SETTINGS
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: EXPORTS & PRINT (Master PDF, Single PDF, Faculty PDF, JSON Backup) */}
          {/* ========================================================================= */}
          {activeTab === 'exports' && (
            <div className="flex items-stretch gap-2 animate-in fade-in duration-100">
              {/* Group 1: PDF Document Generation */}
              <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Master PDF for all classes */}
                  <button
                    type="button"
                    onClick={onExportAllPDF}
                    disabled={!hasGenerated}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all cursor-pointer h-[58px] min-w-[84px]"
                    title="Export All Class Timetables into a single multi-page landscape PDF"
                  >
                    <Download className="w-5 h-5 text-white mb-0.5" />
                    <span className="leading-tight text-center">Export All<br />Classes PDF</span>
                  </button>

                  {/* Active Class PDF */}
                  <button
                    type="button"
                    onClick={() => onExportClassPDF(activeClass)}
                    disabled={!hasGenerated}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 text-indigo-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Export current active class timetable to PDF"
                  >
                    <FileText className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">{activeClass}<br />PDF</span>
                  </button>

                  {/* Faculty Schedule PDF */}
                  <button
                    type="button"
                    onClick={() => exportTeacherSchedulePDF(teachers, classes, schedule, tt)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Export Faculty Master Schedule & Directory PDF"
                  >
                    <Users className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Faculty<br />PDF</span>
                  </button>

                  {/* Free Periods PDF */}
                  <button
                    type="button"
                    onClick={() => exportFreePeriodsReportPDF(teachers, classes, schedule, tt)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Export Free Periods Matrix PDF for substitutions"
                  >
                    <UserCheck className="w-5 h-5 text-emerald-700 mb-0.5" />
                    <span className="leading-tight text-center">Free Slots<br />PDF</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  PDF EXPORTS
                </div>
              </div>

              {/* Group 2: Print Operations */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenPrintPreview(activeClass)}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Open Print Preview modal"
                  >
                    <Eye className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Print<br />Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[65px]"
                    title="Direct browser print"
                  >
                    <Printer className="w-5 h-5 text-slate-700 mb-0.5" />
                    <span className="leading-tight text-center">Direct<br />Print</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  PRINT CENTER
                </div>
              </div>

              {/* Group 3: Data Backup & Portability */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={onExportJSON}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Download complete schedule as JSON backup file"
                  >
                    <Download className="w-5 h-5 text-slate-700 mb-0.5" />
                    <span className="leading-tight text-center">Export<br />JSON File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[76px]"
                    title="Import JSON backup file into system"
                  >
                    <Upload className="w-5 h-5 text-slate-700 mb-0.5" />
                    <span className="leading-tight text-center">Import<br />JSON File</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  DATA BACKUP
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: SETTINGS & INSTITUTION */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="flex items-stretch gap-2 animate-in fade-in duration-100">
              {/* Group 1: Schedule Structure & Status */}
              <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col justify-center bg-white p-2 rounded-lg border border-slate-300 h-[58px] min-w-[150px]">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase">Fixed Structure</span>
                    <span className="text-xs font-black text-indigo-600 font-mono">
                      8 Periods · 6 Days/Wk
                    </span>
                    <span className="text-[0.65rem] font-medium text-amber-700">
                      ☕ Recess after Period 4
                    </span>
                  </div>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  SCHEDULE STRUCTURE
                </div>
              </div>

              {/* Group 2: Institution & Account */}
              <div className="flex flex-col justify-between px-3 border-r border-slate-300">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer h-[58px] min-w-[80px]"
                    title="Edit institution name, branding and profile"
                  >
                    <School className="w-5 h-5 text-indigo-600 mb-0.5" />
                    <span className="leading-tight text-center">Institution<br />Profile</span>
                  </button>
                </div>
                <div className="text-[0.62rem] uppercase font-bold tracking-wider text-slate-400 text-center mt-1">
                  INSTITUTION
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onImportJSON}
      />

      {/* 4. MS OFFICE "FILE" BACKSTAGE POPUP / MODAL */}
      {fileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[900] flex animate-in fade-in duration-150">
          <div
            ref={fileBackstageRef}
            className="w-full max-w-[420px] bg-slate-900 text-white shadow-2xl border-r border-slate-800 flex flex-col h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Backstage Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center font-bold text-white">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">SchoolGrid File Menu</h3>
                  <p className="text-[0.7rem] text-slate-400">Manage schedules, saves &amp; data backups</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFileMenuOpen(false)}
                className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Backstage Action List */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenSave();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-600 text-slate-200 hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-indigo-700 flex items-center justify-center text-indigo-400 group-hover:text-white">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">Save Timetable</div>
                  <div className="text-[0.68rem] text-slate-400 group-hover:text-indigo-100">
                    Store current timetable state into storage
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenRetrieve();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-600 text-slate-200 hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-indigo-700 flex items-center justify-center text-indigo-400 group-hover:text-white">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span>Retrieve / Open Timetable</span>
                    {savedCount > 0 && (
                      <span className="text-[0.62rem] bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.2 rounded-full">
                        {savedCount} saved
                      </span>
                    )}
                  </div>
                  <div className="text-[0.68rem] text-slate-400 group-hover:text-indigo-100">
                    Restore previously saved timetable versions
                  </div>
                </div>
              </button>

              {/* Auto-Save Status / Quick Action Card */}
              {onTriggerManualAutoSave && onToggleAutoSave && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2 my-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-slate-200">Auto-Save Protection</span>
                    </div>
                    <span className="text-[0.62rem] font-bold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                      Every 60s
                    </span>
                  </div>

                  <div className="text-[0.68rem] text-slate-400">
                    {lastAutoSavedAt
                      ? `Last auto-saved at ${new Date(lastAutoSavedAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Auto-save is actively monitoring state changes'}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onTriggerManualAutoSave();
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[0.7rem] transition-colors cursor-pointer text-center"
                    >
                      Save Snapshot Now
                    </button>
                    {latestAutoSaveSession && onRestoreAutoSave && (
                      <button
                        type="button"
                        onClick={() => {
                          setFileMenuOpen(false);
                          onRestoreAutoSave();
                        }}
                        className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[0.7rem] transition-colors cursor-pointer"
                      >
                        Restore Draft
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="h-[1px] bg-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onExportAllPDF();
                }}
                disabled={!hasGenerated}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-600 disabled:opacity-40 text-slate-200 hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-indigo-700 flex items-center justify-center text-indigo-400 group-hover:text-white">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">Export All Timetables PDF</div>
                  <div className="text-[0.68rem] text-slate-400 group-hover:text-indigo-100">
                    High resolution landscape printable PDF
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onExportJSON();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-600 text-slate-200 hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-indigo-700 flex items-center justify-center text-indigo-400 group-hover:text-white">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">Export JSON Backup File</div>
                  <div className="text-[0.68rem] text-slate-400 group-hover:text-indigo-100">
                    Complete raw backup for migration &amp; archival
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-600 text-slate-200 hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-indigo-700 flex items-center justify-center text-indigo-400 group-hover:text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">Import JSON File</div>
                  <div className="text-[0.68rem] text-slate-400 group-hover:text-indigo-100">
                    Load timetable state from external .json file
                  </div>
                </div>
              </button>

              <div className="h-[1px] bg-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenProfile();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-600 text-slate-200 hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-indigo-700 flex items-center justify-center text-indigo-400 group-hover:text-white">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">Institution Settings</div>
                  <div className="text-[0.68rem] text-slate-400 group-hover:text-indigo-100">
                    {user?.institutionName || 'St. Jude International Academy'}
                  </div>
                </div>
              </button>
            </div>

            {/* Backstage Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>SchoolGrid Ribbon Pro v2.6</span>
              <button
                type="button"
                onClick={() => setFileMenuOpen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs cursor-pointer"
              >
                Close Menu
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={() => setFileMenuOpen(false)} />
        </div>
      )}
    </div>
  );
};
