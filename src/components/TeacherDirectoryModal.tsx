import React, { useState, useMemo } from 'react';
import { Teacher, ClassEntry, ScheduleEntry, TimetableGrid, TimetableConflict } from '../types';
import { DAYS, getConflictSet } from '../utils/timetableGenerator';
import { exportTeacherSchedulePDF } from '../utils/pdfExport';
import {
  Users,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wand2,
  UserCheck,
  CalendarCheck,
  Trash2,
  FileSpreadsheet,
  Layers,
  BarChart3,
  Scale,
  Filter,
} from 'lucide-react';
import { TeacherDeleteConfirmModal, AssignedSubjectInfo } from './TeacherDeleteConfirmModal';
import { TeacherScheduleReportView } from './TeacherScheduleReportView';
import { TeacherWorkloadChart } from './TeacherWorkloadChart';

// Standard typical maximum full-time weekly teaching workload threshold
export const MAX_TYPICAL_WEEKLY_PERIODS = 26;

interface TeacherDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassEntry[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  conflicts: TimetableConflict[];
  institutionName?: string;
  initialTab?: 'directory' | 'chart' | 'report';
  initialTeacherId?: string;
  onResolveTeacherClash?: (teacherId: string) => void;
  onResolveAllFacultyClashes?: () => void;
  onViewTeacherFreePeriods?: (teacherId: string) => void;
  onGenerateAllTeachersFreePeriods?: () => void;
  onRemoveTeacherWithPeriods?: (teacherId: string) => void;
  onClearAllTeachers?: () => void;
}

export const TeacherDirectoryModal: React.FC<TeacherDirectoryModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  schedule,
  tt,
  conflicts,
  institutionName,
  initialTab,
  initialTeacherId,
  onResolveTeacherClash,
  onResolveAllFacultyClashes,
  onViewTeacherFreePeriods,
  onGenerateAllTeachersFreePeriods,
  onRemoveTeacherWithPeriods,
  onClearAllTeachers,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'chart' | 'report'>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState<'all' | 'overloaded' | 'clashing'>('all');
  const [selectedFreeTeacherId, setSelectedFreeTeacherId] = useState(teachers[0]?.id || '');
  const [selectedReportTeacherId, setSelectedReportTeacherId] = useState(teachers[0]?.id || '');

  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialTeacherId) {
        setSelectedReportTeacherId(initialTeacherId);
        setSelectedFreeTeacherId(initialTeacherId);
      }
    }
  }, [isOpen, initialTab, initialTeacherId]);

  // Delete modal state
  const [confirmDeleteTeacher, setConfirmDeleteTeacher] = useState<{
    teacher: Teacher;
    assignedSubjects: AssignedSubjectInfo[];
    totalPeriods: number;
  } | null>(null);

  React.useEffect(() => {
    if (!selectedFreeTeacherId && teachers.length > 0) {
      setSelectedFreeTeacherId(teachers[0].id);
    }
    if (!selectedReportTeacherId && teachers.length > 0) {
      setSelectedReportTeacherId(teachers[0].id);
    }
  }, [teachers, selectedFreeTeacherId, selectedReportTeacherId]);

  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const conflictSet = useMemo(() => getConflictSet(conflicts), [conflicts]);

  // Compute detailed workload & clash data per teacher
  const teacherWorkloadMap = useMemo(() => {
    const map: Record<
      string,
      {
        assignedPeriods: number;
        scheduledPeriods: number;
        effectivePeriods: number;
        isOverloaded: boolean;
        hasClash: boolean;
        assignments: Array<{ cls: string; subj: string; periods: number }>;
      }
    > = {};

    teachers.forEach((t) => {
      const assignments: Array<{ cls: string; subj: string; periods: number }> = [];
      let assignedSum = 0;
      let scheduledSum = 0;
      let hasClash = false;

      classes.forEach((cls) => {
        cls.subjects.forEach((s, si) => {
          if (s.teacherId !== t.id) return;
          const assignedP = s.periodsPerWeek || 0;
          assignedSum += assignedP;

          let countInGrid = 0;
          DAYS.forEach((_, di) => {
            for (let p = 0; p < nperiods; p++) {
              if (tt[cls.name]?.[di]?.[p] === si) {
                countInGrid++;
                if (conflictSet.has(`${cls.name}|${di}|${p}`)) {
                  hasClash = true;
                }
              }
            }
          });

          scheduledSum += countInGrid;
          assignments.push({
            cls: cls.name,
            subj: s.subjectName || 'Subject',
            periods: countInGrid > 0 ? countInGrid : assignedP,
          });
        });
      });

      if (!hasClash) {
        hasClash = conflicts.some(
          (c) => c.teacherId === t.id || c.entries.some((e) => e.teacherId === t.id)
        );
      }

      const effectivePeriods = scheduledSum > 0 ? scheduledSum : assignedSum;
      const isOverloaded = effectivePeriods > MAX_TYPICAL_WEEKLY_PERIODS;

      map[t.id] = {
        assignedPeriods: assignedSum,
        scheduledPeriods: scheduledSum,
        effectivePeriods,
        isOverloaded,
        hasClash,
        assignments,
      };
    });

    return map;
  }, [teachers, classes, tt, conflicts, nperiods, conflictSet]);

  if (!isOpen) return null;

  const totalClashingTeachers = teachers.filter(
    (t) => teacherWorkloadMap[t.id]?.hasClash
  ).length;

  const totalOverloadedTeachers = teachers.filter(
    (t) => teacherWorkloadMap[t.id]?.isOverloaded
  ).length;

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const wInfo = teacherWorkloadMap[t.id];
    if (workloadFilter === 'overloaded') return wInfo?.isOverloaded;
    if (workloadFilter === 'clashing') return wInfo?.hasClash;
    return true;
  });

  const initiateRemoveTeacher = (teacher: Teacher) => {
    const assignedSubjects: AssignedSubjectInfo[] = [];
    let totalPeriods = 0;

    classes.forEach((cls) => {
      cls.subjects.forEach((s) => {
        if (s.teacherId === teacher.id) {
          const pCount = s.periodsPerWeek || 0;
          assignedSubjects.push({
            className: cls.name,
            subjectName: s.subjectName || 'Unnamed Subject',
            periodsPerWeek: pCount,
            doublePeriods: s.doublePeriods,
          });
          totalPeriods += pCount;
        }
      });
    });

    if (assignedSubjects.length > 0) {
      setConfirmDeleteTeacher({
        teacher,
        assignedSubjects,
        totalPeriods,
      });
    } else {
      if (onRemoveTeacherWithPeriods) {
        onRemoveTeacherWithPeriods(teacher.id);
      }
    }
  };

  const handleConfirmDelete = (teacherId: string) => {
    if (onRemoveTeacherWithPeriods) {
      onRemoveTeacherWithPeriods(teacherId);
    }
    setConfirmDeleteTeacher(null);
  };

  const handleOpenTeacherReport = (teacherId: string) => {
    setSelectedReportTeacherId(teacherId);
    setActiveTab('report');
  };

  const selectedTeacher =
    teachers.find((t) => t.id === selectedReportTeacherId) || teachers[0];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[800] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[1040px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-indigo-200 font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Faculty Workload &amp; Assignment Directory</h3>
                {activeTab === 'report' && (
                  <span className="text-[0.68rem] bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Report View
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-slate-400">
                {totalClashingTeachers > 0
                  ? `⚠ ${totalClashingTeachers} faculty member${totalClashingTeachers > 1 ? 's have' : ' has'} scheduling clashes`
                  : '✓ All registered faculty schedules are clash-free'}
                {totalOverloadedTeachers > 0 && (
                  <span className="text-amber-300 font-bold ml-1.5 inline-flex items-center gap-1">
                    · <AlertTriangle className="w-3 h-3 text-amber-400 inline" /> {totalOverloadedTeachers} faculty overloaded (&gt;{MAX_TYPICAL_WEEKLY_PERIODS} p/wk)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Tabs in Header */}
            <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Directory Table
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'chart'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Interactive Workload Bar Chart & Imbalance Detection"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Workload Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'report'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>Schedule Report</span>
              </button>
            </div>

            {totalClashingTeachers > 0 && onResolveAllFacultyClashes && (
              <button
                type="button"
                onClick={onResolveAllFacultyClashes}
                className="h-8 px-3 rounded-lg bg-linear-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Resolve clashes for all faculty members"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Resolve All Clashes</span>
              </button>
            )}

            {onGenerateAllTeachersFreePeriods && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGenerateAllTeachersFreePeriods();
                }}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Open Free Periods Roster & Substitution Finder"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>All Free Periods</span>
              </button>
            )}

            {activeTab === 'directory' && (
              <button
                type="button"
                onClick={() =>
                  exportTeacherSchedulePDF(teachers, classes, schedule, tt, institutionName)
                }
                className="h-8 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export entire faculty master directory to PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Master PDF</span>
              </button>
            )}

            {onClearAllTeachers && teachers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onClearAllTeachers();
                }}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Clear or remove all faculty members"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Faculty</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content based on Active Tab */}
        {activeTab === 'chart' ? (
          <TeacherWorkloadChart
            teachers={teachers}
            classes={classes}
            schedule={schedule}
            tt={tt}
            conflicts={conflicts}
            onOpenReport={(tid) => handleOpenTeacherReport(tid)}
            onOpenFreePeriods={(tid) => {
              onClose();
              if (onViewTeacherFreePeriods) onViewTeacherFreePeriods(tid);
            }}
            onResolveClashes={onResolveTeacherClash}
          />
        ) : activeTab === 'report' ? (
          selectedTeacher ? (
            <TeacherScheduleReportView
              teacher={selectedTeacher}
              teachers={teachers}
              classes={classes}
              schedule={schedule}
              tt={tt}
              conflicts={conflicts}
              institutionName={institutionName}
              onSelectTeacher={(tid) => setSelectedReportTeacherId(tid)}
              onBackToDirectory={() => setActiveTab('directory')}
              onOpenFreePeriodsModal={(tid) => {
                if (onViewTeacherFreePeriods) {
                  onClose();
                  onViewTeacherFreePeriods(tid);
                }
              }}
              onResolveClashes={onResolveTeacherClash}
            />
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm">
              No faculty registered in the timetable system yet.
            </div>
          )
        ) : (
          <>
            {/* Quick Teacher Free Period & Workload Analysis Banner */}
            <div className="bg-slate-100/90 border-b border-slate-200 p-2.5 sm:px-6 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Select Faculty:</span>
                <select
                  value={selectedFreeTeacherId}
                  onChange={(e) => {
                    setSelectedFreeTeacherId(e.target.value);
                    setSelectedReportTeacherId(e.target.value);
                  }}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-900 outline-none focus:border-indigo-600 max-w-[260px]"
                >
                  {teachers.map((t) => {
                    const w = teacherWorkloadMap[t.id];
                    const ovText = w?.isOverloaded ? ` ⚠ [Overload: ${w.effectivePeriods}p]` : '';
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.id}){ovText}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => handleOpenTeacherReport(selectedFreeTeacherId)}
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Generate comprehensive Teacher Schedule Report"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Schedule Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onViewTeacherFreePeriods && selectedFreeTeacherId) {
                      onClose();
                      onViewTeacherFreePeriods(selectedFreeTeacherId);
                    }
                  }}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  title="View free periods roster for substitution"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Free Slots</span>
                </button>
              </div>

              {/* Quick Jump to Workload Chart */}
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className="h-8 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="View interactive bar chart of faculty weekly workload"
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Open Workload Chart</span>
              </button>
            </div>

            {/* Search and Workload Filter Bar */}
            <div className="p-3 sm:px-6 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search faculty by name, ID, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>

              {/* Workload Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('all')}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    workloadFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All ({teachers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setWorkloadFilter('overloaded')}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    workloadFilter === 'overloaded'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : totalOverloadedTeachers > 0
                      ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-white border border-slate-200 text-slate-400 opacity-60'
                  }`}
                  title={`Show faculty assigned more than ${MAX_TYPICAL_WEEKLY_PERIODS} weekly periods`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Overloaded ({totalOverloadedTeachers})</span>
                </button>

                {totalClashingTeachers > 0 && (
                  <button
                    type="button"
                    onClick={() => setWorkloadFilter('clashing')}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      workloadFilter === 'clashing'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    <span>Clashing ({totalClashingTeachers})</span>
                  </button>
                )}

                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap hidden sm:inline-block">
                  {filteredTeachers.length} Showing
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 text-slate-900">
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-2.5 text-left">Faculty ID</th>
                      <th className="p-2.5 text-left">Name &amp; Workload Status</th>
                      <th className="p-2.5 text-left">Class &amp; Subject Assignments</th>
                      <th className="p-2.5 text-center">Weekly Load</th>
                      <th className="p-2.5 text-center">Schedule Report</th>
                      <th className="p-2.5 text-center">Free Periods</th>
                      <th className="p-2.5 text-center">Clash Status</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                          {workloadFilter === 'overloaded'
                            ? '✓ No faculty members exceed the typical weekly workload threshold (>26 periods/week).'
                            : workloadFilter === 'clashing'
                            ? '✓ No faculty members have scheduling clashes.'
                            : `No faculty found matching "${searchTerm}"`}
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((t) => {
                        const wInfo = teacherWorkloadMap[t.id] || {
                          assignedPeriods: 0,
                          scheduledPeriods: 0,
                          effectivePeriods: 0,
                          isOverloaded: false,
                          hasClash: false,
                          assignments: [],
                        };
                        const { assignments, effectivePeriods, isOverloaded, hasClash } = wInfo;
                        const totalPossible = 6 * nperiods;
                        const freeCount = Math.max(0, totalPossible - effectivePeriods);

                        return (
                          <tr
                            key={t.id}
                            className={`border-b border-slate-200 transition-colors ${
                              hasClash
                                ? 'bg-rose-50/60'
                                : isOverloaded
                                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="p-2.5 font-mono font-bold text-indigo-600">
                              <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {t.id}
                              </span>
                            </td>

                            {/* Teacher Name + Overload Visual Warning Badge */}
                            <td className="p-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                                {isOverloaded && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.65rem] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs animate-in fade-in"
                                    title={`Workload Overload Warning: Assigned ${effectivePeriods} periods/week (exceeds typical maximum of ${MAX_TYPICAL_WEEKLY_PERIODS} periods/week by ${effectivePeriods - MAX_TYPICAL_WEEKLY_PERIODS} periods)`}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 animate-pulse" />
                                    <span>Overload ({effectivePeriods}p)</span>
                                  </span>
                                )}
                              </div>
                              {t.department && (
                                <span className="text-[0.68rem] text-slate-400 block mt-0.5">
                                  {t.department}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              {assignments.length === 0 ? (
                                <span className="text-slate-400">Not assigned</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {assignments.map((a, ai) => (
                                    <span
                                      key={ai}
                                      className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[0.7rem] text-slate-600"
                                    >
                                      <strong>{a.cls}</strong>: {a.subj}
                                      <span className="text-slate-400 font-mono">({a.periods}p)</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Periods per Week / Overload Column */}
                            <td className="p-2.5 text-center">
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span
                                  className={`font-mono font-bold text-sm ${
                                    isOverloaded ? 'text-rose-700 font-extrabold' : 'text-indigo-700'
                                  }`}
                                >
                                  {effectivePeriods}
                                </span>
                                {isOverloaded ? (
                                  <span
                                    className="text-[0.62rem] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded-full whitespace-nowrap flex items-center gap-0.5 shadow-2xs"
                                    title={`Exceeds typical max load of ${MAX_TYPICAL_WEEKLY_PERIODS} periods by +${effectivePeriods - MAX_TYPICAL_WEEKLY_PERIODS}p`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                    +{effectivePeriods - MAX_TYPICAL_WEEKLY_PERIODS}p Over
                                  </span>
                                ) : effectivePeriods > 20 ? (
                                  <span className="text-[0.6rem] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                    Full Load
                                  </span>
                                ) : effectivePeriods < 14 && effectivePeriods > 0 ? (
                                  <span className="text-[0.6rem] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                    Light Load
                                  </span>
                                ) : effectivePeriods === 0 ? (
                                  <span className="text-[0.6rem] font-medium text-slate-400">
                                    0 assigned
                                  </span>
                                ) : (
                                  <span className="text-[0.6rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                    Balanced
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenTeacherReport(t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-md font-bold text-[0.7rem] transition-all cursor-pointer shadow-2xs"
                                title={`Open detailed schedule & workload report for ${t.name}`}
                              >
                                <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
                                <span>Report</span>
                              </button>
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onViewTeacherFreePeriods) {
                                    onClose();
                                    onViewTeacherFreePeriods(t.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-md font-mono font-bold text-[0.7rem] transition-all cursor-pointer shadow-2xs"
                                title={`View free periods for ${t.name}`}
                              >
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>{freeCount} Free</span>
                              </button>
                            </td>

                            <td className="p-2.5 text-center">
                              {hasClash ? (
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <span className="text-[0.7rem] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                    ⚠ Clash
                                  </span>
                                  {onResolveTeacherClash && (
                                    <button
                                      type="button"
                                      onClick={() => onResolveTeacherClash(t.id)}
                                      className="h-6 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[0.68rem] rounded-md transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                      title={`Resolve all clashes for ${t.name}`}
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>Resolve</span>
                                    </button>
                                  )}
                                </div>
                              ) : assignments.length > 0 ? (
                                <span className="text-[0.7rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  ✓ Clear
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="p-2.5 text-center">
                              {onRemoveTeacherWithPeriods && (
                                <button
                                  type="button"
                                  onClick={() => initiateRemoveTeacher(t)}
                                  className="h-7 w-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                                  title={`Remove ${t.name} from registry`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Foot */}
            <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">{teachers.length} registered faculty</span>
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation modal if periods are assigned */}
      <TeacherDeleteConfirmModal
        isOpen={confirmDeleteTeacher !== null}
        onClose={() => setConfirmDeleteTeacher(null)}
        teacher={confirmDeleteTeacher?.teacher || null}
        assignedSubjects={confirmDeleteTeacher?.assignedSubjects || []}
        totalPeriods={confirmDeleteTeacher?.totalPeriods || 0}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

