import React, { useMemo, useState } from 'react';
import { Ban, Check, Filter, Search, Sparkles } from 'lucide-react';

interface PeriodRestrictionsCardProps {
  allSubjectNames: string[];
  notFirstPeriod: string[];
  notLastPeriod: string[];
  onNotFirstChange: (subjects: string[]) => void;
  onNotLastChange: (subjects: string[]) => void;
}

export const PeriodRestrictionsCard: React.FC<PeriodRestrictionsCardProps> = ({
  allSubjectNames,
  notFirstPeriod,
  notLastPeriod,
  onNotFirstChange,
  onNotLastChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Strictly filter only subjects that the user has added to classes
  const validSubjects = useMemo(() => {
    return Array.from(new Set(allSubjectNames.filter((s) => Boolean(s && s.trim())))).sort();
  }, [allSubjectNames]);

  // Clean active restrictions to only valid existing subjects
  const cleanNotFirst = useMemo(
    () => notFirstPeriod.filter((s) => validSubjects.includes(s)),
    [notFirstPeriod, validSubjects]
  );
  const cleanNotLast = useMemo(
    () => notLastPeriod.filter((s) => validSubjects.includes(s)),
    [notLastPeriod, validSubjects]
  );

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return validSubjects;
    const q = searchTerm.toLowerCase();
    return validSubjects.filter((s) => s.toLowerCase().includes(q));
  }, [validSubjects, searchTerm]);

  const toggleFirst = (name: string) => {
    if (cleanNotFirst.includes(name)) {
      onNotFirstChange(cleanNotFirst.filter((s) => s !== name));
    } else {
      onNotFirstChange([...cleanNotFirst, name]);
    }
  };

  const toggleLast = (name: string) => {
    if (cleanNotLast.includes(name)) {
      onNotLastChange(cleanNotLast.filter((s) => s !== name));
    } else {
      onNotLastChange([...cleanNotLast, name]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Card Header */}
      <div className="p-3 sm:px-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-sm">
            <Ban className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-[0.88rem] text-slate-900">
              Period Restrictions (Selected Subjects Only)
            </span>
            <p className="text-[0.7rem] text-slate-500">
              Prevent specific selected subjects from being scheduled in the opening (Period 1) or closing periods
            </p>
          </div>
        </div>

        {validSubjects.length > 6 && (
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-7 pr-2.5 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-teal-500 w-36 sm:w-44"
            />
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Not First Period */}
        <div className="bg-teal-50/30 p-3.5 rounded-xl border border-teal-200/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.72rem] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-100/80 border border-teal-300 px-2.5 py-0.5 rounded-full">
              ⏭ Avoid First Period (Not P1)
            </span>
            <span className="text-[0.68rem] font-bold text-teal-800">
              {cleanNotFirst.length} restricted
            </span>
          </div>
          <p className="text-[0.68rem] text-slate-500">
            Subjects selected below will NOT be assigned to Period 1 on any school day.
          </p>

          <div className="flex flex-wrap gap-1.5 min-h-[42px] pt-1">
            {validSubjects.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 bg-white rounded-lg border border-slate-200 w-full text-center">
                No subjects entered yet. Add subjects to your classes first.
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 bg-white rounded-lg border border-slate-200 w-full text-center">
                No matching subjects found.
              </div>
            ) : (
              filteredSubjects.map((name) => {
                const checked = cleanNotFirst.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleFirst(name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      checked
                        ? 'bg-teal-600 text-white border-teal-600 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[0.65rem] border ${
                        checked
                          ? 'bg-white text-teal-700 border-white font-black'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Not Last Period */}
        <div className="bg-amber-50/30 p-3.5 rounded-xl border border-amber-200/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.72rem] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-full">
              ⏮ Avoid Last Period (Not P_Last)
            </span>
            <span className="text-[0.68rem] font-bold text-amber-800">
              {cleanNotLast.length} restricted
            </span>
          </div>
          <p className="text-[0.68rem] text-slate-500">
            Subjects selected below will NOT be assigned to the final period of the day.
          </p>

          <div className="flex flex-wrap gap-1.5 min-h-[42px] pt-1">
            {validSubjects.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 bg-white rounded-lg border border-slate-200 w-full text-center">
                No subjects entered yet. Add subjects to your classes first.
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 bg-white rounded-lg border border-slate-200 w-full text-center">
                No matching subjects found.
              </div>
            ) : (
              filteredSubjects.map((name) => {
                const checked = cleanNotLast.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleLast(name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      checked
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[0.65rem] border ${
                        checked
                          ? 'bg-white text-amber-700 border-white font-black'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
