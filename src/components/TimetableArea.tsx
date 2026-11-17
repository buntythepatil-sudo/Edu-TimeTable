import React, { useState } from 'react';
import { ClassEntry, Teacher, ScheduleEntry, TimetableGrid, TimetableConflict } from '../types';
import {
  DAYS,
  CC_CLASSES,
  DOT_COLORS,
  getTeacherName,
  getBreakInfo,
  getMDPeriods,
  getConflictSet,
  isMDSubject,
} from '../utils/timetableGenerator';
import {
  FileText,
  Info,
  AlertTriangle,
  Download,
  Brush,
  BarChart2,
  Calendar,
  Grid,
  Printer,
  Eye,
  Plus,
  Sparkles,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
  Check,
} from 'lucide-react';

interface TimetableAreaProps {
  classes: ClassEntry[];
  teachers: Teacher[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  conflicts: TimetableConflict[];
  activeClass: string;
  onSelectClass: (name: string) => void;
  onCellAssign: (clsName: string, day: number, period: number, subjectIndex: number | null) => void;
  onOpenSubjectSummary: (clsName: string) => void;
  onOpenClassInfo: (clsName: string) => void;
  onOpenConflicts: () => void;
  onRemoveClashesForClass: (clsName: string) => void;
  onExportClassPDF: (clsName: string) => void;
  onOpenPrintPreview?: (clsName?: string) => void;
  onOpenAddSubjectModal?: (targetClass?: string) => void;
  onResolveTeacherClash?: (teacherId: string) => void;
  onResolveSubjectClashes?: (className: string, subjectIndex: number) => void;
  institutionName?: string;
  academicYear?: string;
}

export const TimetableArea: React.FC<TimetableAreaProps> = ({
  classes,
  teachers,
  schedule,
  tt,
  conflicts,
  activeClass,
  onSelectClass,
  onCellAssign,
  onOpenSubjectSummary,
  onOpenClassInfo,
  onOpenConflicts,
  onRemoveClashesForClass,
  onExportClassPDF,
  onOpenPrintPreview,
  onOpenAddSubjectModal,
  onResolveTeacherClash,
  onResolveSubjectClashes,
  institutionName,
  academicYear,
}) => {
  const [dropdownSlot, setDropdownSlot] = useState<{
    clsName: string;
    day: number;
    period: number;
    x: number;
    y: number;
  } | null>(null);

  // Mobile view mode: 'grid' or 'day'
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'day'>('grid');
  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(0);

  const validClasses = classes.filter((c) => c.name.trim());
  const currentClass = validClasses.find((c) => c.name === activeClass) || validClasses[0];

  if (!currentClass) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none bg-slate-50 min-h-[300px]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-3 shadow-xs">
          <Grid className="w-8 h-8 opacity-80" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Classes Registered</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Add classes and curriculum in the <strong>Classes</strong> tab to view timetable schedules.
        </p>
      </div>
    );
  }

  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const { afterPeriod: bafter } = getBreakInfo(schedule);
  const periodBeforeRecess = bafter > 0 ? bafter - 1 : -1;
  const periodAfterRecess = bafter > 0 ? bafter : -1;
  const mdPeriodsList = getMDPeriods(schedule);
  const conflictSet = getConflictSet(conflicts);

  const clsConflictsCount = Array.from(conflictSet).filter((k) => k.startsWith(`${currentClass.name}|`)).length;

  const handleCellClick = (e: React.MouseEvent, day: number, period: number) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 270);
    const y = Math.min(rect.bottom + 4, window.innerHeight - 300);
    setDropdownSlot({ clsName: currentClass.name, day, period, x, y });
  };

  // Find faculty busy in other classes at the clicked slot
  const getBusyTeachersAtSlot = (day: number, period: number) => {
    const busy = new Set<string>();
    validClasses.forEach((other) => {
      if (other.name === currentClass.name) return;
      const si = tt[other.name]?.[day]?.[period];
      if (si === undefined || si === null) return;
      const subj = other.subjects[si];
      if (subj && subj.teacherId) busy.add(subj.teacherId);
    });
    return busy;
  };

  return (
    <div
      className="timetable-area-container flex-1 flex flex-col overflow-hidden bg-slate-50"
      onClick={() => setDropdownSlot(null)}
    >
      {/* Class Tabs Strip (Hidden in Print) */}
      <div className="flex bg-white border-b border-slate-200 px-3 sm:px-6 gap-1.5 overflow-x-auto shrink-0 select-none scrollbar-none print:hidden items-center">
        <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
          Class:
        </span>
        {validClasses.map((cls) => {
          const isActive = cls.name === currentClass.name;
          const clsClashes = Array.from(conflictSet).filter((k) => k.startsWith(`${cls.name}|`)).length;

          return (
            <button
              key={cls.name}
              onClick={() => onSelectClass(cls.name)}
              className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{cls.name}</span>
              {clsClashes > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 font-bold text-[0.6rem] flex items-center justify-center">
                  {clsClashes}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Sheet */}
      <div className="timetable-sheet flex-1 overflow-auto p-2.5 sm:p-5 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5 sm:gap-3">
          
          {/* PRINT-ONLY HEADER BANNER FOR A4 PAPER */}
          <div className="print-banner hidden print:block">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                  {institutionName || 'St. Jude International Academy'}
                </h1>
                <p className="text-[9pt] text-slate-700 font-bold mt-0.5">
                  Academic Class Timetable — Class <span className="font-extrabold text-slate-950 underline">{currentClass.name}</span>
                </p>
              </div>
              <div className="text-right text-[8pt] text-slate-600 font-medium leading-tight">
                <div>Academic Year: <span className="font-bold text-slate-800">{academicYear || '2026–2027'}</span></div>
                <div>Generated &amp; Printed: <span className="font-mono text-slate-700">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
              </div>
            </div>
          </div>

          {/* Interactive Screen Sheet Header (Hidden on Print) */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white p-2.5 sm:p-3.5 sm:px-4 rounded-xl border border-slate-200 shadow-2xs print:hidden">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>Class</span>
                <span className="text-indigo-600">{currentClass.name}</span>
              </h2>

              {clsConflictsCount === 0 ? (
                <span className="text-[0.7rem] sm:text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Clash Free</span>
                </span>
              ) : (
                <span className="text-[0.7rem] sm:text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>{clsConflictsCount} clash{clsConflictsCount > 1 ? 'es' : ''}</span>
                </span>
              )}
            </div>

            {/* Mobile View Switcher (Grid vs Day View) */}
            <div className="flex items-center gap-1.5 sm:hidden bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMobileViewMode('grid')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  mobileViewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('day')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  mobileViewMode === 'day'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Day View</span>
              </button>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {clsConflictsCount > 0 && (
                <button
                  type="button"
                  onClick={() => onRemoveClashesForClass(currentClass.name)}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Brush className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Remove Clashes</span>
                </button>
              )}

              {onOpenAddSubjectModal && (
                <button
                  type="button"
                  onClick={() => onOpenAddSubjectModal(currentClass.name)}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Add a new subject to this class curriculum"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Subject</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenSubjectSummary(currentClass.name)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Period</span> Summary
              </button>

              <button
                type="button"
                onClick={() => onOpenClassInfo(currentClass.name)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>Info</span>
              </button>

              {onOpenPrintPreview && (
                <button
                  type="button"
                  onClick={() => onOpenPrintPreview(currentClass.name)}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Open simulated A4 Print & PDF Preview"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Print Preview</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onExportClassPDF(currentClass.name)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Download Vector PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* MOBILE DAY VIEW (Agenda / Timeline Mode for phone screens) */}
          {mobileViewMode === 'day' ? (
            <div className="flex flex-col gap-3 sm:hidden print:hidden">
              {/* Day Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {DAYS.map((dayName, di) => {
                  const isSelected = selectedMobileDay === di;
                  const dayClashes = Array.from(conflictSet).filter((k) =>
                    k.startsWith(`${currentClass.name}|${di}|`)
                  ).length;

                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => setSelectedMobileDay(di)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex-1 min-w-[54px] flex flex-col items-center gap-0.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{dayName.slice(0, 3)}</span>
                      {dayClashes > 0 ? (
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                      ) : (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-transparent'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day Cards Timeline */}
              <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-extrabold text-sm text-slate-900">
                    {DAYS[selectedMobileDay]} — Schedule
                  </div>
                  <span className="text-[0.7rem] text-slate-500 font-medium">
                    {nperiods} Teaching Periods
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {Array.from({ length: nperiods }).map((_, p) => {
                    const isPreRecess = p === periodBeforeRecess;
                    const isPostRecess = p === periodAfterRecess;
                    const si = tt[currentClass.name]?.[selectedMobileDay]?.[p];
                    const subj = si !== undefined && si !== null ? currentClass.subjects[si] : null;
                    const isConflict = conflictSet.has(`${currentClass.name}|${selectedMobileDay}|${p}`);

                    // Double period detection
                    const prevSi = p > 0 ? tt[currentClass.name]?.[selectedMobileDay]?.[p - 1] : undefined;
                    const nextSi = p < nperiods - 1 ? tt[currentClass.name]?.[selectedMobileDay]?.[p + 1] : undefined;
                    const isDouble = (si !== undefined && si !== null && nextSi === si) || (si !== undefined && si !== null && prevSi === si);

                    const schedulePeriod = schedule.filter((e) => e.type === 'period')[p];
                    const timeRange = schedulePeriod ? `${schedulePeriod.startTime}–${schedulePeriod.endTime}` : '';

                    return (
                      <React.Fragment key={p}>
                        <div
                          onClick={(e) => handleCellClick(e, selectedMobileDay, p)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                            subj
                              ? `${CC_CLASSES[si % CC_CLASSES.length]} ${
                                  isConflict ? 'ring-2 ring-rose-500 shadow-xs' : 'border-slate-200'
                                }`
                              : 'bg-slate-50/70 border-dashed border-slate-200 hover:bg-indigo-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Period Badge */}
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex flex-col items-center justify-center shrink-0 shadow-2xs">
                              <span className="leading-none">P{p + 1}</span>
                              {timeRange && (
                                <span className="text-[0.55rem] text-slate-300 font-normal mt-0.5 leading-none">
                                  {schedulePeriod?.startTime}
                                </span>
                              )}
                            </div>

                            {/* Subject & Teacher details */}
                            {subj ? (
                              <div className="min-w-0">
                                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 truncate">
                                  <span className="truncate">{subj.subjectName}</span>
                                  {isDouble && (
                                    <span className="text-[0.6rem] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
                                      2×
                                    </span>
                                  )}
                                  {isConflict && (
                                    <span className="text-[0.65rem] text-rose-700 bg-rose-100 font-bold px-1.5 py-0.2 rounded-full">
                                      ⚠ Clash
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5 truncate">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    {isMDSubject(subj.subjectName) || !subj.teacherId
                                      ? 'No Faculty (MD)'
                                      : getTeacherName(teachers, subj.teacherId)}
                                  </span>
                                  {subj.teacherId && (
                                    <span className="font-mono text-[0.65rem] font-bold text-indigo-700 bg-white/90 border border-slate-200 px-1 rounded ml-1">
                                      {subj.teacherId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs font-semibold text-slate-400 italic">
                                + Tap to assign subject to Period {p + 1}
                              </div>
                            )}
                          </div>

                          <div className="text-xs font-bold text-indigo-600 shrink-0">
                            Edit ▾
                          </div>
                        </div>

                        {/* Recess interval banner */}
                        {isPreRecess && bafter > 0 && (
                          <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs font-bold text-amber-900 my-0.5">
                            <span className="flex items-center gap-1.5">
                              <span>☕</span>
                              <span>Recess / Lunch Break</span>
                            </span>
                            <span className="text-[0.7rem] text-amber-700 font-normal">Midday Interval</span>
                          </div>
                        )}

                        {/* Mass drill interval */}
                        {mdPeriodsList
                          .filter((md) => md.afterPeriod === p + 1 && md.days.includes(selectedMobileDay))
                          .map((md, mi) => (
                            <div
                              key={`mob-md-${mi}`}
                              className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs font-bold text-emerald-900 my-0.5"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>🏃</span>
                                <span>{md.entry.label || 'Mass Drill'}</span>
                              </span>
                              <span className="text-[0.7rem] text-emerald-700 font-normal">
                                {md.entry.startTime}–{md.entry.endTime}
                              </span>
                            </div>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* FULL TIMETABLE TABLE GRID (Desktop and Mobile Horizontal Scroll Mode) */
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto print:border-none print:shadow-none print:overflow-visible">
              <table className="timetable-table w-full border-collapse min-w-[580px] sm:min-w-[620px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                    <th className="period-time-col p-2 sm:p-2.5 w-[70px] sm:w-[80px] bg-slate-950 text-center">Period</th>
                    {DAYS.map((d) => (
                      <th key={d} className="p-2 sm:p-2.5 text-center border-l border-slate-800">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: nperiods }).map((_, p) => {
                    const isPreRecess = p === periodBeforeRecess;
                    const isPostRecess = p === periodAfterRecess;

                    const rowCells = DAYS.map((dayName, di) => {
                      const si = tt[currentClass.name]?.[di]?.[p];
                      const subj = si !== undefined && si !== null ? currentClass.subjects[si] : null;
                      const isConflict = conflictSet.has(`${currentClass.name}|${di}|${p}`);

                      // Double period detection
                      const prevSi = p > 0 ? tt[currentClass.name]?.[di]?.[p - 1] : undefined;
                      const nextSi = p < nperiods - 1 ? tt[currentClass.name]?.[di]?.[p + 1] : undefined;
                      const isDoubleTop = si !== undefined && si !== null && nextSi === si;
                      const isDoubleBottom = si !== undefined && si !== null && prevSi === si;

                      if (subj) {
                        const colorClass = CC_CLASSES[si % CC_CLASSES.length];
                        const tname = getTeacherName(teachers, subj.teacherId);

                        return (
                          <td key={di} className="p-1 border border-slate-200 align-top bg-white">
                            <div
                              onClick={(e) => handleCellClick(e, di, p)}
                              className={`slot-card min-h-[54px] sm:min-h-[58px] p-1.5 sm:p-2 rounded-lg flex flex-col justify-center cursor-pointer transition-all hover:brightness-95 active:scale-[0.98] relative ${colorClass} ${
                                isConflict
                                  ? 'ring-2 ring-rose-500 shadow-xs'
                                  : ''
                              } ${
                                isDoubleTop
                                  ? 'rounded-b-none border-b-2 border-dashed border-white/60'
                                  : isDoubleBottom
                                  ? 'rounded-t-none pt-1'
                                  : ''
                              }`}
                            >
                              <div className="text-[0.72rem] sm:text-xs font-bold text-slate-900 flex items-center justify-between gap-1 leading-tight">
                                <span className="truncate">{subj.subjectName}</span>
                                {isDoubleTop && (
                                  <span className="text-[0.55rem] sm:text-[0.6rem] bg-black/20 text-white px-1 py-0.2 rounded font-mono font-bold">
                                    2×
                                  </span>
                                )}
                                {isConflict && (
                                  <span className="text-rose-600 font-bold text-xs" title="Faculty clash!">
                                    ⚠
                                  </span>
                                )}
                              </div>

                              {!isDoubleBottom && (
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  <span className="text-[0.62rem] sm:text-[0.68rem] text-slate-600 font-medium truncate">
                                    {isMDSubject(subj.subjectName) || !subj.teacherId ? 'No Faculty (MD)' : tname}
                                  </span>
                                  {subj.teacherId ? (
                                    <span className="font-mono text-[0.58rem] sm:text-[0.62rem] font-bold bg-white/80 text-indigo-700 border border-slate-200/50 px-1 py-0.2 rounded shrink-0">
                                      {subj.teacherId}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[0.58rem] sm:text-[0.62rem] font-bold bg-amber-100/90 text-amber-800 border border-amber-300/60 px-1 py-0.2 rounded shrink-0">
                                      MD
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={di} className="p-1 border border-slate-200 align-top bg-white">
                          <div
                            onClick={(e) => handleCellClick(e, di, p)}
                            className="min-h-[54px] sm:min-h-[58px] rounded-lg border border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 flex items-center justify-center text-slate-300 hover:text-indigo-600 cursor-pointer transition-all font-bold text-base print:border-none print:min-h-[40px]"
                          >
                            <span className="print:hidden">+</span>
                          </div>
                        </td>
                      );
                    });

                    return (
                      <React.Fragment key={p}>
                        <tr className="hover:bg-slate-50/50">
                          <td className="period-time-col p-1.5 sm:p-2 border border-slate-200 bg-slate-50 text-center font-mono text-[0.68rem] sm:text-[0.72rem] font-bold text-slate-600 border-r-2 border-r-slate-300">
                            <div className="font-extrabold text-indigo-600">P{p + 1}</div>
                            {isPreRecess && (
                              <span className="text-[0.55rem] font-sans text-amber-700 font-bold block mt-0.5 print:hidden">
                                ⏰ recess
                              </span>
                            )}
                            {isPostRecess && (
                              <span className="text-[0.55rem] font-sans text-emerald-700 font-bold block mt-0.5 print:hidden">
                                🌿 resume
                              </span>
                            )}
                          </td>
                          {rowCells}
                        </tr>

                        {/* Recess break row */}
                        {isPreRecess && bafter > 0 && (
                          <tr>
                            <td colSpan={7} className="p-0 border-none">
                              <div className="recess-row bg-amber-50 border-t border-b border-dashed border-amber-300 py-1.5 px-3 sm:px-4 flex items-center justify-between text-xs font-bold text-amber-800">
                                <span>☕ RECESS / LUNCH BREAK</span>
                                <span className="text-[0.68rem] font-medium text-amber-700">Midday Interval</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Mass Drill (MD) row if configured after this period */}
                        {mdPeriodsList
                          .filter((md) => md.afterPeriod === p + 1)
                          .map((md, mi) => (
                            <tr key={`md-${mi}`}>
                              <td className="p-1.5 sm:p-2 border border-slate-200 bg-emerald-50 text-center font-mono text-[0.65rem] sm:text-[0.68rem] font-bold text-emerald-800 border-r-2 border-r-emerald-500">
                                🏃 MD<br />
                                <span className="text-[0.55rem]">{md.weeklyCount}×/wk</span>
                              </td>
                              {DAYS.map((_, di) => {
                                const runsToday = md.days.includes(di);
                                return (
                                  <td
                                    key={di}
                                    className={`p-1 border border-slate-200 text-center ${
                                      runsToday ? 'bg-emerald-50/80 border-y border-y-emerald-400' : 'bg-slate-50'
                                    }`}
                                  >
                                    {runsToday ? (
                                      <div className="massdrill-row text-[0.7rem] sm:text-xs font-bold text-emerald-800 flex items-center justify-center gap-1 py-1.5 sm:py-2">
                                        <span>🏃 {md.entry.label || 'Mass Drill'}</span>
                                        <span className="text-[0.62rem] sm:text-[0.68rem] font-normal text-emerald-700 hidden sm:inline">
                                          ({md.entry.startTime}–{md.entry.endTime})
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 text-xs">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PRINT-ONLY FACULTY & SUBJECT KEY / FOOTER */}
          <div className="print-legend hidden print:block">
            <div className="text-[8pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-b border-slate-200 pb-0.5">
              Faculty &amp; Subject Reference Key — Class {currentClass.name}
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[7.5pt] text-slate-700">
              {currentClass.subjects.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block shrink-0 border border-slate-300"
                    style={{ backgroundColor: DOT_COLORS[idx % DOT_COLORS.length] }}
                  />
                  <span className="font-bold text-slate-900">{s.subjectName}:</span>
                  <span className="truncate">{getTeacherName(teachers, s.teacherId)}</span>
                  <span className="font-mono text-slate-500 font-semibold">({s.teacherId || '—'})</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Slot Assignment (Desktop popup or Mobile Bottom Sheet) */}
      {dropdownSlot && (() => {
        const isSlotClash = conflictSet.has(`${dropdownSlot.clsName}|${dropdownSlot.day}|${dropdownSlot.period}`);
        const currentSi = tt[dropdownSlot.clsName]?.[dropdownSlot.day]?.[dropdownSlot.period];
        const currentSubj = currentSi !== undefined && currentSi !== null ? currentClass.subjects[currentSi] : null;

        return (
          <>
            {/* Mobile Bottom Sheet Overlay */}
            <div
              className="sm:hidden fixed inset-0 z-[800] bg-slate-900/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150 print:hidden"
              onClick={() => setDropdownSlot(null)}
            >
              <div
                className="w-full max-h-[82vh] bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">
                      Assign Subject to Slot
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {dropdownSlot.clsName} • {DAYS[dropdownSlot.day]} Period {dropdownSlot.period + 1}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDropdownSlot(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Clash alert in slot */}
                {isSlotClash && currentSubj && (
                  <div className="p-3 mb-2 bg-rose-50 rounded-xl border border-rose-200 flex flex-col gap-2">
                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Faculty Clash Detected in this Slot</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {onResolveSubjectClashes && currentSi !== null && currentSi !== undefined && (
                        <button
                          type="button"
                          onClick={() => {
                            onResolveSubjectClashes(dropdownSlot.clsName, currentSi);
                            setDropdownSlot(null);
                          }}
                          className="flex-1 py-1.5 px-2 bg-amber-600 text-white rounded-lg text-xs font-bold text-center"
                        >
                          Resolve Subject
                        </button>
                      )}
                      {onResolveTeacherClash && currentSubj.teacherId && (
                        <button
                          type="button"
                          onClick={() => {
                            onResolveTeacherClash(currentSubj.teacherId);
                            setDropdownSlot(null);
                          }}
                          className="flex-1 py-1.5 px-2 bg-indigo-600 text-white rounded-lg text-xs font-bold text-center"
                        >
                          Resolve Faculty
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Subject List */}
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-1">
                  {currentClass.subjects.map((s, i) => {
                    const busySet = getBusyTeachersAtSlot(dropdownSlot.day, dropdownSlot.period);
                    const isBusy = s.teacherId && busySet.has(s.teacherId);
                    const tname = getTeacherName(teachers, s.teacherId);
                    const isSelected = currentSi === i;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          onCellAssign(dropdownSlot.clsName, dropdownSlot.day, dropdownSlot.period, i);
                          setDropdownSlot(null);
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-300 font-bold text-indigo-950'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-md shrink-0 border border-slate-300"
                          style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">
                            {s.subjectName}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                            <span>{tname}</span>
                            {isBusy && <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">⚠ Faculty busy elsewhere</span>}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom actions */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCellAssign(dropdownSlot.clsName, dropdownSlot.day, dropdownSlot.period, null);
                      setDropdownSlot(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
                  >
                    Clear Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropdownSlot(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Popover */}
            <div
              className="hidden sm:block fixed bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-[260px] p-2 text-slate-900 animate-in fade-in zoom-in-95 duration-100 print:hidden"
              style={{ left: dropdownSlot.x, top: dropdownSlot.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>Assign Slot</span>
                <span className="font-mono text-slate-500">
                  {DAYS[dropdownSlot.day]?.slice(0, 3)} P{dropdownSlot.period + 1}
                </span>
              </div>

              {isSlotClash && currentSubj && (
                <div className="p-2 mb-1.5 bg-rose-50 rounded-lg border border-rose-200 flex flex-col gap-1.5">
                  <span className="text-[0.68rem] font-bold text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Clash Detected in this Slot</span>
                  </span>
                  {onResolveSubjectClashes && currentSi !== null && currentSi !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        onResolveSubjectClashes(dropdownSlot.clsName, currentSi);
                        setDropdownSlot(null);
                      }}
                      className="w-full text-left px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[0.7rem] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Resolve for {currentSubj.subjectName}</span>
                    </button>
                  )}
                  {onResolveTeacherClash && currentSubj.teacherId && (
                    <button
                      type="button"
                      onClick={() => {
                        onResolveTeacherClash(currentSubj.teacherId);
                        setDropdownSlot(null);
                      }}
                      className="w-full text-left px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[0.7rem] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Resolve for {getTeacherName(teachers, currentSubj.teacherId)}</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                {currentClass.subjects.map((s, i) => {
                  const busySet = getBusyTeachersAtSlot(dropdownSlot.day, dropdownSlot.period);
                  const isBusy = s.teacherId && busySet.has(s.teacherId);
                  const tname = getTeacherName(teachers, s.teacherId);
                  const isSelected = currentSi === i;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        onCellAssign(dropdownSlot.clsName, dropdownSlot.day, dropdownSlot.period, i);
                        setDropdownSlot(null);
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors text-xs ${
                        isSelected ? 'bg-indigo-50/80 font-bold' : ''
                      } ${isBusy ? 'opacity-70' : ''}`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{s.subjectName}</div>
                        <div className="text-[0.65rem] text-slate-500 flex items-center gap-1 truncate">
                          <span>{tname}</span>
                          {isBusy && <span className="text-rose-600 font-bold">⚠ busy</span>}
                        </div>
                      </div>
                      {isSelected && <span className="text-[0.65rem] text-indigo-600 font-bold">✓</span>}
                    </div>
                  );
                })}
              </div>

              <div className="h-[1px] bg-slate-100 my-1" />

              {onOpenAddSubjectModal && (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownSlot(null);
                    onOpenAddSubjectModal(dropdownSlot.clsName);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add new subject to class...</span>
                </button>
              )}

              <button
                onClick={() => {
                  onCellAssign(dropdownSlot.clsName, dropdownSlot.day, dropdownSlot.period, null);
                  setDropdownSlot(null);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                ✕ Clear this slot
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
};
