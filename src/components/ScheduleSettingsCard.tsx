import React from 'react';
import { ScheduleEntry } from '../types';
import { Settings, Plus, Trash2, Coffee, Activity } from 'lucide-react';
import { DAYS } from '../utils/timetableGenerator';

interface ScheduleSettingsCardProps {
  nperiods: number;
  schedule: ScheduleEntry[];
  onNPeriodsChange: (val: number) => void;
  onScheduleChange: (newSchedule: ScheduleEntry[]) => void;
}

export const ScheduleSettingsCard: React.FC<ScheduleSettingsCardProps> = ({
  nperiods,
  schedule,
  onNPeriodsChange,
  onScheduleChange,
}) => {
  const handleEntryChange = (idx: number, field: keyof ScheduleEntry, val: any) => {
    const copy = JSON.parse(JSON.stringify(schedule));
    copy[idx][field] = val;
    onScheduleChange(copy);
  };

  const insertBreakAfter = (idx: number) => {
    const copy = [...schedule];
    copy.splice(idx + 1, 0, {
      type: 'break',
      label: 'Recess',
      duration: 20,
      startTime: '',
      endTime: '',
    });
    onScheduleChange(copy);
  };

  const insertMDAfter = (idx: number) => {
    const copy = [...schedule];
    copy.splice(idx + 1, 0, {
      type: 'md',
      label: 'MD Period',
      duration: 30,
      startTime: '',
      endTime: '',
      weeklyCount: 1,
      days: [2],
    });
    onScheduleChange(copy);
  };

  const removeEntry = (idx: number) => {
    const copy = [...schedule];
    copy.splice(idx, 1);
    onScheduleChange(copy);
  };

  let periodNum = 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="p-3 sm:px-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-[0.88rem] text-slate-900">Period &amp; Daily Schedule Structure</span>
            <span className="text-[0.68rem] text-slate-500 block">Configure daily periods and recess/MD intervals</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
            <span className="font-bold text-slate-700">Periods / Day:</span>
            <div className="flex items-center gap-1">
              {[6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onNPeriodsChange(num)}
                  className={`w-6 h-6 rounded text-xs font-bold transition-all cursor-pointer ${
                    nperiods === num
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={12}
              value={nperiods}
              onChange={(e) => onNPeriodsChange(Math.max(1, Math.min(12, parseInt(e.target.value) || 8)))}
              className="w-12 h-6 px-1 rounded border border-slate-200 bg-slate-50 text-center font-bold text-slate-900 outline-none focus:border-indigo-500 text-xs"
              title="Custom number of periods per day"
            />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-white">
        {/* Header grid */}
        <div className="hidden sm:grid grid-cols-[36px_180px_1fr] gap-3 px-2 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
          <span>#</span>
          <span>Period Label</span>
          <span>Intervals &amp; Actions</span>
        </div>

        {/* Schedule List */}
        <div className="flex flex-col gap-1.5">
          {schedule.map((e, i) => {
            if (e.type === 'period') {
              periodNum++;
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[36px_180px_1fr] gap-3 items-center bg-slate-50/60 p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-all text-xs"
                >
                  <span className="font-mono text-center font-bold text-indigo-600 bg-indigo-50/80 py-1 rounded border border-indigo-100 hidden sm:block">
                    P{periodNum}
                  </span>

                  <div className="flex items-center gap-2">
                    <input
                      value={e.label}
                      placeholder={`Period ${periodNum}`}
                      onChange={(ev) => handleEntryChange(i, 'label', ev.target.value)}
                      className="h-8 px-2.5 w-full rounded-md border border-slate-200 bg-white font-semibold text-slate-900 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertBreakAfter(i)}
                      className="px-2.5 py-1 rounded-md border border-dashed border-amber-400 bg-amber-50/70 text-amber-800 hover:bg-amber-100 text-[0.72rem] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Insert recess break interval after this period"
                    >
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      <span>+ Recess Break After</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMDAfter(i)}
                      className="px-2.5 py-1 rounded-md border border-dashed border-emerald-400 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 text-[0.72rem] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Insert mass drill / activity period after this period"
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+ MD Period After</span>
                    </button>
                  </div>
                </div>
              );
            } else if (e.type === 'md') {
              return (
                <div
                  key={i}
                  className="flex items-center flex-wrap gap-2.5 bg-emerald-50/80 border-2 border-dashed border-emerald-300 p-2.5 rounded-lg text-xs text-emerald-800"
                >
                  <span className="font-bold text-sm">🏃</span>
                  <input
                    value={e.label}
                    placeholder="MD Period"
                    onChange={(ev) => handleEntryChange(i, 'label', ev.target.value)}
                    className="w-28 h-7 px-2 rounded bg-white border border-emerald-300 font-bold text-xs text-emerald-800 outline-none"
                  />

                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="text-[0.72rem] font-bold">Frequency:</span>
                    <select
                      value={e.weeklyCount || 1}
                      onChange={(ev) => handleEntryChange(i, 'weeklyCount', parseInt(ev.target.value) || 1)}
                      className="h-7 px-2 rounded bg-white border border-emerald-300 font-bold text-xs text-emerald-800 outline-none"
                    >
                      <option value={1}>1× / week</option>
                      <option value={2}>2× / week</option>
                      <option value={3}>3× / week</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-800">
                    <span className="text-[0.72rem] font-bold">Days:</span>
                    {Array.from({ length: e.weeklyCount || 1 }).map((_, k) => (
                      <select
                        key={k}
                        value={(e.days || [2])[k] ?? 2}
                        onChange={(ev) => {
                          const copyDays = [...(e.days || [2])];
                          copyDays[k] = parseInt(ev.target.value);
                          handleEntryChange(i, 'days', copyDays);
                        }}
                        className="h-7 px-1.5 rounded bg-white border border-emerald-300 font-semibold text-xs text-emerald-800 outline-none"
                      >
                        {DAYS.map((d, di) => (
                          <option key={di} value={di}>
                            {d.slice(0, 3)}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>

                  <button
                    onClick={() => removeEntry(i)}
                    className="w-6 h-6 rounded hover:bg-white/80 text-rose-600 flex items-center justify-center font-bold text-base ml-auto transition-colors cursor-pointer"
                    title="Remove MD period"
                  >
                    ×
                  </button>
                </div>
              );
            } else {
              return (
                <div
                  key={i}
                  className="flex items-center flex-wrap gap-2.5 bg-amber-50/80 border-2 border-dashed border-amber-300 p-2.5 rounded-lg text-xs text-amber-800"
                >
                  <span className="text-sm">☕</span>
                  <input
                    value={e.label}
                    placeholder="Recess"
                    onChange={(ev) => handleEntryChange(i, 'label', ev.target.value)}
                    className="w-28 h-7 px-2 rounded bg-white border border-amber-300 font-bold text-xs text-amber-800 outline-none"
                  />
                  <span className="text-[0.72rem] font-semibold text-amber-800">
                    Midday break interval between periods
                  </span>

                  <button
                    onClick={() => removeEntry(i)}
                    className="w-6 h-6 rounded hover:bg-white/80 text-rose-600 flex items-center justify-center font-bold text-base ml-auto transition-colors cursor-pointer"
                    title="Remove break interval"
                  >
                    ×
                  </button>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};
