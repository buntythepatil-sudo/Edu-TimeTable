import React, { useMemo, useState } from 'react';
import { Teacher, ClassEntry, ScheduleEntry, TimetableGrid, TimetableConflict } from '../types';
import { DAYS, getTeacherFreeSchedule } from '../utils/timetableGenerator';
import { exportIndividualTeacherScheduleReportPDF } from '../utils/pdfExport';
import {
  FileSpreadsheet,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  School,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowLeft,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';

interface TeacherScheduleReportViewProps {
  teacher: Teacher;
  teachers: Teacher[];
  classes: ClassEntry[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  conflicts: TimetableConflict[];
  institutionName?: string;
  onSelectTeacher: (teacherId: string) => void;
  onBackToDirectory: () => void;
  onOpenFreePeriodsModal?: (teacherId: string) => void;
  onResolveClashes?: (teacherId: string) => void;
}

export const TeacherScheduleReportView: React.FC<TeacherScheduleReportViewProps> = ({
  teacher,
  teachers,
  classes,
  schedule,
  tt,
  conflicts,
  institutionName,
  onSelectTeacher,
  onBackToDirectory,
  onOpenFreePeriodsModal,
  onResolveClashes,
}) => {
  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const periodsList = schedule.filter((e) => e.type === 'period');
  const totalWeeklySlots = 6 * nperiods;

  // Teacher Free Schedule metrics
  const freeSchedule = useMemo(() => {
    return getTeacherFreeSchedule(teacher.id, teachers, classes, tt, nperiods);
  }, [teacher.id, teachers, classes, tt, nperiods]);

  // Specific Subject Classes breakdown
  const subjectClassBreakdown = useMemo(() => {
    const list: Array<{
      className: string;
      subjectName: string;
      periodsPerWeek: number;
      doublePeriods?: number;
      scheduledSlots: Array<{ dayIndex: number; dayName: string; periodIndex: number; timeStr: string }>;
    }> = [];

    classes.forEach((cls) => {
      cls.subjects.forEach((s, si) => {
        if (s.teacherId !== teacher.id) return;
        const slots: Array<{ dayIndex: number; dayName: string; periodIndex: number; timeStr: string }> = [];

        DAYS.forEach((dayName, di) => {
          for (let p = 0; p < nperiods; p++) {
            if (tt[cls.name]?.[di]?.[p] === si) {
              const pEntry = periodsList[p];
              const timeStr = pEntry ? `${pEntry.startTime} - ${pEntry.endTime}` : `P${p + 1}`;
              slots.push({ dayIndex: di, dayName, periodIndex: p, timeStr });
            }
          }
        });

        list.push({
          className: cls.name,
          subjectName: s.subjectName || 'General Subject',
          periodsPerWeek: s.periodsPerWeek || 0,
          doublePeriods: s.doublePeriods,
          scheduledSlots: slots,
        });
      });
    });

    return list;
  }, [teacher.id, classes, tt, nperiods, periodsList]);

  // Overall workload calculations
  const totalAssignedPeriods = subjectClassBreakdown.reduce((sum, item) => sum + item.periodsPerWeek, 0);
  const totalScheduledPeriods = freeSchedule.busyPeriodsCount;
  const freePeriodsCount = freeSchedule.freePeriodsCount;
  const freePercentage = freeSchedule.freePercentage;
  const workloadPercentage = totalWeeklySlots > 0 ? Math.round((totalScheduledPeriods / totalWeeklySlots) * 100) : 0;

  // Teaching hours calculation
  const totalTeachingMinutes = useMemo(() => {
    let mins = 0;
    DAYS.forEach((_, di) => {
      for (let p = 0; p < nperiods; p++) {
        for (const cls of classes) {
          const si = tt[cls.name]?.[di]?.[p];
          if (si !== undefined && si !== null && cls.subjects[si]?.teacherId === teacher.id) {
            const dur = periodsList[p]?.duration || 45;
            mins += dur;
            break;
          }
        }
      }
    });
    return mins;
  }, [classes, tt, teacher.id, nperiods, periodsList]);

  const teachingHours = Math.floor(totalTeachingMinutes / 60);
  const teachingRemainingMins = totalTeachingMinutes % 60;

  // Day by day distribution stats
  const dailyDistribution = useMemo(() => {
    return DAYS.map((dayName, di) => {
      const busySlots = freeSchedule.busySlotsByDay[di] || [];
      const freeSlots = freeSchedule.freePeriodsByDay[di] || [];
      return {
        dayIndex: di,
        dayName,
        busyCount: busySlots.length,
        freeCount: freeSlots.length,
        freePeriods: freeSlots,
        busySlots,
      };
    });
  }, [freeSchedule]);

  // Find peak day and light day
  const busyDaysSorted = [...dailyDistribution].sort((a, b) => b.busyCount - a.busyCount);
  const peakDay = busyDaysSorted[0];
  const lightestDay = busyDaysSorted[busyDaysSorted.length - 1];

  // Consecutive free period blocks detection (for prep / office hours)
  const continuousFreeBlocks = useMemo(() => {
    const blocks: Array<{ dayName: string; startP: number; endP: number; count: number }> = [];
    dailyDistribution.forEach((day) => {
      const sortedFree = [...day.freePeriods].sort((a, b) => a - b);
      if (sortedFree.length === 0) return;

      let start = sortedFree[0];
      let prev = sortedFree[0];
      let count = 1;

      for (let i = 1; i < sortedFree.length; i++) {
        const curr = sortedFree[i];
        if (curr === prev + 1) {
          count++;
          prev = curr;
        } else {
          if (count >= 2) {
            blocks.push({ dayName: day.dayName, startP: start + 1, endP: prev + 1, count });
          }
          start = curr;
          prev = curr;
          count = 1;
        }
      }
      if (count >= 2) {
        blocks.push({ dayName: day.dayName, startP: start + 1, endP: prev + 1, count });
      }
    });
    return blocks;
  }, [dailyDistribution]);

  // Conflicts check for this teacher
  const teacherClashes = conflicts.filter(
    (c) => c.teacherId === teacher.id || c.entries.some((e) => e.teacherId === teacher.id)
  );

  // Navigation between teachers
  const currentIndex = teachers.findIndex((t) => t.id === teacher.id);
  const handlePrevTeacher = () => {
    if (currentIndex > 0) {
      onSelectTeacher(teachers[currentIndex - 1].id);
    }
  };
  const handleNextTeacher = () => {
    if (currentIndex < teachers.length - 1) {
      onSelectTeacher(teachers[currentIndex + 1].id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportIndividualTeacherScheduleReportPDF(teacher, teachers, classes, schedule, tt, institutionName);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Action & Navigation Sub-Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Return to faculty directory table"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Directory</span>
          </button>

          {/* Teacher Selector */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevTeacher}
              disabled={currentIndex <= 0}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
              title="Previous Faculty"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={teacher.id}
              onChange={(e) => onSelectTeacher(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50 font-bold text-xs text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[200px] sm:max-w-[260px]"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextTeacher}
              disabled={currentIndex >= teachers.length - 1}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
              title="Next Faculty"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenFreePeriodsModal && (
            <button
              type="button"
              onClick={() => onOpenFreePeriodsModal(teacher.id)}
              className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Substitution Finder</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPDF}
            className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Export full PDF report for this teacher"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report PDF</span>
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-[1200px] w-full mx-auto">
        {/* Header Profile Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-mono font-black text-base flex items-center justify-center shadow-md shrink-0">
              {teacher.id.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">{teacher.name}</h2>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {teacher.id}
                </span>
                {teacher.department && (
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {teacher.department}
                  </span>
                )}
                {(totalScheduledPeriods > 26 || totalAssignedPeriods > 26) && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                    title={`Workload Overload Warning: Assigned ${totalScheduledPeriods || totalAssignedPeriods} periods/week (exceeds typical maximum of 26 periods/week)`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Overloaded ({totalScheduledPeriods || totalAssignedPeriods}p / wk)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Faculty Schedule &amp; Workload Assessment Report · {institutionName || 'SchoolGrid Timetable System'}
              </p>
            </div>
          </div>

          {/* Clash Alert or Clean Tag */}
          <div>
            {teacherClashes.length > 0 ? (
              <div className="flex items-center gap-2 p-2 px-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>⚠ {teacherClashes.length} Active Schedule Clash(es)</span>
                {onResolveClashes && (
                  <button
                    type="button"
                    onClick={() => onResolveClashes(teacher.id)}
                    className="ml-1 h-6 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[0.68rem] cursor-pointer"
                  >
                    Resolve
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>✓ Verified Clash-Free Schedule</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. KEY WORKLOAD METRICS (4 Metric Cards) */}
        <div>
          <div className="text-[0.7rem] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Weekly Workload &amp; Capacity Overview</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Assigned Periods */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[0.72rem] font-bold uppercase tracking-wider">Weekly Workload</span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                  {totalScheduledPeriods}
                </span>
                <span className="text-xs text-slate-400 font-semibold">/ {totalWeeklySlots} periods</span>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[0.68rem] text-slate-500 mb-1">
                  <span>Capacity Load</span>
                  <span className="font-bold text-indigo-600">{workloadPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, workloadPercentage)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Free Periods & Availability */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[0.72rem] font-bold uppercase tracking-wider">Free Availability</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  {freePeriodsCount}
                </span>
                <span className="text-xs text-slate-400 font-semibold">free periods</span>
              </div>
              <div className="mt-2 text-[0.72rem] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{freePercentage}% Open for Prep / Sub</span>
              </div>
            </div>

            {/* Card 3: Teaching Duration Hours */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[0.72rem] font-bold uppercase tracking-wider">Contact Hours</span>
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">
                  {teachingHours}
                </span>
                <span className="text-xs text-purple-600 font-bold">h</span>
                {teachingRemainingMins > 0 && (
                  <>
                    <span className="text-xl sm:text-2xl font-black text-purple-600 font-mono ml-1">
                      {teachingRemainingMins}
                    </span>
                    <span className="text-xs text-purple-600 font-bold">m</span>
                  </>
                )}
              </div>
              <div className="text-[0.68rem] text-slate-500 mt-2">
                Avg. {(totalScheduledPeriods / 6).toFixed(1)} periods per school day
              </div>
            </div>

            {/* Card 4: Class & Subject Count */}
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[0.72rem] font-bold uppercase tracking-wider">Assigned Classes</span>
                <School className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
                  {subjectClassBreakdown.length}
                </span>
                <span className="text-xs text-slate-400 font-semibold">class groups</span>
              </div>
              <div className="text-[0.68rem] text-slate-500 mt-2 truncate">
                Peak day: <strong className="text-slate-800">{peakDay?.dayName}</strong> ({peakDay?.busyCount}p)
              </div>
            </div>
          </div>
        </div>

        {/* 2. SPECIFIC SUBJECT CLASSES BREAKDOWN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Specific Subject Classes &amp; Teaching Allocations
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
              {subjectClassBreakdown.length} Active Assignment{subjectClassBreakdown.length !== 1 ? 's' : ''}
            </span>
          </div>

          {subjectClassBreakdown.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              This faculty member currently has no classes or subjects assigned in the curriculum.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {subjectClassBreakdown.map((item, idx) => {
                const uniqueDays = Array.from(new Set(item.scheduledSlots.map((s) => s.dayName)));
                const shareOfWorkload =
                  totalScheduledPeriods > 0
                    ? Math.round((item.scheduledSlots.length / totalScheduledPeriods) * 100)
                    : 0;

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all flex flex-col gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <School className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-sm text-slate-900 truncate">{item.className}</div>
                          <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>{item.subjectName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {item.periodsPerWeek} p/wk
                        </span>
                        <div className="text-[0.65rem] text-slate-400 font-semibold mt-0.5">
                          {shareOfWorkload}% of faculty load
                        </div>
                      </div>
                    </div>

                    {/* Active days & specific scheduled times */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 text-[0.7rem]">
                      <span className="font-bold text-slate-500">Scheduled Slots:</span>
                      {item.scheduledSlots.length === 0 ? (
                        <span className="text-amber-600 font-medium italic">Pending grid placement</span>
                      ) : (
                        item.scheduledSlots.map((slot, si) => (
                          <span
                            key={si}
                            className="bg-white border border-slate-200 text-slate-700 font-mono font-medium px-1.5 py-0.5 rounded text-[0.68rem]"
                            title={`${slot.dayName}: ${slot.timeStr}`}
                          >
                            {slot.dayName.slice(0, 3)} P{slot.periodIndex + 1}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. DISTRIBUTION OF FREE PERIODS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Distribution of Free Periods &amp; Availability Matrix
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {freePeriodsCount} of {totalWeeklySlots} Periods Free ({freePercentage}% Free)
            </span>
          </div>

          {/* Daily Distribution Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {dailyDistribution.map((d) => {
              const freeRatio = nperiods > 0 ? Math.round((d.freeCount / nperiods) * 100) : 100;
              const isHeavy = d.busyCount >= 5;

              return (
                <div
                  key={d.dayIndex}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isHeavy ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-black text-slate-800 mb-1">
                      <span>{d.dayName}</span>
                      <span
                        className={`text-[0.65rem] font-bold px-1.5 py-0.2 rounded ${
                          d.freeCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {d.freeCount} Free
                      </span>
                    </div>

                    <div className="text-[0.68rem] text-slate-500 font-semibold mb-2">
                      {d.busyCount} Teaching / {nperiods} Total
                    </div>
                  </div>

                  {/* Free period badges list */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="text-[0.62rem] uppercase font-bold text-slate-400 mb-1">Free Slots:</div>
                    <div className="flex flex-wrap gap-1">
                      {d.freePeriods.length === 0 ? (
                        <span className="text-[0.65rem] font-bold text-slate-400 italic">No free periods</span>
                      ) : (
                        d.freePeriods.map((p) => (
                          <span
                            key={p}
                            className="bg-white border border-emerald-200 text-emerald-800 font-mono font-bold text-[0.65rem] px-1 py-0.5 rounded shadow-2xs"
                          >
                            P{p + 1}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continuous Free Prep Blocks Insight */}
          {continuousFreeBlocks.length > 0 && (
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">Continuous Free Prep / Meeting Blocks:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {continuousFreeBlocks.map((blk, bi) => (
                    <span
                      key={bi}
                      className="bg-white border border-indigo-200 px-2 py-0.5 rounded-md text-[0.7rem] font-bold text-indigo-700 shadow-2xs"
                    >
                      {blk.dayName}: Periods P{blk.startP}–P{blk.endP} ({blk.count} consecutive free)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. INTERACTIVE WEEKLY SCHEDULE GRID FOR THIS TEACHER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Complete Weekly Timetable Matrix
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Free Period
              </span>
              <span className="flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                Teaching Lesson
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
            <table className="w-full text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[0.7rem] font-bold">
                  <th className="p-2.5 text-center w-24 border-r border-slate-800">Period</th>
                  {DAYS.map((day) => (
                    <th key={day} className="p-2.5 text-center border-r border-slate-800 last:border-r-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: nperiods }).map((_, p) => {
                  const pEntry = periodsList[p];
                  const timeLabel = pEntry ? `${pEntry.startTime} - ${pEntry.endTime}` : '';

                  return (
                    <tr key={p} className="border-b border-slate-200 hover:bg-slate-50/50">
                      {/* Period Column */}
                      <td className="p-2 text-center bg-slate-50 border-r border-slate-200">
                        <div className="font-mono font-extrabold text-indigo-600 text-xs">P{p + 1}</div>
                        {timeLabel && (
                          <div className="text-[0.62rem] text-slate-500 font-mono">{timeLabel}</div>
                        )}
                      </td>

                      {/* Day Columns */}
                      {DAYS.map((_, di) => {
                        let activeTeaching: { className: string; subjectName: string } | null = null;
                        for (const cls of classes) {
                          const si = tt[cls.name]?.[di]?.[p];
                          if (si !== undefined && si !== null && cls.subjects[si]?.teacherId === teacher.id) {
                            activeTeaching = {
                              className: cls.name,
                              subjectName: cls.subjects[si]?.subjectName || 'Subject',
                            };
                            break;
                          }
                        }

                        if (activeTeaching) {
                          return (
                            <td
                              key={di}
                              className="p-2 text-center border-r border-slate-200 last:border-r-0 bg-indigo-50/70"
                            >
                              <div className="font-black text-slate-900 text-xs">{activeTeaching.className}</div>
                              <div className="text-[0.7rem] font-bold text-indigo-700 truncate max-w-[130px] mx-auto">
                                {activeTeaching.subjectName}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={di}
                            className="p-2 text-center border-r border-slate-200 last:border-r-0 bg-emerald-50/30"
                          >
                            <span className="text-[0.68rem] font-bold text-emerald-700 bg-emerald-100/60 border border-emerald-200 px-1.5 py-0.5 rounded">
                              Free
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
