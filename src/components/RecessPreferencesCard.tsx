import React from 'react';
import { RecessPreferences } from '../types';
import { Coffee, Plus, Trash2 } from 'lucide-react';

interface RecessPreferencesCardProps {
  allSubjectNames: string[];
  recessPrefs: RecessPreferences;
  onRecessPrefsChange: (newPrefs: RecessPreferences) => void;
  onToast: (msg: string) => void;
}

export const RecessPreferencesCard: React.FC<RecessPreferencesCardProps> = ({
  allSubjectNames,
  recessPrefs,
  onRecessPrefsChange,
  onToast,
}) => {
  const addPref = (side: 'before' | 'after') => {
    if (!allSubjectNames.length) {
      onToast('Please add subjects in your classes first.');
      return;
    }
    const currentList = recessPrefs[side];
    const available = allSubjectNames.find((s) => !currentList.includes(s)) || allSubjectNames[0];
    const updated = {
      ...recessPrefs,
      [side]: [...currentList, available],
    };
    onRecessPrefsChange(updated);
  };

  const updatePref = (side: 'before' | 'after', index: number, val: string) => {
    const copy = [...recessPrefs[side]];
    copy[index] = val;
    onRecessPrefsChange({ ...recessPrefs, [side]: copy });
  };

  const removePref = (side: 'before' | 'after', index: number) => {
    const copy = [...recessPrefs[side]];
    copy.splice(index, 1);
    onRecessPrefsChange({ ...recessPrefs, [side]: copy });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="p-3 sm:px-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-sm">
            <Coffee className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-[0.88rem] text-slate-900">Subject Recess Preferences</span>
        </div>
        <span className="text-xs text-slate-500 font-medium">Set subjects prioritized around recess</span>
      </div>

      <div className="p-3 sm:p-4 bg-white flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Before Recess Column */}
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-0.5 rounded-full">
                ⏰ Before Recess (High Focus)
              </span>
            </div>

            <div className="flex flex-col gap-1.5 min-h-[38px]">
              {recessPrefs.before.length === 0 ? (
                <div className="text-xs text-slate-400 p-2 text-center border border-dashed border-slate-200 bg-white rounded-lg">
                  No priority subjects set
                </div>
              ) : (
                recessPrefs.before.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white p-1.5 px-2 rounded-lg border border-slate-200 shadow-2xs">
                    <select
                      value={name}
                      onChange={(e) => updatePref('before', i, e.target.value)}
                      className="flex-1 bg-transparent font-semibold text-xs text-slate-800 outline-none"
                    >
                      {allSubjectNames.map((s, si) => (
                        <option key={si} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removePref('before', i)}
                      className="w-5 h-5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => addPref('before')}
              className="mt-1 h-7 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>Add Subject</span>
            </button>
          </div>

          {/* Central Break Badge */}
          <div className="hidden md:flex flex-col items-center justify-center gap-1 py-6 px-2">
            <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-3 text-center font-bold text-xs text-amber-800 shadow-2xs">
              ☕<br />RECESS<br />BREAK
            </div>
          </div>

          {/* After Recess Column */}
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                🌿 After Recess (Engaging/Labs)
              </span>
            </div>

            <div className="flex flex-col gap-1.5 min-h-[38px]">
              {recessPrefs.after.length === 0 ? (
                <div className="text-xs text-slate-400 p-2 text-center border border-dashed border-slate-200 bg-white rounded-lg">
                  No priority subjects set
                </div>
              ) : (
                recessPrefs.after.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white p-1.5 px-2 rounded-lg border border-slate-200 shadow-2xs">
                    <select
                      value={name}
                      onChange={(e) => updatePref('after', i, e.target.value)}
                      className="flex-1 bg-transparent font-semibold text-xs text-slate-800 outline-none"
                    >
                      {allSubjectNames.map((s, si) => (
                        <option key={si} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removePref('after', i)}
                      className="w-5 h-5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => addPref('after')}
              className="mt-1 h-7 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        <p className="text-[0.72rem] text-slate-500">
          💡 Selected subjects will be scheduled in periods directly preceding or succeeding the recess break.
        </p>
      </div>
    </div>
  );
};
