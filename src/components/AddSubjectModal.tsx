import React, { useState } from 'react';
import { ClassEntry, Teacher } from '../types';
import { BookOpen, Plus, Sparkles, Check, School, Layers, AlertCircle } from 'lucide-react';
import { isMDSubject } from '../utils/timetableGenerator';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassEntry[];
  teachers: Teacher[];
  activeClass: string;
  nperiods: number;
  onAddSubject: (
    subjectData: {
      subjectName: string;
      teacherId: string;
      periodsPerWeek: number;
      doublePeriods: number;
      avoidFirst?: boolean;
      avoidLast?: boolean;
    },
    targetClassNames: string[]
  ) => void;
  onToast: (msg: string) => void;
}

const COMMON_SUBJECT_SUGGESTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'General Science',
  'English Language',
  'English Literature',
  'History & Civics',
  'Geography',
  'Social Studies',
  'Computer Science',
  'Information Tech (IT)',
  'Physical Education (PE)',
  'MD',
  'Art & Design',
  'Music & Dance',
  'Economics',
  'Accountancy',
  'Business Studies',
  'Environmental Science (EVS)',
  'Hindi',
  'French',
  'Spanish',
  'Library & Reading',
  'Value Education / Moral Sci',
];

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  classes,
  teachers,
  activeClass,
  nperiods,
  onAddSubject,
  onToast,
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [isDouble, setIsDouble] = useState(false);
  const [avoidFirst, setAvoidFirst] = useState(false);
  const [avoidLast, setAvoidLast] = useState(false);
  const [targetScope, setTargetScope] = useState<'active' | 'all' | 'custom'>('active');
  const [customSelectedClasses, setCustomSelectedClasses] = useState<string[]>(
    activeClass ? [activeClass] : classes.map((c) => c.name)
  );

  if (!isOpen) return null;

  const maxSlotsPerWeek = nperiods * 6;

  const handleSelectSuggestion = (name: string) => {
    setSubjectName(name);
  };

  const handleToggleClass = (clsName: string) => {
    setCustomSelectedClasses((prev) =>
      prev.includes(clsName) ? prev.filter((c) => c !== clsName) : [...prev, clsName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = subjectName.trim();
    if (!name) {
      onToast('Please enter a subject name.');
      return;
    }

    let targetClasses: string[] = [];
    if (targetScope === 'active') {
      targetClasses = [activeClass || classes[0]?.name].filter(Boolean);
    } else if (targetScope === 'all') {
      targetClasses = classes.map((c) => c.name);
    } else {
      targetClasses = customSelectedClasses;
    }

    if (targetClasses.length === 0) {
      onToast('Please select at least one class.');
      return;
    }

    const isMD = isMDSubject(name);
    const finalTeacherId = isMD ? '' : teacherId;
    const doublePeriods = isDouble ? Math.floor(periodsPerWeek / 2) : 0;

    onAddSubject(
      {
        subjectName: name,
        teacherId: finalTeacherId,
        periodsPerWeek,
        doublePeriods,
        avoidFirst,
        avoidLast,
      },
      targetClasses
    );

    onToast(
      `✓ Added "${name}" (${periodsPerWeek} p/wk${isMD ? ' · No Faculty / MD' : ''}) to ${
        targetClasses.length === 1 ? `Class ${targetClasses[0]}` : `${targetClasses.length} classes`
      }`
    );

    // Reset and close
    setSubjectName('');
    setIsDouble(false);
    setAvoidFirst(false);
    setAvoidLast(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[850] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[560px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Add Subject to Curriculum</h3>
              <p className="text-[0.7rem] text-slate-400">
                Define subject name, weekly period quota, faculty, and target classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-slate-900">
          {/* Subject Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Subject Name *</span>
              <span className="text-[0.68rem] text-slate-400 font-normal">e.g. Mathematics, Science</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Enter subject name..."
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 font-semibold text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all"
            />

            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap gap-1.5 mt-1 max-h-20 overflow-y-auto pr-1">
              {COMMON_SUBJECT_SUGGESTIONS.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => handleSelectSuggestion(name)}
                  className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    subjectName === name
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Faculty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Assigned Faculty Member</span>
              {isMDSubject(subjectName) ? (
                <span className="text-[0.68rem] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  🏃 MD Subject: No Teacher Required
                </span>
              ) : (
                <span className="text-[0.68rem] text-indigo-600 font-semibold">{teachers.length} faculty registered</span>
              )}
            </label>
            {isMDSubject(subjectName) ? (
              <div className="h-10 px-3 rounded-lg border border-amber-300 bg-amber-50/60 flex items-center text-xs font-bold text-amber-800">
                🏃 MD Subject — No Faculty Assigned (Self-Study / Mass Drill)
              </div>
            ) : (
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 bg-white outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="">— Unassigned (Will be assigned later) —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.name} {t.specialization ? `(${t.specialization})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Weekly Periods (Per Week Periods) Controls */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Per Week Periods (Quota)</span>
                <p className="text-[0.68rem] text-slate-500">
                  Number of teaching periods assigned to this subject every week
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs">
                {periodsPerWeek} p/wk
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  disabled={periodsPerWeek <= 1}
                  onClick={() => setPeriodsPerWeek((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxSlotsPerWeek}
                  value={periodsPerWeek}
                  onChange={(e) =>
                    setPeriodsPerWeek(Math.max(1, Math.min(maxSlotsPerWeek, parseInt(e.target.value) || 1)))
                  }
                  className="w-12 h-8 text-center font-mono font-extrabold text-sm text-indigo-700 outline-none"
                />
                <button
                  type="button"
                  disabled={periodsPerWeek >= maxSlotsPerWeek}
                  onClick={() => setPeriodsPerWeek((p) => Math.min(maxSlotsPerWeek, p + 1))}
                  className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Quick Preset Badges */}
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setPeriodsPerWeek(n)}
                    className={`h-7 px-2.5 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                      periodsPerWeek === n
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-500'
                    }`}
                  >
                    {n}p
                  </button>
                ))}
              </div>
            </div>

            {/* Double Period Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal-double-period"
                  checked={isDouble}
                  onChange={(e) => setIsDouble(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="modal-double-period" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Schedule Double Periods (2× Consecutive Slots)
                </label>
              </div>
              {isDouble && (
                <span className="text-[0.68rem] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {Math.floor(periodsPerWeek / 2)} double slot{Math.floor(periodsPerWeek / 2) > 1 ? 's' : ''}/wk
                </span>
              )}
            </div>

            {/* Period Restrictions Toggle (When entering subjects) */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">
                Period Restrictions (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-teal-400 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={avoidFirst}
                    onChange={(e) => setAvoidFirst(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Avoid 1st Period (Not P1)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-amber-400 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={avoidLast}
                    onChange={(e) => setAvoidLast(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Avoid Last Period (Not P_Last)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Target Class Scope */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-800">Add to Which Class(es)?</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope('active')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === 'active'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <School className="w-4 h-4" />
                <span>Class {activeClass || classes[0]?.name}</span>
                <span className="text-[0.62rem] font-normal text-slate-400">Current class only</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === 'all'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>All {classes.length} Classes</span>
                <span className="text-[0.62rem] font-normal text-slate-400">Bulk school add</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('custom')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === 'custom'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Custom Select</span>
                <span className="text-[0.62rem] font-normal text-slate-400">Pick divisions</span>
              </button>
            </div>

            {/* Custom checkboxes */}
            {targetScope === 'custom' && (
              <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                {classes.map((cls) => {
                  const isChecked = customSelectedClasses.includes(cls.name);
                  return (
                    <label
                      key={cls.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleClass(cls.name)}
                        className="hidden"
                      />
                      <span>Class {cls.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
