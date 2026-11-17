import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { Teacher, ClassEntry, ScheduleEntry, TimetableGrid, TimetableConflict } from '../types';
import { DAYS, getConflictSet } from '../utils/timetableGenerator';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  FileSpreadsheet,
  UserCheck,
  Sparkles,
  ArrowUpDown,
  Filter,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface TeacherWorkloadChartProps {
  teachers: Teacher[];
  classes: ClassEntry[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  conflicts: TimetableConflict[];
  onOpenReport?: (teacherId: string) => void;
  onOpenFreePeriods?: (teacherId: string) => void;
  onResolveClashes?: (teacherId: string) => void;
}

export interface TeacherWorkloadData {
  id: string;
  name: string;
  specialization?: string;
  assignedPeriods: number; // calculated from class subject declarations
  scheduledPeriods: number; // calculated from actual cells in timetable grid
  dailyAverage: number;
  freePeriods: number;
  utilizationRate: number; // percentage of 48 total week slots
  hasClash: boolean;
  clashCount: number;
  assignments: Array<{ className: string; subjectName: string; periods: number }>;
  status: 'overloaded' | 'balanced' | 'light';
}

export const TeacherWorkloadChart: React.FC<TeacherWorkloadChartProps> = ({
  teachers,
  classes,
  schedule,
  tt,
  conflicts,
  onOpenReport,
  onOpenFreePeriods,
  onResolveClashes,
}) => {
  const [sortBy, setSortBy] = useState<'workload-desc' | 'workload-asc' | 'name' | 'id' | 'clashes'>('workload-desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overloaded' | 'balanced' | 'light' | 'clashes'>('all');
  const [targetMaxLoad, setTargetMaxLoad] = useState<number>(26);
  const [targetMinLoad, setTargetMinLoad] = useState<number>(16);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id || null);

  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const totalWeekPeriods = 6 * nperiods; // 48 periods standard
  const conflictSet = useMemo(() => getConflictSet(conflicts), [conflicts]);

  // Compute workload statistics for every teacher
  const workloadData: TeacherWorkloadData[] = useMemo(() => {
    return teachers.map((t) => {
      const assignments: Array<{ className: string; subjectName: string; periods: number }> = [];
      let assignedSum = 0;
      let scheduledSum = 0;
      let clashCount = 0;

      classes.forEach((cls) => {
        cls.subjects.forEach((s, si) => {
          if (s.teacherId === t.id) {
            assignedSum += s.periodsPerWeek || 0;

            let inGridCount = 0;
            DAYS.forEach((_, di) => {
              for (let p = 0; p < nperiods; p++) {
                if (tt[cls.name]?.[di]?.[p] === si) {
                  inGridCount++;
                  if (conflictSet.has(`${cls.name}|${di}|${p}`)) {
                    clashCount++;
                  }
                }
              }
            });

            scheduledSum += inGridCount;
            assignments.push({
              className: cls.name,
              subjectName: s.subjectName,
              periods: s.periodsPerWeek || 0,
            });
          }
        });
      });

      const hasClash =
        clashCount > 0 ||
        conflicts.some(
          (c) => c.teacherId === t.id || c.entries.some((e) => e.teacherId === t.id)
        );

      const effectivePeriods = scheduledSum > 0 ? scheduledSum : assignedSum;
      const dailyAverage = Number((effectivePeriods / 6).toFixed(1));
      const freePeriods = Math.max(0, totalWeekPeriods - effectivePeriods);
      const utilizationRate = Math.round((effectivePeriods / totalWeekPeriods) * 100);

      let status: 'overloaded' | 'balanced' | 'light' = 'balanced';
      if (effectivePeriods > targetMaxLoad) {
        status = 'overloaded';
      } else if (effectivePeriods < targetMinLoad) {
        status = 'light';
      }

      return {
        id: t.id,
        name: t.name,
        specialization: t.specialization,
        assignedPeriods: assignedSum,
        scheduledPeriods: effectivePeriods,
        dailyAverage,
        freePeriods,
        utilizationRate,
        hasClash,
        clashCount,
        assignments,
        status,
      };
    });
  }, [teachers, classes, tt, nperiods, conflictSet, conflicts, targetMaxLoad, targetMinLoad, totalWeekPeriods]);

  // Aggregate stats
  const totalAssigned = useMemo(
    () => workloadData.reduce((acc, d) => acc + d.scheduledPeriods, 0),
    [workloadData]
  );
  const averageLoad = useMemo(
    () => (workloadData.length > 0 ? Number((totalAssigned / workloadData.length).toFixed(1)) : 0),
    [totalAssigned, workloadData.length]
  );
  const maxLoad = useMemo(
    () => (workloadData.length > 0 ? Math.max(...workloadData.map((d) => d.scheduledPeriods)) : 0),
    [workloadData]
  );
  const minLoad = useMemo(
    () => (workloadData.length > 0 ? Math.min(...workloadData.map((d) => d.scheduledPeriods)) : 0),
    [workloadData]
  );
  const loadDisparity = maxLoad - minLoad;

  const overloadedCount = workloadData.filter((d) => d.status === 'overloaded').length;
  const balancedCount = workloadData.filter((d) => d.status === 'balanced').length;
  const lightCount = workloadData.filter((d) => d.status === 'light').length;
  const clashCountTotal = workloadData.filter((d) => d.hasClash).length;

  // Filter & Sort for Chart Display
  const displayedData = useMemo(() => {
    let list = [...workloadData];

    if (filterStatus === 'overloaded') {
      list = list.filter((d) => d.status === 'overloaded');
    } else if (filterStatus === 'balanced') {
      list = list.filter((d) => d.status === 'balanced');
    } else if (filterStatus === 'light') {
      list = list.filter((d) => d.status === 'light');
    } else if (filterStatus === 'clashes') {
      list = list.filter((d) => d.hasClash);
    }

    list.sort((a, b) => {
      if (sortBy === 'workload-desc') return b.scheduledPeriods - a.scheduledPeriods;
      if (sortBy === 'workload-asc') return a.scheduledPeriods - b.scheduledPeriods;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      if (sortBy === 'clashes') return (b.hasClash ? 1 : 0) - (a.hasClash ? 1 : 0);
      return 0;
    });

    return list;
  }, [workloadData, filterStatus, sortBy]);

  const selectedTeacherData = useMemo(
    () => workloadData.find((d) => d.id === selectedTeacherId) || workloadData[0] || null,
    [workloadData, selectedTeacherId]
  );

  const getBarColor = (data: TeacherWorkloadData) => {
    if (data.status === 'overloaded') return '#ef4444'; // Red-500
    if (data.status === 'light') return '#f59e0b'; // Amber-500
    return '#6366f1'; // Indigo-500 (Balanced)
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: TeacherWorkloadData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs max-w-[280px] pointer-events-none z-50">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <h4 className="font-extrabold text-sm text-white">{data.name}</h4>
              <span className="font-mono text-[0.68rem] text-indigo-300 font-semibold">{data.id}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[0.68rem] font-bold uppercase tracking-wider ${
                data.status === 'overloaded'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : data.status === 'light'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {data.status === 'overloaded'
                ? 'Overloaded'
                : data.status === 'light'
                ? 'Light Workload'
                : 'Optimal Load'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2 py-1.5 bg-slate-800/80 px-2.5 rounded-lg border border-slate-700/60">
            <div>
              <span className="text-[0.65rem] text-slate-400 block uppercase font-bold">Weekly Load</span>
              <span className="text-sm font-black text-indigo-300 font-mono">
                {data.scheduledPeriods}{' '}
                <span className="text-[0.7rem] font-normal text-slate-300">p/wk</span>
              </span>
            </div>
            <div>
              <span className="text-[0.65rem] text-slate-400 block uppercase font-bold">Daily Avg</span>
              <span className="text-sm font-black text-emerald-300 font-mono">
                {data.dailyAverage}{' '}
                <span className="text-[0.7rem] font-normal text-slate-300">p/day</span>
              </span>
            </div>
            <div>
              <span className="text-[0.65rem] text-slate-400 block uppercase font-bold">Free Slots</span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                {data.freePeriods} periods
              </span>
            </div>
            <div>
              <span className="text-[0.65rem] text-slate-400 block uppercase font-bold">Utilization</span>
              <span className="text-xs font-bold text-slate-200 font-mono">
                {data.utilizationRate}%
              </span>
            </div>
          </div>

          {/* Assignments list */}
          <div className="mt-1">
            <span className="text-[0.65rem] text-slate-400 font-bold uppercase block mb-1">
              Class & Subject Breakdown:
            </span>
            {data.assignments.length === 0 ? (
              <span className="text-slate-500 italic">No assigned subjects</span>
            ) : (
              <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                {data.assignments.map((a, i) => (
                  <span
                    key={i}
                    className="text-[0.65rem] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 font-medium"
                  >
                    <strong>{a.className}</strong>: {a.subjectName} ({a.periods}p)
                  </span>
                ))}
              </div>
            )}
          </div>

          {data.hasClash && (
            <div className="mt-2 pt-1.5 border-t border-rose-900/60 flex items-center gap-1 text-[0.68rem] text-rose-300 font-bold">
              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              <span>Scheduling clashes detected for this faculty</span>
            </div>
          )}

          <div className="mt-2 text-[0.65rem] text-indigo-400 text-center font-bold bg-indigo-950/60 py-1 rounded border border-indigo-800/40">
            Click bar to inspect faculty & schedule details
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto flex-1 text-slate-900 bg-slate-50/50">
      {/* 1. TOP KPI SUMMARY METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Average Weekly Load */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">Average Load</span>
            <Scale className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-slate-900 font-mono">{averageLoad}</span>
            <span className="text-[0.68rem] text-slate-500 font-medium ml-1">p / faculty</span>
          </div>
          <span className="text-[0.65rem] text-slate-400 mt-0.5">Across {workloadData.length} faculty members</span>
        </div>

        {/* Load Disparity / Spread (Imbalance Index) */}
        <div
          className={`p-3 rounded-xl border shadow-xs flex flex-col justify-between ${
            loadDisparity > 12
              ? 'bg-rose-50/70 border-rose-200'
              : loadDisparity > 8
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-600">
              Workload Spread
            </span>
            {loadDisparity > 10 ? (
              <TrendingUp className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="mt-1">
            <span
              className={`text-xl font-black font-mono ${
                loadDisparity > 12 ? 'text-rose-600' : loadDisparity > 8 ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              {loadDisparity}
            </span>
            <span className="text-[0.68rem] text-slate-600 font-medium ml-1">period gap</span>
          </div>
          <span className="text-[0.65rem] text-slate-500 mt-0.5">
            Max: <strong>{maxLoad}p</strong> · Min: <strong>{minLoad}p</strong>
          </span>
        </div>

        {/* Balanced Faculty */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">Balanced</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-600 font-mono">{balancedCount}</span>
            <span className="text-[0.68rem] text-slate-500 font-medium ml-1">faculty</span>
          </div>
          <span className="text-[0.65rem] text-slate-400 mt-0.5">
            {targetMinLoad} – {targetMaxLoad} p/wk range
          </span>
        </div>

        {/* Overloaded Faculty */}
        <div
          className={`p-3 rounded-xl border shadow-xs flex flex-col justify-between ${
            overloadedCount > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-rose-700">Overloaded</span>
            <AlertTriangle className={`w-4 h-4 ${overloadedCount > 0 ? 'text-rose-600' : 'text-slate-300'}`} />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-rose-600 font-mono">{overloadedCount}</span>
            <span className="text-[0.68rem] text-rose-700 font-medium ml-1">faculty</span>
          </div>
          <span className="text-[0.65rem] text-slate-500 mt-0.5">&gt; {targetMaxLoad} periods / week</span>
        </div>

        {/* Light Workload / Spare Capacity */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-amber-700">Available / Light</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-amber-600 font-mono">{lightCount}</span>
            <span className="text-[0.68rem] text-slate-500 font-medium ml-1">faculty</span>
          </div>
          <span className="text-[0.65rem] text-slate-400 mt-0.5">&lt; {targetMinLoad} periods / week</span>
        </div>

        {/* Total Registered Periods */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">Total Load</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-indigo-600 font-mono">{totalAssigned}</span>
            <span className="text-[0.68rem] text-slate-500 font-medium ml-1">periods</span>
          </div>
          <span className="text-[0.65rem] text-slate-400 mt-0.5">Assigned to institution</span>
        </div>
      </div>

      {/* 2. CHART CONTROLS & FILTER BAR */}
      <div className="bg-white p-3 sm:px-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        {/* Left: Filter by Workload Status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Faculty ({workloadData.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('overloaded')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterStatus === 'overloaded'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Overloaded ({overloadedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('balanced')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterStatus === 'balanced'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Balanced ({balancedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('light')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterStatus === 'light'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Light Load ({lightCount})
          </button>
          {clashCountTotal > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('clashes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'clashes'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              ⚠ Clashes ({clashCountTotal})
            </button>
          )}
        </div>

        {/* Right: Sort options & Target benchmark */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-800 outline-none focus:border-indigo-600"
            >
              <option value="workload-desc">Highest Load First ↓</option>
              <option value="workload-asc">Lowest Load First ↑</option>
              <option value="name">Alphabetical (Name)</option>
              <option value="id">Faculty ID</option>
              <option value="clashes">Clashes First</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-xs font-bold text-slate-600">Overload Benchmark:</span>
            <select
              value={targetMaxLoad}
              onChange={(e) => setTargetMaxLoad(Number(e.target.value))}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs text-indigo-700 outline-none focus:border-indigo-600"
            >
              <option value={22}>&gt; 22 periods / wk</option>
              <option value={24}>&gt; 24 periods / wk</option>
              <option value={26}>&gt; 26 periods / wk (Standard)</option>
              <option value={28}>&gt; 28 periods / wk</option>
              <option value={30}>&gt; 30 periods / wk</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. RECHARTS WORKLOAD BAR CHART */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Faculty Weekly Teaching Load Distribution</span>
            </h3>
            <p className="text-xs text-slate-500">
              Visualizes assigned weekly periods per faculty. Red bars highlight excessive workloads, indigo indicates optimal balance, and amber marks faculty with spare capacity.
            </p>
          </div>

          {/* Chart Legend Tags */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-md text-[0.7rem]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Overloaded (&gt;{targetMaxLoad}p)
            </span>
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[0.7rem]">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Balanced ({targetMinLoad}–{targetMaxLoad}p)
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded-md text-[0.7rem]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Light Load (&lt;{targetMinLoad}p)
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-600 font-bold px-2 py-0.5 rounded-md text-[0.7rem]">
              <span className="w-2 h-0.5 bg-purple-600" />
              Avg: {averageLoad}p
            </span>
          </div>
        </div>

        {/* Interactive Bar Chart Container */}
        <div className="w-full h-[320px] sm:h-[360px] mt-2 select-none">
          {displayedData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 mb-1" />
              <span>No faculty found matching the selected filter.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedData}
                margin={{ top: 20, right: 30, left: 0, bottom: 45 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const tid = e.activePayload[0].payload.id;
                    setSelectedTeacherId(tid);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={({ x, y, payload }) => {
                    const item = displayedData.find((d) => d.name === payload.value);
                    const isSelected = item?.id === selectedTeacherId;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={14}
                          textAnchor="end"
                          transform="rotate(-30)"
                          className={`text-[0.68rem] font-bold ${
                            isSelected ? 'fill-indigo-600 font-extrabold' : 'fill-slate-700'
                          }`}
                        >
                          {payload.value.length > 14 ? `${payload.value.slice(0, 12)}…` : payload.value}
                        </text>
                      </g>
                    );
                  }}
                  interval={0}
                  tickLine={false}
                  stroke="#cbd5e1"
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, Math.max(35, maxLoad + 5)]}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  label={{
                    value: 'Weekly Periods',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                {/* Reference Line for Faculty Average */}
                {averageLoad > 0 && (
                  <ReferenceLine
                    y={averageLoad}
                    stroke="#9333ea"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg: ${averageLoad}p`,
                      fill: '#9333ea',
                      fontSize: 10,
                      fontWeight: 800,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {/* Reference Line for Overload Threshold */}
                <ReferenceLine
                  y={targetMaxLoad}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Max Threshold: ${targetMaxLoad}p`,
                    fill: '#ef4444',
                    fontSize: 10,
                    fontWeight: 800,
                    position: 'insideTopRight',
                  }}
                />

                {/* Reference Line for Light Load Minimum */}
                <ReferenceLine
                  y={targetMinLoad}
                  stroke="#f59e0b"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />

                <Bar
                  dataKey="scheduledPeriods"
                  name="Weekly Periods"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                  cursor="pointer"
                >
                  {displayedData.map((entry) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={getBarColor(entry)}
                      stroke={entry.id === selectedTeacherId ? '#1e1b4b' : 'transparent'}
                      strokeWidth={entry.id === selectedTeacherId ? 2.5 : 0}
                      opacity={selectedTeacherId && entry.id !== selectedTeacherId ? 0.85 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. SELECTED FACULTY DETAIL & ACTION PANEL */}
      {selectedTeacherData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-white text-base shrink-0 shadow-xs ${
                selectedTeacherData.status === 'overloaded'
                  ? 'bg-rose-600'
                  : selectedTeacherData.status === 'light'
                  ? 'bg-amber-600'
                  : 'bg-indigo-600'
              }`}
            >
              {selectedTeacherData.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-base text-slate-900">{selectedTeacherData.name}</h4>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {selectedTeacherData.id}
                </span>
                <span
                  className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full border ${
                    selectedTeacherData.status === 'overloaded'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : selectedTeacherData.status === 'light'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {selectedTeacherData.status === 'overloaded'
                    ? '⚠ Overloaded Workload'
                    : selectedTeacherData.status === 'light'
                    ? '📉 Spare Teaching Capacity'
                    : '✓ Optimal Workload Balance'}
                </span>
                {selectedTeacherData.hasClash && (
                  <span className="text-[0.68rem] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                    ⚠ Clash Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedTeacherData.assignments.length} assigned subject{selectedTeacherData.assignments.length !== 1 ? 's' : ''} across classes ·{' '}
                <strong>{selectedTeacherData.scheduledPeriods} periods / week</strong> (~{selectedTeacherData.dailyAverage} p/day) ·{' '}
                <strong className="text-emerald-700">{selectedTeacherData.freePeriods} free slots</strong>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons for the selected teacher */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(selectedTeacherData.id)}
                className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title={`Open full schedule report for ${selectedTeacherData.name}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Schedule Report</span>
              </button>
            )}

            {onOpenFreePeriods && (
              <button
                type="button"
                onClick={() => onOpenFreePeriods(selectedTeacherData.id)}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title={`View ${selectedTeacherData.freePeriods} free periods for substitution`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Free Slots ({selectedTeacherData.freePeriods})</span>
              </button>
            )}

            {selectedTeacherData.hasClash && onResolveClashes && (
              <button
                type="button"
                onClick={() => onResolveClashes(selectedTeacherData.id)}
                className="h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title={`Resolve clashes for ${selectedTeacherData.name}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resolve Clash</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
