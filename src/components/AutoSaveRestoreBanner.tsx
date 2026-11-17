import React from 'react';
import { RotateCcw, X, Sparkles, Clock, CheckCircle2, FileText, Database } from 'lucide-react';
import { AutoSaveSession } from '../types';

interface AutoSaveRestoreBannerProps {
  session: AutoSaveSession;
  onRestore: () => void;
  onDismiss: () => void;
}

export const AutoSaveRestoreBanner: React.FC<AutoSaveRestoreBannerProps> = ({
  session,
  onRestore,
  onDismiss,
}) => {
  const date = new Date(session.savedAt);
  const timeStr =
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' at ' +
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const classCount = session.summary?.classCount || session.state?.classes?.filter((c) => c.name?.trim()).length || 0;
  const teacherCount = session.summary?.teacherCount || session.state?.teachers?.length || 0;
  const hasGrid = session.summary?.hasGeneratedGrid || Boolean(session.state?.tt && Object.keys(session.state.tt).length > 0);

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-4 py-2.5 sm:px-6 shadow-md border-b border-indigo-500/30 flex items-center justify-between gap-3 text-xs z-20 animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center text-indigo-200 shrink-0 font-bold">
          <RotateCcw className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-extrabold text-white">Auto-saved session available</span>
          <span className="text-slate-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            {timeStr}
          </span>
          <span className="text-slate-400 hidden md:inline">•</span>
          <span className="text-indigo-200 font-medium hidden md:inline">
            {classCount} classes · {teacherCount} faculty · {hasGrid ? '✓ Complete Grid' : 'Draft'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRestore}
          className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all border border-indigo-400/40"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restore Session</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
