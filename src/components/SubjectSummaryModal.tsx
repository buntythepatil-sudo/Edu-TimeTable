import React, { useState } from 'react';
import { ClassEntry, Teacher, TimetableGrid, TimetableConflict } from '../types';
import { DAYS, DOT_COLORS, getTeacherName, getConflictSet, isMDSubject } from '../utils/timetableGenerator';
import { BarChart2, CheckCircle2, AlertTriangle, Layers, Plus, Sparkles, Wand2, Trash2 } from 'lucide-react';

interface SubjectSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassEntry[];
  teachers: Teacher[];
  tt: TimetableGrid;
  initialClass: string;
  nperiods: number;
  conflicts?: TimetableConflict[];
  onOpenAddSubjectModal?: (targetClass: string) => void;
  onResolveSubjectClashes?: (className: string, subjectIndex: number) => void;
  onClearClassSubjects?: (className: string) => void;
  onClearAllSubjects?: () => void;
}

export const SubjectSummaryModal: React.FC<SubjectSummaryModalProps> = ({
  isOpen,
  onClose,
  classes,
  teachers,
  tt,
  initialClass,
  nperiods,
  conflicts = [],
  onOpenAddSubjectModal,
  onResolveSubjectClashes,
  onClearClassSubjects,
  onClearAllSubjects,
}) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || classes[0]?.name || '');

  if (!isOpen) return null;

  const validClasses = classes.filter((c) => c.name.trim());
  const cls = validClasses.find((c) => c.name === selectedClass) || validClasses[0];

  if (!cls) return null;

  const conflictSet = getConflictSet(conflicts);
  const subjs = cls.subjects;
  const ttData = tt[cls.name];

  const actual: Record<number, number> = {};
  const daySet: Record<number, Set<string>> = {};
  const doubleCnt: Record<number, number> = {};
  const clashingSubjIndices = new Set<number>();

  if (ttData) {
    DAYS.forEach((day, di) => {
      let prev: number | null = null;
      for (let p = 0; p < nperiods; p++) {
        const si = ttData[di]?.[p];
        if (si === undefined || si === null) {
          prev = null;
          continue;
        }
        actual[si] = (actual[si] || 0) + 1;
        if (!daySet[si]) daySet[si] = new Set();
        daySet[si].add(day.slice(0, 3));
        if (prev === si) doubleCnt[si] = (doubleCnt[si] || 0) + 1;
        prev = si;

        if (conflictSet.has(`${cls.name}|${di}|${p}`)) {
          clashingSubjIndices.add(si);
        }
      }
    });
  }

  // Also check subject overloads
  conflicts.forEach((c) => {
    if (c.clsName === cls.name && c.type === 'subject-overload') {
      const sIdx = cls.subjects.findIndex((s) => s.subjectName === c.subjName);
      if (sIdx >= 0) clashingSubjIndices.add(sIdx);
    }
  });

  const totalActual = Object.values(actual).reduce((a, b) => a + b, 0);
  const totalExpected = subjs.reduce((a, s) => a + (s.periodsPerWeek || 1), 0);
  const maxActual = Math.max(...subjs.map((_, i) => actual[i] || 0), 1);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[800] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[680px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Subject Period Breakdown &amp; Quotas</h3>
              <p className="text-[0.7rem] text-slate-400">
                Track scheduled periods vs. weekly curriculum targets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAddSubjectModal && (
              <button
                type="button"
                onClick={() => onOpenAddSubjectModal(cls.name)}
                className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            )}
            {onClearClassSubjects && subjs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onClearClassSubjects(cls.name);
                }}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title={`Clear all subjects for Class ${cls.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Class</span>
              </button>
            )}
            {onClearAllSubjects && classes.some((c) => c.subjects.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onClearAllSubjects();
                }}
                className="h-8 px-3 rounded-lg bg-rose-700/80 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Clear all subjects across all classes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
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

        {/* Class switcher strip */}
        <div className="flex gap-1.5 p-2 px-4 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0 select-none">
          {validClasses.map((c) => (
            <button
              key={c.name}
              onClick={() => setSelectedClass(c.name)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                c.name === cls.name
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-600'
              }`}
            >
              Class {c.name}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-slate-900">
          {/* Summary Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Subjects</div>
              <div className="text-lg font-extrabold text-indigo-600">{subjs.length}</div>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Scheduled</div>
              <div className="text-lg font-extrabold text-indigo-600">{totalActual}</div>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Target Load</div>
              <div className={`text-lg font-extrabold ${totalActual === totalExpected ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalExpected}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Slots / Week</div>
              <div className="text-lg font-extrabold text-slate-900">{nperiods * 6}</div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-2.5 text-left">Subject</th>
                  <th className="p-2.5 text-left">Faculty</th>
                  <th className="p-2.5 text-center">Scheduled</th>
                  <th className="p-2.5 text-center">Expected / Wk</th>
                  <th className="p-2.5 text-center">Doubles</th>
                  <th className="p-2.5 text-center">Status &amp; Action</th>
                </tr>
              </thead>
              <tbody>
                {subjs.map((s, si) => {
                  const got = actual[si] || 0;
                  const exp = s.periodsPerWeek || 1;
                  const dbl = doubleCnt[si] || 0;
                  const dot = DOT_COLORS[si % DOT_COLORS.length];
                  const diff = got - exp;
                  const hasClash = clashingSubjIndices.has(si);

                  return (
                    <tr
                      key={si}
                      className={`border-b border-slate-200 ${
                        hasClash ? 'bg-rose-50/50' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="p-2.5">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                          <span>{s.subjectName}</span>
                        </div>
                      </td>

                      <td className="p-2.5">
                        <span className="text-[0.72rem] text-slate-600 font-medium">
                          {isMDSubject(s.subjectName) || !s.teacherId ? (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              🏃 No Faculty (MD)
                            </span>
                          ) : (
                            getTeacherName(teachers, s.teacherId)
                          )}
                        </span>
                      </td>

                      <td className="p-2.5 text-center font-mono font-extrabold text-sm text-indigo-600">
                        {got}
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                        {exp} p/wk
                      </td>

                      <td className="p-2.5 text-center">
                        {dbl > 0 ? (
                          <span className="text-[0.7rem] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                            {dbl} pair{dbl > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {hasClash ? (
                            <span className="text-[0.7rem] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full">
                              ⚠ Clash
                            </span>
                          ) : diff === 0 ? (
                            <span className="text-[0.7rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ Matched
                            </span>
                          ) : diff > 0 ? (
                            <span className="text-[0.7rem] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              +{diff} extra
                            </span>
                          ) : (
                            <span className="text-[0.7rem] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                              {diff} short
                            </span>
                          )}

                          {hasClash && onResolveSubjectClashes && (
                            <button
                              type="button"
                              onClick={() => onResolveSubjectClashes(cls.name, si)}
                              className="h-6 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[0.68rem] rounded-md transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title={`Resolve clashes for ${s.subjectName}`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Resolve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual Distribution Bars */}
          <div>
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Period Quota Compliance Comparison
            </div>
            <div className="flex flex-col gap-2">
              {subjs.map((s, si) => {
                const got = actual[si] || 0;
                const exp = s.periodsPerWeek || 1;
                const dot = DOT_COLORS[si % DOT_COLORS.length];
                const pct = Math.round((got / maxActual) * 100);

                return (
                  <div key={si} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
                        {s.subjectName}
                      </span>
                      <span className="font-mono font-bold text-xs text-indigo-600">
                        {got} <span className="text-slate-400 font-normal">/ {exp} p/wk</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: dot }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Foot */}
        <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">Class {cls.name} • {subjs.length} Subjects</span>
          <div className="flex items-center gap-2">
            {onOpenAddSubjectModal && (
              <button
                type="button"
                onClick={() => onOpenAddSubjectModal(cls.name)}
                className="h-9 px-3.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
