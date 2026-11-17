import React from 'react';
import { Brush, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ClashResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  results: Array<{ day: string; period: number; oldSubj: string; newSubj: string; cls?: string }>;
  isAllClear: boolean;
  remainingCount: number;
}

export const ClashResultModal: React.FC<ClashResultModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  results,
  isAllClear,
  remainingCount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[800] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[560px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brush className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-900">
          <p className="text-xs text-slate-500 mb-3">{subtitle}</p>

          {results.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-3 shadow-xs">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-2 text-left">Day</th>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-left">Previous Subject</th>
                    <th className="p-2 text-center"></th>
                    <th className="p-2 text-left">Resolved Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <td className="p-2 font-bold text-slate-900">{r.day}</td>
                      <td className="p-2 font-mono text-slate-500">P{r.period}</td>
                      <td className="p-2 line-through text-slate-400">{r.oldSubj}</td>
                      <td className="p-2 text-center text-slate-400">→</td>
                      <td className="p-2 font-bold text-emerald-600">{r.newSubj}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isAllClear ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>🎉 Excellent! Your timetable is now 100% clash-free!</span>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {remainingCount} clash{remainingCount > 1 ? 'es' : ''} remaining across other classes.
              </span>
            </div>
          )}
        </div>

        {/* Foot */}
        <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
