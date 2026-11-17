import React, { useState, useMemo } from 'react';
import { Teacher, ClassEntry, TimetableGrid, ScheduleEntry } from '../types';
import {
  DAYS,
  getTeacherFreeSchedule,
  getAllTeachersFreeSchedules,
  getFreeTeachersAtSlot,
  TeacherFreeSchedule,
} from '../utils/timetableGenerator';
import {
  Users,
  UserCheck,
  Search,
  Calendar,
  Clock,
  Printer,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface TeacherFreePeriodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassEntry[];
  tt: TimetableGrid;
  nperiods: number;
  initialTeacherId?: string;
  initialMode?: 'single' | 'all';
  onToast?: (msg: string) => void;
}

export const TeacherFreePeriodsModal: React.FC<TeacherFreePeriodsModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  tt,
  nperiods,
  initialTeacherId,
  initialMode = 'single',
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'all'>(initialMode);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeacherId || teachers[0]?.id || ''
  );
  const [viewedTeacherId, setViewedTeacherId] = useState<string>(
    initialTeacherId || teachers[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [dayFilter, setDayFilter] = useState<number | 'all'>('all');

  // Substitute finder state
  const [subDay, setSubDay] = useState<number>(0);
  const [subPeriod, setSubPeriod] = useState<number>(0);

  // Sync if initialTeacherId or teachers list changes
  React.useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
      setViewedTeacherId(initialTeacherId);
    } else if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
      setViewedTeacherId(teachers[0].id);
    }
  }, [initialTeacherId, teachers, selectedTeacherId]);

  React.useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  // Compute free schedule for viewed teacher
  const currentSchedule: TeacherFreeSchedule = useMemo(() => {
    const tid = viewedTeacherId || teachers[0]?.id || '';
    return getTeacherFreeSchedule(tid, teachers, classes, tt, nperiods);
  }, [viewedTeacherId, teachers, classes, tt, nperiods]);

  // Compute free schedules for all teachers
  const allSchedules: TeacherFreeSchedule[] = useMemo(() => {
    return getAllTeachersFreeSchedules(teachers, classes, tt, nperiods);
  }, [teachers, classes, tt, nperiods]);

  // Filtered teachers for all list
  const filteredSchedules = useMemo(() => {
    return allSchedules.filter((s) => {
      const matchSearch =
        s.teacher.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.teacher.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (s.teacher.department && s.teacher.department.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchSearch;
    });
  }, [allSchedules, searchFilter]);

  // Free teachers at slot for proxy tool
  const freeTeachersAtSlot = useMemo(() => {
    return getFreeTeachersAtSlot(subDay, subPeriod, teachers, classes, tt);
  }, [subDay, subPeriod, teachers, classes, tt]);

  if (!isOpen) return null;

  const handleViewTeacher = () => {
    if (!selectedTeacherId) return;
    setViewedTeacherId(selectedTeacherId);
    setActiveTab('single');
    if (onToast) {
      const t = teachers.find((x) => x.id === selectedTeacherId);
      onToast(`Loaded free period breakdown for ${t?.name || selectedTeacherId}`);
    }
  };

  const handleCopyFreeList = () => {
    const lines: string[] = [];
    lines.push(`Free Periods for ${currentSchedule.teacher.name} (${currentSchedule.teacher.id}):`);
    lines.push(`Total Free Periods: ${currentSchedule.freePeriodsCount} / ${currentSchedule.totalPeriods} slots (${currentSchedule.freePercentage}% available)`);
    lines.push('');
    DAYS.forEach((d, di) => {
      const freeSlots = currentSchedule.freePeriodsByDay[di] || [];
      const formatted = freeSlots.length > 0 ? freeSlots.map((p) => `P${p + 1}`).join(', ') : 'None (Fully Busy)';
      lines.push(`${d}: ${formatted} (${freeSlots.length} free)`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onToast) onToast('✓ Copied free period list to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[850] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[960px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Faculty Free Periods &amp; Availability</span>
                <span className="text-[0.65rem] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </h3>
              <p className="text-[0.7rem] text-slate-400">
                Inspect free period slots by faculty member or generate complete institution-wide availability rosters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Print Free Periods Report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Selection Navigation Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 pt-2 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 text-xs font-extrabold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer border-t border-l border-r ${
                activeTab === 'single'
                  ? 'bg-white text-indigo-700 border-slate-200 shadow-2xs -mb-[1px]'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Individual Teacher Free Periods</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-extrabold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer border-t border-l border-r ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-700 border-slate-200 shadow-2xs -mb-[1px]'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>All Teachers Free Periods Report</span>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-mono text-[0.65rem] font-bold">
                {teachers.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: INDIVIDUAL TEACHER VIEW */}
        {activeTab === 'single' && teachers.length === 0 && (
          <div className="flex-1 p-10 flex flex-col items-center justify-center text-center text-slate-500 bg-slate-50/50">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <h4 className="font-extrabold text-sm text-slate-800">No Teachers Registered Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Register your faculty members in the Teacher Registry tab to inspect free periods and substitute availability.
            </p>
          </div>
        )}
        {activeTab === 'single' && teachers.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-slate-900 bg-slate-50/50">
            {/* Top Selector Control Card */}
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Select Faculty:</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id}) {t.department ? `· ${t.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewTeacher}
                  className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>View Free Periods</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Switch to full institution roster"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">All Teachers List</span>
                </button>
              </div>
            </div>

            {/* Teacher Details & Summary Metrics */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm font-mono shadow-2xs">
                    {currentSchedule.teacher.id}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">{currentSchedule.teacher.name}</h4>
                    <p className="text-xs text-slate-500">
                      {currentSchedule.teacher.department || 'Academic Faculty'}
                      {currentSchedule.teacher.specialization ? ` • ${currentSchedule.teacher.specialization}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFreeList}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Free List</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-800 block">
                      Free Periods
                    </span>
                    <span className="font-mono text-xl font-extrabold text-emerald-700">
                      {currentSchedule.freePeriodsCount}
                      <span className="text-xs text-emerald-600 font-normal"> / {currentSchedule.totalPeriods} slots</span>
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-indigo-800 block">
                      Teaching Periods
                    </span>
                    <span className="font-mono text-xl font-extrabold text-indigo-700">
                      {currentSchedule.busyPeriodsCount}
                      <span className="text-xs text-indigo-600 font-normal"> periods/wk</span>
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-100/90 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-600 block">
                      Availability Rate
                    </span>
                    <span className="font-mono text-xl font-extrabold text-slate-800">
                      {currentSchedule.freePercentage}%
                      <span className="text-xs text-slate-500 font-normal"> free time</span>
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                    %
                  </div>
                </div>
              </div>

              {/* Day-by-Day Free Period List */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Day-by-Day Free Period Schedule</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {DAYS.map((dayName, di) => {
                    const freeSlots = currentSchedule.freePeriodsByDay[di] || [];
                    const busySlots = currentSchedule.busySlotsByDay[di] || [];
                    const isAllFree = freeSlots.length === nperiods;
                    const isFullyBusy = freeSlots.length === 0;

                    return (
                      <div
                        key={dayName}
                        className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                          isAllFree
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isFullyBusy
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                            {dayName}
                          </span>
                          <span
                            className={`text-[0.68rem] font-bold font-mono px-2 py-0.5 rounded-full ${
                              freeSlots.length > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {freeSlots.length} Free / {nperiods}
                          </span>
                        </div>

                        {/* Badges for free periods */}
                        <div className="flex flex-wrap gap-1 items-center min-h-[30px]">
                          {freeSlots.length === 0 ? (
                            <span className="text-[0.7rem] text-rose-600 font-semibold italic">
                              No free periods (Full teaching load)
                            </span>
                          ) : (
                            freeSlots.map((p) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono font-bold text-xs flex items-center gap-1 shadow-2xs"
                                title={`Period ${p + 1} is free on ${dayName}`}
                              >
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>P{p + 1}</span>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Busy summary */}
                        {busySlots.length > 0 && (
                          <div className="text-[0.68rem] text-slate-500 border-t border-slate-100 pt-1.5 flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-600">Teaching Slots:</span>
                            <div className="flex flex-wrap gap-1">
                              {busySlots.map((b, bi) => (
                                <span
                                  key={bi}
                                  className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[0.65rem] font-medium"
                                >
                                  <strong>P{b.period + 1}:</strong> {b.className} ({b.subjectName})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full 6-Day Weekly Matrix Table for this teacher */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Interactive Weekly Timetable Grid (Free vs. Teaching)</span>
                </span>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
                  <table className="w-full text-xs border-collapse min-w-[620px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[0.7rem] uppercase tracking-wider">
                        <th className="p-2 w-[70px] bg-slate-950 text-center">Period</th>
                        {DAYS.map((d) => (
                          <th key={d} className="p-2 text-center border-l border-slate-800">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: nperiods }).map((_, p) => (
                        <tr key={p} className="border-b border-slate-200 hover:bg-slate-50/50">
                          <td className="p-2 text-center font-mono font-bold text-indigo-700 bg-slate-50 border-r border-slate-200">
                            P{p + 1}
                          </td>
                          {DAYS.map((_, di) => {
                            const isFree = currentSchedule.freePeriodsByDay[di]?.includes(p);
                            const busySlot = currentSchedule.busySlotsByDay[di]?.find((b) => b.period === p);

                            if (isFree) {
                              return (
                                <td
                                  key={di}
                                  className="p-1 border border-slate-200 bg-emerald-50/30 text-center align-middle"
                                >
                                  <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-lg p-1.5 font-bold text-[0.72rem] flex items-center justify-center gap-1 shadow-2xs">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>FREE</span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={di} className="p-1 border border-slate-200 align-middle">
                                <div className="bg-indigo-50/70 border border-indigo-200 text-indigo-950 rounded-lg p-1.5 flex flex-col justify-center text-left shadow-2xs">
                                  <span className="font-extrabold text-[0.75rem] text-indigo-900 truncate">
                                    {busySlot?.className}
                                  </span>
                                  <span className="text-[0.68rem] text-slate-600 font-medium truncate">
                                    {busySlot?.subjectName}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALL TEACHERS FREE ROSTER & PROXY FINDER */}
        {activeTab === 'all' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-slate-900 bg-slate-50/50">
            {/* Substitute / Proxy Finder Tool Card */}
            <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-indigo-800/50 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold text-sm text-white">Instant Proxy / Substitute Teacher Finder</span>
                </div>
                <span className="text-[0.7rem] text-indigo-200 bg-indigo-800/60 px-2.5 py-0.5 rounded-full border border-indigo-700/50 font-bold">
                  {freeTeachersAtSlot.length} Faculty Free at Selected Slot
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-bold">Select Day:</span>
                  <select
                    value={subDay}
                    onChange={(e) => setSubDay(parseInt(e.target.value))}
                    className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs outline-none focus:border-indigo-400"
                  >
                    {DAYS.map((d, di) => (
                      <option key={di} value={di}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-bold">Select Period:</span>
                  <select
                    value={subPeriod}
                    onChange={(e) => setSubPeriod(parseInt(e.target.value))}
                    className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs outline-none focus:border-indigo-400"
                  >
                    {Array.from({ length: nperiods }).map((_, p) => (
                      <option key={p} value={p}>
                        Period {p + 1} (P{p + 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Free faculty at this slot */}
              <div className="bg-black/30 rounded-lg p-2.5 border border-white/10 flex flex-wrap gap-1.5 items-center">
                {freeTeachersAtSlot.length === 0 ? (
                  <span className="text-xs text-rose-300 italic">
                    ⚠ All faculty members are currently booked in classes for {DAYS[subDay]} Period {subPeriod + 1}.
                  </span>
                ) : (
                  freeTeachersAtSlot.map((t) => (
                    <button
                      key={t.teacher.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(t.teacher.id);
                        setViewedTeacherId(t.teacher.id);
                        setActiveTab('single');
                      }}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Click to inspect this teacher's full schedule"
                    >
                      <span className="font-mono text-emerald-400">[{t.teacher.id}]</span>
                      <span>{t.teacher.name}</span>
                      {t.specialization && (
                        <span className="text-[0.65rem] text-slate-300 font-normal">({t.specialization})</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-slate-200 p-3 sm:px-4 rounded-xl shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter teachers by name, ID, or subject..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Highlight Day:</span>
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-900 outline-none focus:border-indigo-600"
                >
                  <option value="all">All Days (Mon–Sat)</option>
                  {DAYS.map((d, di) => (
                    <option key={di} value={di}>
                      {d} Only
                    </option>
                  ))}
                </select>

                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg whitespace-nowrap">
                  {filteredSchedules.length} of {teachers.length} Faculty
                </span>
              </div>
            </div>

            {/* Main Full Institution Free Period Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[0.68rem] font-bold uppercase tracking-wider">
                      <th className="p-2.5 text-left w-[85px]">ID</th>
                      <th className="p-2.5 text-left min-w-[140px]">Faculty Name</th>
                      <th className="p-2.5 text-center w-[90px]">Free Slots</th>
                      {DAYS.map((d, di) => {
                        if (dayFilter !== 'all' && dayFilter !== di) return null;
                        return (
                          <th key={d} className="p-2.5 text-left min-w-[100px] border-l border-slate-800">
                            {d}
                          </th>
                        );
                      })}
                      <th className="p-2.5 text-center w-[75px] border-l border-slate-800">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                          No faculty members match "{searchFilter}"
                        </td>
                      </tr>
                    ) : (
                      filteredSchedules.map((s) => {
                        return (
                          <tr key={s.teacher.id} className="border-b border-slate-200 hover:bg-slate-50/70 transition-colors">
                            <td className="p-2.5 font-mono font-bold text-indigo-600">
                              <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {s.teacher.id}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{s.teacher.name}</span>
                                {s.busyPeriodsCount > 26 && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[0.6rem] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                                    title={`Workload Overload Warning: Assigned ${s.busyPeriodsCount} periods/week (exceeds typical maximum of 26)`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                    <span>Overloaded ({s.busyPeriodsCount}p)</span>
                                  </span>
                                )}
                              </div>
                              {s.teacher.department && (
                                <span className="text-[0.65rem] text-slate-400 font-normal block mt-0.5">
                                  {s.teacher.department}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-extrabold px-2 py-0.5 rounded-full text-xs shadow-2xs">
                                {s.freePeriodsCount} / {s.totalPeriods}
                              </span>
                              <span className="block text-[0.62rem] text-slate-400 font-mono mt-0.5">
                                {s.freePercentage}% free
                              </span>
                            </td>

                            {DAYS.map((d, di) => {
                              if (dayFilter !== 'all' && dayFilter !== di) return null;
                              const freeList = s.freePeriodsByDay[di] || [];

                              return (
                                <td key={d} className="p-2 border-l border-slate-200 align-middle">
                                  {freeList.length === 0 ? (
                                    <span className="text-[0.68rem] text-rose-500 font-semibold italic">Full</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {freeList.map((p) => (
                                        <span
                                          key={p}
                                          className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono font-bold text-[0.68rem]"
                                        >
                                          P{p + 1}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 text-center border-l border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTeacherId(s.teacher.id);
                                  setViewedTeacherId(s.teacher.id);
                                  setActiveTab('single');
                                }}
                                className="h-7 px-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-[0.68rem] rounded-md transition-all border border-indigo-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                title="View individual schedule & breakdown"
                              >
                                <span>View</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Foot */}
        <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {teachers.length} Faculty Members registered · {nperiods} Periods/Day
          </span>
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
