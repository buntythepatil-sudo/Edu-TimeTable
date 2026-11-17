import React from 'react';
import { AlertTriangle, Trash2, X, Users, BookOpen, School, AlertCircle } from 'lucide-react';
import { Teacher, ClassEntry } from '../types';

export type ClearDataMode = 'teachers' | 'all-subjects' | 'class-subjects' | 'all-curriculum';

interface ClearDataConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ClearDataMode;
  targetClassName?: string;
  teachers: Teacher[];
  classes: ClassEntry[];
  onConfirmClear: (mode: ClearDataMode, targetClassName?: string) => void;
}

export const ClearDataConfirmModal: React.FC<ClearDataConfirmModalProps> = ({
  isOpen,
  onClose,
  mode,
  targetClassName,
  teachers,
  classes,
  onConfirmClear,
}) => {
  if (!isOpen) return null;

  const targetClass = targetClassName ? classes.find((c) => c.name === targetClassName) : null;
  const totalSubjectsAllClasses = classes.reduce((sum, c) => sum + (c.subjects?.length || 0), 0);
  const targetClassSubjectsCount = targetClass ? targetClass.subjects.length : 0;

  const handleConfirm = () => {
    onConfirmClear(mode, targetClassName);
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'teachers':
        return 'Clear All Faculty / Teachers?';
      case 'all-subjects':
        return 'Clear All Subjects (All Classes)?';
      case 'class-subjects':
        return `Clear Subjects for ${targetClassName || 'Class'}?`;
      case 'all-curriculum':
        return 'Clear All Teachers & Subjects?';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'teachers':
        return `This will delete all ${teachers.length} registered faculty members and unlink teacher assignments from class subjects.`;
      case 'all-subjects':
        return `This will remove all ${totalSubjectsAllClasses} subject allocations across all ${classes.length} classes and reset the timetable.`;
      case 'class-subjects':
        return `This will remove all ${targetClassSubjectsCount} subjects configured in ${targetClassName} and clear its timetable slots.`;
      case 'all-curriculum':
        return 'This will completely wipe all registered teachers and all subjects across all classes.';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[850] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[90vh] text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-rose-600 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {getTitle()}
              </h3>
              <p className="text-[0.72rem] text-rose-100">
                Action requires explicit confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-rose-700/80 hover:bg-rose-800 text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50/50">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 flex flex-col gap-1">
              <span className="font-bold text-rose-950">Warning: Irreversible deletion</span>
              <span className="leading-relaxed">{getSubtitle()}</span>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2.5">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Items to be removed
            </span>

            {(mode === 'teachers' || mode === 'all-curriculum') && (
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-800">Faculty Members</span>
                </div>
                <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {teachers.length} teachers
                </span>
              </div>
            )}

            {(mode === 'all-subjects' || mode === 'all-curriculum') && (
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">Subjects Across All Classes</span>
                </div>
                <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {totalSubjectsAllClasses} subjects in {classes.length} classes
                </span>
              </div>
            )}

            {mode === 'class-subjects' && targetClass && (
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-800">{targetClass.name} Subjects</span>
                </div>
                <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {targetClassSubjectsCount} subjects
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Clear Everything</span>
          </button>
        </div>
      </div>
    </div>
  );
};
