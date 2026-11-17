import React from 'react';
import { Teacher } from '../types';
import { AlertTriangle, Trash2, X, School, BookOpen, Clock, AlertCircle } from 'lucide-react';

export interface AssignedSubjectInfo {
  className: string;
  subjectName: string;
  periodsPerWeek: number;
  doublePeriods?: number;
}

interface TeacherDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  assignedSubjects: AssignedSubjectInfo[];
  totalPeriods: number;
  onConfirmDelete: (teacherId: string) => void;
}

export const TeacherDeleteConfirmModal: React.FC<TeacherDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  teacher,
  assignedSubjects,
  totalPeriods,
  onConfirmDelete,
}) => {
  if (!isOpen || !teacher) return null;

  const affectedClassNames = Array.from(new Set(assignedSubjects.map((s) => s.className)));

  const handleConfirm = () => {
    onConfirmDelete(teacher.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[850] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[540px] shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[90vh] text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-rose-600 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Remove Teacher &amp; Assigned Periods?
              </h3>
              <p className="text-[0.72rem] text-rose-100">
                This faculty member is actively assigned to classes and periods
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-rose-700/80 hover:bg-rose-800 text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50/50">
          {/* Teacher Summary Box */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Faculty Selected for Removal
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white bg-indigo-600 px-2 py-0.5 rounded">
                  {teacher.id}
                </span>
                <span className="font-extrabold text-sm text-slate-900">{teacher.name}</span>
                {teacher.department && (
                  <span className="text-xs text-slate-500 font-medium">({teacher.department})</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <Clock className="w-3.5 h-3.5" />
                <span>{totalPeriods} Periods / Week</span>
              </div>
            </div>
          </div>

          {/* Assigned Subjects Breakdown */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Currently Assigned Classes &amp; Subjects</span>
              <span className="text-slate-500 font-semibold">{affectedClassNames.length} class(es) affected</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {assignedSubjects.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[0.65rem] shrink-0 border border-emerald-200">
                      <School className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{item.className}</div>
                      <div className="text-[0.7rem] text-slate-500 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="font-medium text-slate-700">{item.subjectName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                      {item.periodsPerWeek} periods/wk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Impact Callout */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-[0.73rem] leading-relaxed">
              <span className="font-bold text-amber-950">Action Impact:</span>
              <span>
                If you proceed, all <strong>{totalPeriods} assigned periods and subject entries</strong> will be removed from your classes, their scheduled slots on the active timetable grid will be cleared, and <strong>{teacher.name}</strong> will be permanently deleted from the registry.
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:px-6 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
          >
            Cancel (Keep Teacher)
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="h-9 px-4 sm:px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Remove Periods &amp; Delete Teacher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
