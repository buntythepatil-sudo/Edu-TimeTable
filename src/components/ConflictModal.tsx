import React, { useState } from 'react';
import { TimetableConflict, ClassEntry, Teacher, ScheduleEntry, TimetableGrid, SwapSuggestion } from '../types';
import { AlertTriangle, CheckCircle2, Sparkles, X, ArrowLeftRight, Check, ChevronDown, ChevronUp, Zap, HelpCircle } from 'lucide-react';
import { getTeacherName, findSwapSuggestionsForConflict, applySwapSuggestion, DAYS } from '../utils/timetableGenerator';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: TimetableConflict[];
  classes: ClassEntry[];
  teachers: Teacher[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  onResolveOne: (conflict: TimetableConflict) => void;
  onResolveAll: () => void;
  onApplySwap?: (swap: SwapSuggestion) => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  classes,
  teachers,
  schedule,
  tt,
  onResolveOne,
  onResolveAll,
  onApplySwap,
}) => {
  const [expandedConflictIdx, setExpandedConflictIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;

  const handleToggleSwap = (index: number) => {
    setExpandedConflictIdx(expandedConflictIdx === index ? null : index);
  };

  const handleExecuteSwap = (swap: SwapSuggestion) => {
    if (onApplySwap) {
      onApplySwap(swap);
    }
  };

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
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                Faculty Clash &amp; Workload Checker
              </h3>
              <p className="text-[0.7rem] text-slate-500">
                {conflicts.length === 0
                  ? 'All timetable constraints satisfied'
                  : `${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} detected — use smart swap proposals or auto-resolver`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <button
                onClick={onResolveAll}
                className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Automatically resolve all conflicts"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resolve All ({conflicts.length})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-base font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3.5">
          {conflicts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-emerald-600">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl mb-3 shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">Zero Conflicts Detected!</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Every teacher is assigned to at most one class per time slot and faculty workload constraints are satisfied.
              </p>
            </div>
          ) : (
            conflicts.map((c, i) => {
              const isExpanded = expandedConflictIdx === i;
              const suggestions = isExpanded
                ? findSwapSuggestionsForConflict(c, tt, classes, teachers, nperiods, schedule)
                : [];

              const typeIcon = c.type === 'slot-clash' ? '⚠' : c.type === 'teacher-overload' ? '📋' : '📚';
              const typePill =
                c.type === 'slot-clash'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : c.type === 'teacher-overload'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200';

              const typeTitle =
                c.type === 'slot-clash'
                  ? 'Concurrent Slot Clash'
                  : c.type === 'teacher-overload'
                  ? 'Daily Faculty Overload'
                  : 'Subject Overload';

              const detail =
                c.type === 'slot-clash'
                  ? `${c.dayName}, Period ${c.period + 1} (${c.slot})`
                  : c.type === 'teacher-overload'
                  ? `${c.dayName} — ${c.count} periods (max 7/day)`
                  : `${c.clsName}, ${c.dayName} — ${c.subjName} ×${c.count} (max 2/day)`;

              return (
                <div
                  key={i}
                  className={`border rounded-xl transition-all shadow-2xs overflow-hidden ${
                    isExpanded ? 'border-indigo-300 bg-indigo-50/20 ring-2 ring-indigo-500/10' : 'border-rose-200 bg-rose-50/40'
                  }`}
                >
                  <div className="p-3.5 flex flex-col gap-2.5">
                    {/* Header line */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{typeIcon}</span>
                        <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-md border ${typePill}`}>
                          {typeTitle}
                        </span>
                        <span className="font-mono text-[0.7rem] font-bold text-white bg-indigo-600 px-1.5 py-0.2 rounded">
                          {c.teacherId || 'TCH'}
                        </span>
                        <strong className="text-xs text-slate-900">{c.teacher}</strong>
                        <span className="text-xs text-rose-600 font-semibold">— {detail}</span>
                      </div>

                      {/* Action buttons: Suggest Swap & Quick Reassign */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSwap(i)}
                          className={`h-7 px-2.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                              : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-2xs'
                          }`}
                          title="Propose intelligent slot swaps that resolve this clash"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Suggest Swap</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onResolveOne(c)}
                          className="h-7 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          title="Quickly reassign to an available free subject"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Quick Fix</span>
                        </button>
                      </div>
                    </div>

                    {/* Conflicting Rows Summary */}
                    <div className="flex flex-col gap-1 pl-1 bg-white/70 p-2 rounded-lg border border-slate-200/80">
                      <div className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Involved Classes &amp; Slots:
                      </div>
                      {c.entries.map((e, ei) => (
                        <div key={ei} className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="bg-slate-900 text-white font-extrabold px-1.5 py-0.5 rounded text-[0.68rem]">
                            Class {e.cls}
                          </span>
                          <span className="font-semibold text-slate-900">{e.subjName}</span>
                          <span className="text-[0.7rem] text-slate-500">
                            (Faculty: {e.teacherName || getTeacherName(teachers, e.teacherId)})
                          </span>
                          {c.type !== 'slot-clash' && (
                            <span className="text-[0.7rem] text-slate-500 ml-auto font-mono">
                              P{(e.period || 0) + 1}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EXPANDED SMART SWAP SUGGESTIONS PANEL */}
                  {isExpanded && (
                    <div className="border-t border-indigo-200 bg-white p-3.5 sm:p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <Zap className="w-3 h-3" />
                          </div>
                          <h5 className="font-extrabold text-xs text-slate-900">
                            Smart Swap Proposals ({suggestions.length} candidate{suggestions.length === 1 ? '' : 's'})
                          </h5>
                        </div>
                        <span className="text-[0.68rem] text-slate-500 font-medium">
                          Evaluated against all classes &amp; faculty schedules
                        </span>
                      </div>

                      {suggestions.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center gap-1.5">
                          <p className="text-xs text-slate-600 font-medium">
                            No direct single-swap alternative was found for this class without introducing other clashes.
                          </p>
                          <button
                            type="button"
                            onClick={() => onResolveOne(c)}
                            className="mt-1 h-7 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Try Quick Reassignment</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {suggestions.slice(0, 4).map((swap, sIdx) => {
                            return (
                              <div
                                key={swap.id || sIdx}
                                className="border border-slate-200 rounded-xl p-3 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all flex flex-col gap-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs px-2 py-0.5 bg-slate-900 text-white rounded">
                                      Class {swap.clsName}
                                    </span>
                                    {swap.isZeroConflictResolved ? (
                                      <span className="text-[0.68rem] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5" />
                                        0 Conflicts Left!
                                      </span>
                                    ) : (
                                      <span className="text-[0.68rem] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full">
                                        Resolves Clash ({Math.abs(swap.conflictDelta)} reduced)
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleExecuteSwap(swap)}
                                    className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ml-auto"
                                    title="Apply this swap to the timetable"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Apply Swap</span>
                                  </button>
                                </div>

                                {/* Visual Swap Comparison */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {/* Slot A (Current clashing slot) */}
                                  <div className="bg-rose-50/70 border border-rose-200 p-2 rounded-lg flex flex-col">
                                    <div className="text-[0.65rem] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
                                      <span>Current Slot (Clashing)</span>
                                      <span className="font-mono">{swap.sourceDayName} P{swap.sourcePeriod + 1}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 mt-1">
                                      {swap.sourceSubjectName}
                                    </div>
                                    <div className="text-[0.7rem] text-slate-600 flex items-center gap-1">
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 rounded text-[0.65rem]">
                                        {swap.sourceTeacherId || 'TCH'}
                                      </span>
                                      <span className="truncate">{swap.sourceTeacherName}</span>
                                    </div>
                                  </div>

                                  {/* Slot B (Target swap slot) */}
                                  <div className="bg-emerald-50/70 border border-emerald-200 p-2 rounded-lg flex flex-col">
                                    <div className="text-[0.65rem] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                                      <span>Swap With (Target Slot)</span>
                                      <span className="font-mono">{swap.targetDayName} P{swap.targetPeriod + 1}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 mt-1">
                                      {swap.targetSubjectName}
                                    </div>
                                    <div className="text-[0.7rem] text-slate-600 flex items-center gap-1">
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 rounded text-[0.65rem]">
                                        {swap.targetTeacherId || 'TCH'}
                                      </span>
                                      <span className="truncate">{swap.targetTeacherName}</span>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[0.7rem] text-slate-600 leading-tight">
                                  {swap.explanation}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Foot */}
        <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

