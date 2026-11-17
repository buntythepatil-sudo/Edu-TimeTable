import React, { useState } from 'react';
import { ClassEntry, Teacher } from '../types';
import {
  School,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Check,
  BookOpen,
  Sparkles,
  Edit3,
  Users,
  Copy,
  Tag,
  GraduationCap,
  Layers,
  UserPlus,
  DoorOpen,
  Zap,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';
import { isMDSubject } from '../utils/timetableGenerator';

interface ClassesAccordionCardProps {
  classes: ClassEntry[];
  teachers: Teacher[];
  nperiods: number;
  onClassesChange: (newClasses: ClassEntry[]) => void;
  onToast: (msg: string) => void;
  onOpenAddSubjectModal?: (targetClass?: string) => void;
  onClearAllSubjects?: () => void;
  onClearClassSubjects?: (className: string) => void;
  onTeachersChange?: (newTeachers: Teacher[]) => void;
  onGenerateTimetable?: () => void;
}

const COMMON_CLASS_PRESETS = [
  'Grade 1-A',
  'Grade 2-A',
  'Grade 3-A',
  'Grade 4-A',
  'Grade 5-A',
  'Grade 6-A',
  'Grade 7-A',
  'Grade 8-A',
  'Grade 9-A',
  'Grade 10-A',
  'Grade 10-B',
  '11th Science',
  '11th Commerce',
  '12th Science',
  '12th Commerce',
  '12th Arts',
];

export const ClassesAccordionCard: React.FC<ClassesAccordionCardProps> = ({
  classes,
  teachers,
  nperiods,
  onClassesChange,
  onToast,
  onOpenAddSubjectModal,
  onClearAllSubjects,
  onClearClassSubjects,
  onTeachersChange,
  onGenerateTimetable,
}) => {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const [inlineSubjName, setInlineSubjName] = useState<Record<number, string>>({});
  const [inlineTeacherId, setInlineTeacherId] = useState<Record<number, string>>({});
  const [inlinePeriods, setInlinePeriods] = useState<Record<number, number>>({});
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [copySourceClassId, setCopySourceClassId] = useState<string>('0'); // index or 'blank' or 'default'
  const [includeTeacherAssignments, setIncludeTeacherAssignments] = useState(true);
  const [quickTeacherModalCi, setQuickTeacherModalCi] = useState<number | null>(null);
  const [quickTeacherName, setQuickTeacherName] = useState('');
  const [quickTeacherId, setQuickTeacherId] = useState('');

  const maxPerWeek = nperiods * 6; // 6 school days

  const addClassWithCustomName = (
    name: string,
    grade?: string,
    room?: string,
    sourceChoice?: string,
    includeTeachers?: boolean
  ) => {
    const finalName = (name || '').trim() || `Class ${classes.length + 1}`;
    
    // Check if class with exact same name already exists
    if (classes.some((c) => c.name.toLowerCase() === finalName.toLowerCase())) {
      onToast(`Class with name "${finalName}" already exists.`);
      return;
    }

    let subjectsToUse: ClassEntry['subjects'] = [];

    const choice = sourceChoice !== undefined ? sourceChoice : copySourceClassId;
    const withTeachers = includeTeachers !== undefined ? includeTeachers : includeTeacherAssignments;

    if (choice === 'blank') {
      subjectsToUse = [];
    } else if (choice === 'default') {
      subjectsToUse = [
        { subjectName: 'Mathematics', teacherId: withTeachers ? teachers[0]?.id || '' : '', periodsPerWeek: 6, doublePeriods: 1 },
        { subjectName: 'Science', teacherId: withTeachers ? teachers[1]?.id || '' : '', periodsPerWeek: 6, doublePeriods: 1 },
        { subjectName: 'English', teacherId: withTeachers ? teachers[2]?.id || '' : '', periodsPerWeek: 5, doublePeriods: 0 },
        { subjectName: 'Social Studies', teacherId: withTeachers ? teachers[3]?.id || '' : '', periodsPerWeek: 5, doublePeriods: 0 },
      ];
    } else {
      const srcIdx = parseInt(choice, 10);
      const srcClass = classes[srcIdx] || classes[0];
      if (srcClass) {
        subjectsToUse = srcClass.subjects.map((s) => ({
          subjectName: s.subjectName,
          teacherId: withTeachers ? s.teacherId || '' : '',
          periodsPerWeek: s.periodsPerWeek || 1,
          doublePeriods: s.doublePeriods || 0,
        }));
      }
    }

    const newCls: ClassEntry = {
      id: 'cls_' + Date.now(),
      name: finalName,
      grade: grade || '',
      room: room || '',
      subjects: subjectsToUse,
    };

    const updated = [...classes, newCls];
    onClassesChange(updated);
    setOpenIndex(updated.length - 1);
    setIsAddClassModalOpen(false);
    setNewClassName('');
    setNewClassGrade('');
    setNewClassRoom('');
    setCopySourceClassId('0');
    onToast(`✓ Created ${newCls.name} with ${subjectsToUse.length} subjects`);
  };

  const removeClass = (index: number) => {
    if (classes.length <= 1) {
      onToast('Need at least 1 class.');
      return;
    }
    const copy = [...classes];
    const removedName = copy[index].name;
    copy.splice(index, 1);
    onClassesChange(copy);
    if (openIndex >= copy.length) setOpenIndex(Math.max(0, copy.length - 1));
    onToast(`Removed ${removedName}`);
  };

  const updateClassName = (index: number, name: string) => {
    const copy = [...classes];
    copy[index].name = name;
    onClassesChange(copy);
  };

  const duplicateClass = (index: number) => {
    const src = classes[index];
    const newName = `${src.name} (Copy)`;
    const newCls: ClassEntry = {
      id: 'cls_' + Date.now(),
      name: newName,
      grade: src.grade,
      room: src.room,
      subjects: src.subjects.map((s) => ({ ...s })),
    };
    const updated = [...classes, newCls];
    onClassesChange(updated);
    setOpenIndex(updated.length - 1);
    onToast(`✓ Duplicated ${src.name} as ${newName}`);
  };

  const addSubjectToClass = (ci: number) => {
    const copy = [...classes];
    copy[ci].subjects.push({
      subjectName: '',
      teacherId: '',
      periodsPerWeek: 4,
      doublePeriods: 0,
    });
    onClassesChange(copy);
  };

  const removeSubjectFromClass = (ci: number, si: number) => {
    const copy = [...classes];
    if (copy[ci].subjects.length <= 1) {
      onToast('Need at least 1 subject per class.');
      return;
    }
    copy[ci].subjects.splice(si, 1);
    onClassesChange(copy);
  };

  const updateSubjectField = (ci: number, si: number, field: string, val: any) => {
    const copy = [...classes];
    const s = copy[ci].subjects[si];
    (s as any)[field] = val;

    if (field === 'subjectName' && isMDSubject(val)) {
      s.teacherId = '';
    }

    // Recalculate double periods constraint
    if (field === 'periodsPerWeek') {
      const maxDp = Math.floor(val / 2);
      if ((s.doublePeriods || 0) > maxDp) {
        s.doublePeriods = maxDp;
      }
    }

    onClassesChange(copy);
  };

  const toggleAlwaysDouble = (ci: number, si: number, on: boolean) => {
    const copy = [...classes];
    const s = copy[ci].subjects[si];
    const maxDp = Math.floor((s.periodsPerWeek || 1) / 2);
    s.doublePeriods = on ? maxDp : 0;
    onClassesChange(copy);
  };

  const handleCreateQuickFaculty = (ci: number) => {
    const name = quickTeacherName.trim();
    if (!name) {
      onToast('Please enter faculty name.');
      return;
    }
    const tid = quickTeacherId.trim() || `TCH${String(teachers.length + 1).padStart(3, '0')}`;
    if (teachers.some((t) => t.id === tid)) {
      onToast(`Teacher ID ${tid} already exists.`);
      return;
    }
    const newTch: Teacher = {
      id: tid,
      name,
    };
    if (onTeachersChange) {
      onTeachersChange([...teachers, newTch]);
    }
    setInlineTeacherId((prev) => ({ ...prev, [ci]: tid }));
    setQuickTeacherModalCi(null);
    setQuickTeacherName('');
    setQuickTeacherId('');
    onToast(`✓ Registered new faculty: ${name} (${tid})`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Card Header */}
      <div className="p-3 sm:px-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            <School className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                Classes, Subjects &amp; Faculty
              </span>
              <span className="text-[0.68rem] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full font-mono">
                {classes.length} {classes.length === 1 ? 'Class' : 'Classes'}
              </span>
            </div>
            <p className="text-[0.72rem] text-slate-500 mt-0.5">
              Assign custom class names, manage subjects, and configure faculty allocations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onClearAllSubjects && classes.some((c) => c.subjects.length > 0) && (
            <button
              type="button"
              onClick={onClearAllSubjects}
              className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear or remove all subjects across all classes"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Clear All Subjects</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddClassModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Class</span>
          </button>
        </div>
      </div>

      {/* Class Quick Switcher Tab Strip */}
      <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">
          Select Class:
        </span>
        {classes.map((cls, ci) => {
          const isSelected = openIndex === ci;
          return (
            <button
              key={cls.id || ci}
              type="button"
              onClick={() => setOpenIndex(ci)}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-white text-indigo-700 border border-indigo-200 shadow-2xs'
                  : 'bg-slate-200/70 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{cls.name}</span>
              <span
                className={`text-[0.62rem] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-300 text-slate-600'
                }`}
              >
                {cls.subjects.length}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsAddClassModalOpen(true)}
          className="h-7 px-2.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>New Class</span>
        </button>
      </div>

      {/* Add Class Modal / Floating Form */}
      {isAddClassModalOpen && (
        <div className="p-4 bg-indigo-50/70 border-b border-indigo-200 animate-in fade-in duration-150">
          <div className="max-w-xl bg-white border border-indigo-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">Assign Name &amp; Create New Class</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-[0.68rem] font-bold text-slate-700 uppercase tracking-wider">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10-A, 12th Science"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.68rem] font-bold text-slate-700 uppercase tracking-wider">
                  Room / Hall
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 204"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Copy Data From Old Class Option */}
            <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 flex flex-col gap-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-[0.68rem] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Copy Subjects &amp; Data From Existing Class:</span>
                </label>
                <span className="text-[0.62rem] text-indigo-700 font-semibold">
                  Saves time when setting up parallel sections
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <select
                    value={copySourceClassId}
                    onChange={(e) => setCopySourceClassId(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {classes.map((c, idx) => (
                      <option key={c.id || idx} value={idx.toString()}>
                        📋 Copy from {c.name} ({c.subjects.length} subjects, {c.subjects.reduce((sum, s) => sum + (s.periodsPerWeek || 1), 0)} p/wk)
                      </option>
                    ))}
                    <option value="default">✨ Standard School Template (Math, Sci, Eng, SS)</option>
                    <option value="blank">⚪ Blank Class (No subjects)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTeacherAssignments}
                      onChange={(e) => setIncludeTeacherAssignments(e.target.checked)}
                      disabled={copySourceClassId === 'blank'}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Copy Assigned Faculty / Teachers</span>
                  </label>
                </div>
              </div>

              {/* Preview of subjects that will be copied */}
              {copySourceClassId !== 'blank' && (
                <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-indigo-100 text-[0.68rem] text-slate-600">
                  <span className="font-bold text-indigo-900">Preview:</span>
                  {copySourceClassId === 'default' ? (
                    <span className="italic text-slate-500">Mathematics (6p), Science (6p), English (5p), Social Studies (5p)</span>
                  ) : (
                    (() => {
                      const srcClass = classes[parseInt(copySourceClassId, 10)] || classes[0];
                      if (!srcClass || srcClass.subjects.length === 0) {
                        return <span className="italic text-slate-400">No subjects to copy</span>;
                      }
                      return srcClass.subjects.map((s, si) => (
                        <span
                          key={si}
                          className="px-1.5 py-0.5 rounded bg-white border border-indigo-100 text-indigo-950 font-medium text-[0.65rem]"
                        >
                          {s.subjectName} ({s.periodsPerWeek}p)
                        </span>
                      ));
                    })()
                  )}
                </div>
              )}
            </div>

            {/* Quick Name Presets */}
            <div className="flex flex-col gap-1">
              <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                Quick Name Suggestions:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COMMON_CLASS_PRESETS.slice(0, 8).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewClassName(preset)}
                    className="text-[0.68rem] px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 font-semibold cursor-pointer transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addClassWithCustomName(newClassName, newClassGrade, newClassRoom)}
                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Class</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classes Accordion List */}
      <div className="p-3 sm:p-4 bg-white flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          {classes.map((cls, ci) => {
            const isOpen = openIndex === ci;
            const totalUsed = cls.subjects.reduce((sum, s) => sum + (s.periodsPerWeek || 1), 0);
            const pct = Math.min(100, Math.round((totalUsed / maxPerWeek) * 100));
            const isOver = totalUsed > maxPerWeek;

            return (
              <div
                key={cls.id || ci}
                className={`border rounded-xl overflow-hidden transition-all shadow-xs ${
                  isOpen ? 'border-indigo-300 bg-white ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Accordion Head with Explicit Class Name Assignment */}
                <div
                  onClick={() => setOpenIndex(isOpen ? -1 : ci)}
                  className="flex items-center justify-between p-3 sm:px-4 bg-slate-50/90 hover:bg-slate-100/80 cursor-pointer transition-colors select-none flex-wrap gap-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <span className="text-slate-400 text-xs">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                    </span>

                    {/* Class Name Badge & Inline Editor */}
                    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
                        <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                          Class Name:
                        </span>
                        <input
                          value={cls.name}
                          placeholder="Assign Class Name"
                          onChange={(e) => updateClassName(ci, e.target.value)}
                          className="font-extrabold text-sm text-slate-900 bg-transparent outline-none border-b border-transparent focus:border-indigo-500 w-36 sm:w-48 truncate"
                          title="Click to edit and assign custom name to this class"
                        />
                        <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>

                      <span className="text-[0.72rem] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">
                        {cls.subjects.length} subjects
                      </span>

                      {cls.room && (
                        <span className="text-[0.68rem] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium hidden md:inline flex items-center gap-1">
                          <DoorOpen className="w-3 h-3 text-slate-400" />
                          {cls.room}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                    {onClearClassSubjects && cls.subjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onClearClassSubjects(cls.name)}
                        className="h-6 px-2 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[0.68rem] flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
                        title={`Clear all subjects in ${cls.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Clear Subjects</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => duplicateClass(ci)}
                      className="h-6 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[0.68rem] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Duplicate this class curriculum"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>

                    <span className={`text-[0.72rem] font-bold font-mono px-2 py-0.5 rounded ${isOver ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                      {totalUsed} / {maxPerWeek} p/wk
                    </span>

                    <button
                      type="button"
                      onClick={() => removeClass(ci)}
                      className="w-7 h-7 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                      title="Delete class"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-3 animate-in fade-in duration-150">
                    {/* Quick Name Presets Banner for this Class */}
                    <div className="p-2 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[0.68rem] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>Assign Name Presets:</span>
                        </span>
                        {COMMON_CLASS_PRESETS.slice(0, 9).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              updateClassName(ci, preset);
                              onToast(`✓ Assigned name: ${preset}`);
                            }}
                            className={`text-[0.68rem] px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                              cls.name === preset
                                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                : 'bg-white text-slate-700 hover:bg-indigo-100 hover:text-indigo-800 border border-slate-200'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="hidden sm:grid grid-cols-[24px_1fr_1fr_90px_70px_28px] gap-2 px-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                      <span>#</span>
                      <span>Subject Name</span>
                      <span>Assigned Faculty (Teacher)</span>
                      <span className="text-center">Periods/Wk</span>
                      <span className="text-center">Double (2×)</span>
                      <span></span>
                    </div>

                    {/* Subject Rows */}
                    <div className="flex flex-col gap-1.5">
                      {cls.subjects.map((s, si) => {
                        const ppw = s.periodsPerWeek || 1;
                        const dp = s.doublePeriods || 0;
                        const isAlwaysDouble = dp > 0;

                        return (
                          <div
                            key={si}
                            className="grid grid-cols-1 sm:grid-cols-[24px_1fr_1fr_90px_70px_28px] gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 text-xs shadow-2xs"
                          >
                            <span className="font-mono text-center font-bold text-slate-400 hidden sm:block">
                              {String(si + 1).padStart(2, '0')}
                            </span>

                            <input
                              value={s.subjectName}
                              placeholder="e.g. Mathematics"
                              onChange={(e) => updateSubjectField(ci, si, 'subjectName', e.target.value)}
                              className="h-8 px-2.5 rounded-md border border-slate-200 font-semibold text-slate-900 outline-none focus:border-indigo-500"
                            />

                            {isMDSubject(s.subjectName) ? (
                              <div className="h-8 px-2 rounded-md border border-amber-300 bg-amber-50/80 font-semibold text-[0.7rem] text-amber-800 flex items-center">
                                🏃 No Faculty (MD / PT / Break)
                              </div>
                            ) : (
                              <select
                                value={s.teacherId}
                                onChange={(e) => {
                                  if (e.target.value === '__add_new__') {
                                    setQuickTeacherModalCi(ci);
                                    return;
                                  }
                                  updateSubjectField(ci, si, 'teacherId', e.target.value);
                                }}
                                className="h-8 px-2 rounded-md border border-slate-200 font-mono text-xs text-slate-900 outline-none focus:border-indigo-500 bg-white"
                              >
                                <option value="">— Assign Faculty —</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.id} — {t.name}
                                  </option>
                                ))}
                                <option value="__add_new__">+ Register New Teacher...</option>
                              </select>
                            )}

                            {/* Periods per week controls */}
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={ppw <= 1}
                                onClick={() => updateSubjectField(ci, si, 'periodsPerWeek', Math.max(1, ppw - 1))}
                                className="w-6 h-6 rounded bg-slate-50 border border-slate-200 font-bold text-xs flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={maxPerWeek}
                                value={ppw}
                                onChange={(e) =>
                                  updateSubjectField(
                                    ci,
                                    si,
                                    'periodsPerWeek',
                                    Math.max(1, Math.min(maxPerWeek, parseInt(e.target.value) || 1))
                                  )
                                }
                                className="w-10 h-6 text-center font-mono font-bold text-indigo-600 border border-slate-200 rounded outline-none"
                              />
                              <button
                                type="button"
                                disabled={ppw >= maxPerWeek}
                                onClick={() => updateSubjectField(ci, si, 'periodsPerWeek', Math.min(maxPerWeek, ppw + 1))}
                                className="w-6 h-6 rounded bg-slate-50 border border-slate-200 font-bold text-xs flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Double period toggle */}
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => toggleAlwaysDouble(ci, si, !isAlwaysDouble)}
                                className={`px-2 py-0.5 rounded-full text-[0.7rem] font-bold border transition-all cursor-pointer ${
                                  isAlwaysDouble
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'
                                }`}
                                title="Pair consecutive periods for practicals or labs"
                              >
                                {isAlwaysDouble ? `2× (${dp}p)` : '2× off'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSubjectFromClass(ci, si)}
                              className="w-7 h-7 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Inline Add Subject Form */}
                    <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1 text-indigo-900">
                          <Plus className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Quick Add Subject to {cls.name}</span>
                        </span>
                        {onOpenAddSubjectModal && (
                          <button
                            type="button"
                            onClick={() => onOpenAddSubjectModal(cls.name)}
                            className="text-[0.7rem] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                          >
                            Advanced / Multi-Class Add →
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Subject Name (e.g. History)"
                          value={inlineSubjName[ci] || ''}
                          onChange={(e) =>
                            setInlineSubjName((prev) => ({ ...prev, [ci]: e.target.value }))
                          }
                          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600"
                        />

                        <select
                          value={inlineTeacherId[ci] || ''}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setQuickTeacherModalCi(ci);
                              return;
                            }
                            setInlineTeacherId((prev) => ({ ...prev, [ci]: e.target.value }));
                          }}
                          className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-600"
                        >
                          <option value="">— Assign Faculty —</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.id} — {t.name}
                            </option>
                          ))}
                          <option value="__add_new__">+ Register New Teacher...</option>
                        </select>

                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                          <span className="text-[0.68rem] text-slate-400 font-bold whitespace-nowrap">p/wk:</span>
                          <input
                            type="number"
                            min={1}
                            max={maxPerWeek}
                            value={inlinePeriods[ci] ?? 4}
                            onChange={(e) =>
                              setInlinePeriods((prev) => ({
                                ...prev,
                                [ci]: Math.max(1, Math.min(maxPerWeek, parseInt(e.target.value) || 1)),
                              }))
                            }
                            className="w-10 h-7 text-center font-mono font-bold text-xs text-indigo-700 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const name = (inlineSubjName[ci] || '').trim();
                            if (!name) {
                              onToast('Please enter a subject name.');
                              return;
                            }
                            const isMD = isMDSubject(name);
                            const finalTid = isMD ? '' : inlineTeacherId[ci] || '';
                            const copy = [...classes];
                            const ppw = inlinePeriods[ci] ?? 4;
                            copy[ci].subjects.push({
                              subjectName: name,
                              teacherId: finalTid,
                              periodsPerWeek: ppw,
                              doublePeriods: 0,
                            });
                            onClassesChange(copy);
                            setInlineSubjName((prev) => ({ ...prev, [ci]: '' }));
                            onToast(`✓ Added ${name} (${ppw} p/wk${isMD ? ' · No Faculty / MD' : ''}) to ${cls.name}`);
                          }}
                          className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subject</span>
                        </button>
                      </div>

                      {onGenerateTimetable && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-indigo-100/80 flex-wrap gap-2">
                          <span className="text-[0.7rem] text-indigo-900 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Done adding subjects to {cls.name}?</span>
                          </span>
                          <button
                            type="button"
                            onClick={onGenerateTimetable}
                            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            title="Generate clash-free timetable"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Generate Timetable</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Register Teacher Dialog within Class */}
                    {quickTeacherModalCi === ci && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col gap-2 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <UserPlus className="w-3.5 h-3.5 text-amber-700" />
                            <span>Quick Register New Faculty Member</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuickTeacherModalCi(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Teacher Full Name (e.g. Dr. Robert Green)"
                            value={quickTeacherName}
                            onChange={(e) => setQuickTeacherName(e.target.value)}
                            className="h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-900 outline-none"
                            autoFocus
                          />
                          <input
                            type="text"
                            placeholder="ID (e.g. TCH009)"
                            value={quickTeacherId}
                            onChange={(e) => setQuickTeacherId(e.target.value)}
                            className="h-8 px-2 rounded-lg border border-amber-300 bg-white text-xs font-mono text-slate-900 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateQuickFaculty(ci)}
                            className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                          >
                            Register Faculty
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar & Actions */}
                    <div className="mt-1 flex flex-col gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${isOver ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                          {isOver ? '⚠ Warning: Over maximum weekly slot capacity! ' : 'Scheduled load: '}
                          <strong className="text-slate-900">{totalUsed}</strong> / {maxPerWeek} periods
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => addSubjectToClass(ci)}
                            className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Blank Row</span>
                          </button>

                          {onOpenAddSubjectModal && (
                            <button
                              type="button"
                              onClick={() => onOpenAddSubjectModal(cls.name)}
                              className="h-7 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Add Subject (Modal)</span>
                            </button>
                          )}

                          {onGenerateTimetable && (
                            <button
                              type="button"
                              onClick={onGenerateTimetable}
                              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Generate complete conflict-free timetable now"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Generate Timetable</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-rose-500' : pct > 90 ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Callout Banner with Generate Timetable Button */}
        {onGenerateTimetable && (
          <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-linear-to-r from-indigo-50 via-slate-50 to-emerald-50 border border-indigo-200/80 flex items-center justify-between flex-wrap gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  Ready to compute weekly schedules?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  The automated scheduling engine allocates teachers across all classes with 0 faculty clashes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onGenerateTimetable}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Generate Timetable</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
