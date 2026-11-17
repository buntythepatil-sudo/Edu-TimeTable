import React, { useState } from 'react';
import { ClassEntry, Teacher, ScheduleEntry, TimetableGrid, TimetableConflict } from '../types';
import { DAYS, DOT_COLORS, getTeacherName, getConflictSet } from '../utils/timetableGenerator';
import { BookOpen, Users, AlertTriangle, Contact, CheckCircle2 } from 'lucide-react';

interface ClassInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassEntry[];
  teachers: Teacher[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  conflicts: TimetableConflict[];
  initialClass: string;
}

export const ClassInfoModal: React.FC<ClassInfoModalProps> = ({
  isOpen,
  onClose,
  classes,
  teachers,
  schedule,
  tt,
  conflicts,
  initialClass,
}) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || classes[0]?.name || '');
  const [tab, setTab] = useState<'subjects' | 'faculty' | 'conflicts' | 'directory'>('subjects');

  if (!isOpen) return null;

  const validClasses = classes.filter((c) => c.name.trim());
  const cls = validClasses.find((c) => c.name === selectedClass) || validClasses[0];

  if (!cls) return null;

  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const conflictSet = getConflictSet(conflicts);
  const subjs = cls.subjects;

  // Usage map
  const usage: Record<string, number> = {};
  const conflictSlots: Array<{
    day: string;
    period: number;
    subj: string;
    teacherId: string;
    teacher: string;
  }> = [];

  DAYS.forEach((day, di) => {
    for (let p = 0; p < nperiods; p++) {
      const si = tt[cls.name]?.[di]?.[p];
      if (si === undefined || si === null) continue;
      const subj = cls.subjects[si];
      if (!subj) continue;
      usage[subj.subjectName] = (usage[subj.subjectName] || 0) + 1;
      if (conflictSet.has(`${cls.name}|${di}|${p}`)) {
        conflictSlots.push({
          day,
          period: p + 1,
          subj: subj.subjectName,
          teacherId: subj.teacherId,
          teacher: getTeacherName(teachers, subj.teacherId),
        });
      }
    }
  });

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[800] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[680px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <span>📋 Class Information &amp; Faculty Analysis — {cls.name}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
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
              {c.name}
            </button>
          ))}
        </div>

        {/* Inner Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0">
          <button
            onClick={() => setTab('subjects')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'subjects' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Subjects ({subjs.length})</span>
          </button>

          <button
            onClick={() => setTab('faculty')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'faculty' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Assigned Faculty</span>
          </button>

          <button
            onClick={() => setTab('conflicts')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'conflicts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Clashes ({conflictSlots.length})</span>
          </button>

          <button
            onClick={() => setTab('directory')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'directory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Contact className="w-3.5 h-3.5" />
            <span>Master Faculty Lookup</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-900">
          {tab === 'subjects' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-2.5 text-left">Subject</th>
                    <th className="p-2.5 text-left">Faculty ID</th>
                    <th className="p-2.5 text-left">Faculty Name</th>
                    <th className="p-2.5 text-center">Periods / Wk</th>
                  </tr>
                </thead>
                <tbody>
                  {subjs.map((s, i) => (
                    <tr key={i} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <td className="p-2.5">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }}
                          />
                          <span>{s.subjectName}</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-indigo-600">
                        <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {s.teacherId || '—'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">
                        {getTeacherName(teachers, s.teacherId)}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-indigo-600">
                        {usage[s.subjectName] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'faculty' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-2.5 text-left">Faculty ID</th>
                    <th className="p-2.5 text-left">Name</th>
                    <th className="p-2.5 text-left">Assigned Subjects</th>
                    <th className="p-2.5 text-center">Periods in {cls.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set<string>(subjs.map((s) => s.teacherId).filter(Boolean))).map((tid) => {
                    const assigned = subjs.filter((s) => s.teacherId === tid).map((s) => s.subjectName);
                    const totalP = assigned.reduce((sum, sn) => sum + (usage[sn] || 0), 0);

                    return (
                      <tr key={tid} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono font-bold text-indigo-600">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {tid}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {getTeacherName(teachers, tid)}
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1">
                            {assigned.map((sn, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[0.7rem] text-slate-600"
                              >
                                {sn}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-indigo-600">
                          {totalP}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'conflicts' && (
            <div>
              {conflictSlots.length === 0 ? (
                <div className="p-8 text-center text-emerald-600 flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 mb-2" />
                  <strong className="text-sm">No conflicts for Class {cls.name}</strong>
                  <p className="text-xs text-slate-500 mt-0.5">All faculty assignments are conflict-free.</p>
                </div>
              ) : (
                <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/50">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-100 text-[0.68rem] font-bold uppercase tracking-wider text-rose-700">
                        <th className="p-2.5 text-left">Day</th>
                        <th className="p-2.5 text-left">Period</th>
                        <th className="p-2.5 text-left">Subject</th>
                        <th className="p-2.5 text-left">Faculty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conflictSlots.map((c, idx) => (
                        <tr key={idx} className="border-b border-rose-200">
                          <td className="p-2.5 font-bold text-slate-900">{c.day}</td>
                          <td className="p-2.5 font-mono text-slate-600">P{c.period}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{c.subj}</td>
                          <td className="p-2.5 text-rose-600 font-bold">
                            [{c.teacherId}] {c.teacher}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'directory' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-2.5 text-left">Faculty ID</th>
                    <th className="p-2.5 text-left">Name</th>
                    <th className="p-2.5 text-left">In {cls.name}?</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => {
                    const inThis = subjs.some((s) => s.teacherId === t.id);
                    return (
                      <tr
                        key={t.id}
                        className={`border-b border-slate-200 ${
                          inThis ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="p-2.5 font-mono font-bold text-indigo-600">{t.id}</td>
                        <td className="p-2.5 text-slate-900">{t.name}</td>
                        <td className="p-2.5">
                          {inThis ? (
                            <span className="text-[0.7rem] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ Assigned
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {subjs.length} subjects · {conflictSlots.length} clashes
          </span>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
