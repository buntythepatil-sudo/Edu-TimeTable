import React, { useState } from 'react';
import { Teacher, ClassEntry } from '../types';
import { Contact, Search, Plus, Trash2, CheckCircle2, Users, UploadCloud, AlertTriangle, UserX } from 'lucide-react';
import { TeacherDeleteConfirmModal, AssignedSubjectInfo } from './TeacherDeleteConfirmModal';

interface TeacherRegistryCardProps {
  teachers: Teacher[];
  classes: ClassEntry[];
  onTeachersChange: (newTeachers: Teacher[]) => void;
  onRemoveTeacherWithPeriods?: (teacherId: string) => void;
  onClearAllTeachers?: () => void;
  onToast: (msg: string) => void;
}

export const TeacherRegistryCard: React.FC<TeacherRegistryCardProps> = ({
  teachers,
  classes,
  onTeachersChange,
  onRemoveTeacherWithPeriods,
  onClearAllTeachers,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [qaName, setQaName] = useState('');
  const [qaId, setQaId] = useState('');
  const [manualId, setManualId] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPrefix, setBulkPrefix] = useState('TCH');
  const [bulkOpen, setBulkOpen] = useState(false);

  // Deletion confirmation state
  const [confirmDeleteTeacher, setConfirmDeleteTeacher] = useState<{
    teacher: Teacher;
    assignedSubjects: AssignedSubjectInfo[];
    totalPeriods: number;
  } | null>(null);

  const suggestTeacherId = (name: string) => {
    if (!name.trim()) return `TCH${String(teachers.length + 1).padStart(3, '0')}`;
    const parts = name.trim().split(/\s+/);
    const last = parts[parts.length - 1] || 'T';
    const base = last.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
    for (let n = 1; n <= 99; n++) {
      const id = base + String(n).padStart(2, '0');
      if (!teachers.find((t) => t.id === id)) return id;
    }
    return `TCH${String(teachers.length + 1).padStart(3, '0')}`;
  };

  const handleQaNameChange = (val: string) => {
    setQaName(val);
    if (!manualId) {
      setQaId(suggestTeacherId(val));
    }
  };

  const quickAddTeacher = () => {
    const name = qaName.trim();
    if (!name) {
      onToast('Please enter a teacher name.');
      return;
    }

    let id = qaId.trim() || suggestTeacherId(name);
    if (teachers.find((t) => t.id === id)) {
      id = `TCH${String(Date.now()).slice(-4)}`;
    }

    const updated = [...teachers, { id, name }];
    onTeachersChange(updated);
    setQaName('');
    setQaId('');
    setManualId(false);
    onToast(`✓ Added ${name} (${id})`);
  };

  const updateTeacher = (index: number, field: keyof Teacher, val: string) => {
    const copy = [...teachers];
    copy[index] = { ...copy[index], [field]: val };
    onTeachersChange(copy);
  };

  const initiateRemoveTeacher = (teacher: Teacher) => {
    // Collect all assigned subjects and period allocations for this teacher
    const assignedSubjects: AssignedSubjectInfo[] = [];
    let totalPeriods = 0;

    classes.forEach((cls) => {
      cls.subjects.forEach((s) => {
        if (s.teacherId === teacher.id) {
          const pCount = s.periodsPerWeek || 0;
          assignedSubjects.push({
            className: cls.name,
            subjectName: s.subjectName || 'Unnamed Subject',
            periodsPerWeek: pCount,
            doublePeriods: s.doublePeriods,
          });
          totalPeriods += pCount;
        }
      });
    });

    // If teacher has periods/subjects assigned across classes, prompt user
    if (assignedSubjects.length > 0) {
      setConfirmDeleteTeacher({
        teacher,
        assignedSubjects,
        totalPeriods,
      });
    } else {
      // Not assigned to any periods -> direct deletion
      const updated = teachers.filter((t) => t.id !== teacher.id);
      onTeachersChange(updated);
      onToast(`✓ Removed ${teacher.name} (${teacher.id})`);
    }
  };

  const handleConfirmDelete = (teacherId: string) => {
    if (onRemoveTeacherWithPeriods) {
      onRemoveTeacherWithPeriods(teacherId);
    } else {
      // Fallback if prop not provided
      const updated = teachers.filter((t) => t.id !== teacherId);
      onTeachersChange(updated);
      onToast(`✓ Deleted teacher ${teacherId}`);
    }
    setConfirmDeleteTeacher(null);
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      onToast('Paste some names first.');
      return;
    }

    const prefix = (bulkPrefix.trim() || 'TCH').toUpperCase();
    const existingNums = teachers
      .filter((t) => t.id.startsWith(prefix))
      .map((t) => parseInt(t.id.slice(prefix.length)) || 0);

    let nextNum = existingNums.length ? Math.max(...existingNums) + 1 : 1;
    let addedCount = 0;
    const newTeachers = [...teachers];

    lines.forEach((name) => {
      if (newTeachers.find((t) => t.name.toLowerCase() === name.toLowerCase())) return;
      let id = prefix + String(nextNum).padStart(3, '0');
      while (newTeachers.find((t) => t.id === id)) {
        nextNum++;
        id = prefix + String(nextNum).padStart(3, '0');
      }
      newTeachers.push({ id, name });
      nextNum++;
      addedCount++;
    });

    onTeachersChange(newTeachers);
    setBulkText('');
    setBulkOpen(false);
    onToast(`✓ Imported ${addedCount} teacher${addedCount !== 1 ? 's' : ''}`);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Card Header */}
      <div className="p-3 sm:px-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm">
            <Users className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-[0.88rem] text-slate-900">Teacher Registry</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 w-36 sm:w-44"
            />
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">
            {teachers.length} faculty
          </span>
          {onClearAllTeachers && teachers.length > 0 && (
            <button
              type="button"
              onClick={onClearAllTeachers}
              className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear or remove all registered faculty"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-white flex flex-col gap-3">
        {/* Table header */}
        <div className="grid grid-cols-[82px_1fr_70px_32px] gap-2 px-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
          <span>Faculty ID</span>
          <span>Full Name</span>
          <span className="text-center">Status</span>
          <span></span>
        </div>

        {/* Teachers list */}
        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          {teachers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50/70 rounded-lg border border-dashed border-slate-200">
              No teachers registered yet. Add your faculty below or use Bulk Import.
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No faculty found matching "{searchTerm}"
            </div>
          ) : (
            filteredTeachers.map((t) => {
              const i = teachers.indexOf(t);
              const assignedSubjectList = classes.flatMap((c) =>
                c.subjects.filter((s) => s.teacherId === t.id)
              );
              const inUse = assignedSubjectList.length > 0;
              const totalPeriodsCount = assignedSubjectList.reduce(
                (sum, s) => sum + (s.periodsPerWeek || 0),
                0
              );

              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[82px_1fr_70px_32px] gap-2 items-center bg-slate-50/50 p-1.5 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all text-xs group"
                >
                  <input
                    value={t.id}
                    onChange={(e) => updateTeacher(i, 'id', e.target.value.toUpperCase())}
                    className="font-mono text-[0.72rem] font-bold text-white bg-indigo-600 rounded px-1.5 py-1 text-center outline-none"
                    title="Click to modify Teacher ID"
                  />

                  <div className="flex items-center gap-1.5 min-w-0">
                    <input
                      value={t.name}
                      placeholder="Faculty Name"
                      onChange={(e) => updateTeacher(i, 'name', e.target.value)}
                      className="font-semibold text-slate-900 bg-transparent outline-none truncate flex-1 min-w-0"
                    />
                    {totalPeriodsCount > 26 && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[0.6rem] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0"
                        title={`Overloaded: ${totalPeriodsCount} periods/week (exceeds typical maximum of 26)`}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                        <span>Overload</span>
                      </span>
                    )}
                  </div>

                  <div className="text-center">
                    {inUse ? (
                      <span
                        className={`text-[0.68rem] font-bold px-1.5 py-0.5 rounded cursor-default border ${
                          totalPeriodsCount > 26
                            ? 'text-rose-700 bg-rose-50 border-rose-200 font-extrabold'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        }`}
                        title={`${totalPeriodsCount} periods/week assigned across classes${
                          totalPeriodsCount > 26 ? ' (Overloaded: >26 periods)' : ''
                        }`}
                      >
                        {totalPeriodsCount}p
                      </span>
                    ) : (
                      <span className="text-[0.68rem] text-slate-400">—</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => initiateRemoveTeacher(t)}
                    className="w-7 h-7 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                    title={
                      inUse
                        ? `Remove ${t.name} (has ${totalPeriodsCount} assigned periods)`
                        : `Remove ${t.name}`
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Row */}
        <div className="flex items-center gap-2 bg-indigo-50/60 border-2 border-dashed border-indigo-200 p-2 rounded-xl">
          <span className="text-xs font-bold text-indigo-600 shrink-0 pl-1">+ New</span>
          <input
            type="text"
            placeholder="Teacher name (press Enter to add)"
            value={qaName}
            onChange={(e) => handleQaNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                quickAddTeacher();
              }
            }}
            className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Auto ID"
            value={qaId}
            onChange={(e) => {
              setQaId(e.target.value);
              setManualId(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                quickAddTeacher();
              }
            }}
            className="w-20 h-8 px-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs text-indigo-600 outline-none"
          />
          <button
            type="button"
            onClick={quickAddTeacher}
            className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Add
          </button>
        </div>

        {/* Bulk Import Toggle */}
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setBulkOpen(!bulkOpen)}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>📋 Bulk Import Faculty (Paste multiple names)</span>
          </button>

          {bulkOpen && (
            <div className="mt-2.5 flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <textarea
                rows={3}
                placeholder="One teacher name per line, e.g.:&#10;Dr. Alan Turing&#10;Marie Curie&#10;Richard Feynman"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-500 resize-y"
              />
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>ID Prefix:</span>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    className="w-16 h-7 px-1.5 rounded border border-slate-200 bg-white font-mono text-center text-xs font-bold text-indigo-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  ⚡ Import All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal if periods are assigned */}
      <TeacherDeleteConfirmModal
        isOpen={confirmDeleteTeacher !== null}
        onClose={() => setConfirmDeleteTeacher(null)}
        teacher={confirmDeleteTeacher?.teacher || null}
        assignedSubjects={confirmDeleteTeacher?.assignedSubjects || []}
        totalPeriods={confirmDeleteTeacher?.totalPeriods || 0}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
