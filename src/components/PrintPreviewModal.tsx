import React, { useState, useRef } from 'react';
import { ClassEntry, Teacher, ScheduleEntry, TimetableGrid } from '../types';
import { DAYS, CC_CLASSES, DOT_COLORS, getTeacherName, getBreakInfo, getMDPeriods, isMDSubject } from '../utils/timetableGenerator';
import {
  Printer,
  Download,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  X
} from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassEntry[];
  teachers: Teacher[];
  schedule: ScheduleEntry[];
  tt: TimetableGrid;
  activeClass: string;
  institutionName?: string;
  academicYear?: string;
  onExportClassPDF: (clsName: string) => void;
  onExportAllPDF: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  classes,
  teachers,
  schedule,
  tt,
  activeClass,
  institutionName,
  academicYear,
  onExportClassPDF,
  onExportAllPDF,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(activeClass || 'ALL');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activeClass) {
      setSelectedClass(activeClass);
    }
  }, [activeClass, isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validClasses = classes.filter((c) => c.name.trim());
  if (!validClasses.length || Object.keys(tt).length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[850] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Timetable Data to Preview</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Please generate a timetable first before opening the Print Preview.
          </p>
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const nperiods = schedule.filter((e) => e.type === 'period').length || 8;
  const { afterPeriod: bafter } = getBreakInfo(schedule);
  const periodBeforeRecess = bafter > 0 ? bafter - 1 : -1;
  const periodAfterRecess = bafter > 0 ? bafter : -1;
  const mdPeriodsList = getMDPeriods(schedule);

  const displayedClasses =
    selectedClass === 'ALL'
      ? validClasses
      : validClasses.filter((c) => c.name === selectedClass);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (selectedClass === 'ALL') {
      onExportAllPDF();
    } else {
      onExportClassPDF(selectedClass);
    }
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(50, Math.min(150, prev + delta)));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const currentClassIndex = validClasses.findIndex((c) => c.name === selectedClass);

  const handlePrevClass = () => {
    if (selectedClass === 'ALL') {
      setSelectedClass(validClasses[validClasses.length - 1].name);
    } else if (currentClassIndex > 0) {
      setSelectedClass(validClasses[currentClassIndex - 1].name);
    } else {
      setSelectedClass('ALL');
    }
  };

  const handleNextClass = () => {
    if (selectedClass === 'ALL') {
      setSelectedClass(validClasses[0].name);
    } else if (currentClassIndex < validClasses.length - 1) {
      setSelectedClass(validClasses[currentClassIndex + 1].name);
    } else {
      setSelectedClass('ALL');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[850] flex flex-col overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* TOP CONTROL TOOLBAR */}
      <div
        className="h-14 bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg z-20 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title & Preview Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-white leading-tight">
                Print &amp; PDF Output Preview
              </h2>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900/60">
                A4 Landscape (297 × 210 mm · Normal Margin)
              </span>
            </div>
            <p className="text-[0.68rem] text-slate-400 hidden sm:block">
              Simulated exact paper layout with high-contrast color styles and print borders
            </p>
          </div>
        </div>

        {/* Center Class Navigation & View Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            onClick={handlePrevClass}
            className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Previous Class"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2.5 py-1 outline-none border border-slate-700 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Classes (Multi-Page View · {validClasses.length} Pages)</option>
            {validClasses.map((c) => (
              <option key={c.name} value={c.name}>
                Class {c.name} (Single Page)
              </option>
            ))}
          </select>

          <button
            onClick={handleNextClass}
            className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Next Class"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Actions: Zoom, Download PDF, Print, Close */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => handleZoom(-10)}
              className="w-6 h-6 rounded hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 text-[0.7rem] px-1 font-bold min-w-[38px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => handleZoom(10)}
              className="w-6 h-6 rounded hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 ml-0.5 cursor-pointer"
              title="Reset 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Download PDF document"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Print to printer or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print (A4)</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PREVIEW CANVAS / DESK */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center gap-8 bg-slate-950/90 text-slate-900 select-text cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {displayedClasses.map((cls, classIndex) => {
          return (
            <div
              key={cls.name}
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                width: '297mm',
                minHeight: '210mm',
              }}
              className="bg-white rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-slate-300 p-[25.4mm] flex flex-col justify-between mb-4 print:shadow-none print:border-none print:m-0 print:p-0"
            >
              {/* PAGE CONTENT CONTAINER */}
              <div className="flex flex-col gap-2.5 flex-1">
                {/* 1. HEADER BANNER */}
                <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs inline-block" />
                      <h1 className="text-[14pt] font-extrabold text-slate-900 tracking-tight uppercase leading-none">
                        {institutionName || 'St. Jude International Academy'}
                      </h1>
                    </div>
                    <p className="text-[9pt] font-bold text-slate-800 mt-1">
                      Academic Class Timetable — <span className="text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded-xs border border-indigo-200">Class {cls.name}</span>
                    </p>
                  </div>

                  <div className="text-right text-[8pt] text-slate-600 font-medium leading-tight">
                    <div>Academic Year: <span className="font-bold text-slate-900">{academicYear || '2026–2027'}</span></div>
                    <div>Schedule Term: <span className="font-bold text-slate-800">Regular Weekly Timetable</span></div>
                    <div>Printed: <span className="font-mono text-slate-700">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                  </div>
                </div>

                {/* 2. TIMETABLE GRID TABLE */}
                <div className="overflow-visible">
                  <table className="timetable-table w-full border-collapse border border-slate-900 text-[8pt]">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[7.5pt] font-bold uppercase tracking-wider">
                        <th className="period-time-col p-1.5 w-[65px] bg-slate-950 text-center border border-slate-800">
                          Period
                        </th>
                        {DAYS.map((d) => (
                          <th key={d} className="p-1.5 text-center border border-slate-800">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: nperiods }).map((_, p) => {
                        const isPreRecess = p === periodBeforeRecess;
                        const isPostRecess = p === periodAfterRecess;

                        return (
                          <React.Fragment key={p}>
                            <tr>
                              {/* Period header cell */}
                              <td className="period-time-col p-1 border border-slate-300 bg-slate-50 text-center font-mono font-bold text-slate-800 border-r-2 border-r-slate-900 align-middle">
                                <div className="font-extrabold text-indigo-700 text-[8.5pt]">P{p + 1}</div>
                              </td>

                              {/* Days columns */}
                              {DAYS.map((_, di) => {
                                const si = tt[cls.name]?.[di]?.[p];
                                const subj = si !== undefined && si !== null ? cls.subjects[si] : null;

                                if (subj) {
                                  const teacherName = getTeacherName(teachers, subj.teacherId);
                                  const colorIdx = si % CC_CLASSES.length;
                                  const colorClass = CC_CLASSES[colorIdx];

                                  return (
                                    <td key={di} className="p-0.5 border border-slate-300 align-top bg-white">
                                      <div className={`slot-card p-1 rounded-xs flex flex-col justify-center ${colorClass}`}>
                                        <div className="font-extrabold text-slate-950 text-[8pt] leading-tight truncate">
                                          {subj.subjectName}
                                        </div>
                                        <div className="text-[7pt] text-slate-700 font-medium flex items-center gap-1 mt-0.5 leading-none">
                                          {isMDSubject(subj.subjectName) || !subj.teacherId ? (
                                            <span className="font-semibold text-amber-900 bg-amber-100/90 px-1 py-0.2 rounded-xs text-[6.5pt]">
                                              No Faculty (MD)
                                            </span>
                                          ) : (
                                            <>
                                              <span className="font-mono font-bold text-slate-900 bg-black/5 px-1 py-0.2 rounded-xs text-[6.5pt]">
                                                {subj.teacherId}
                                              </span>
                                              <span className="truncate">{teacherName}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={di} className="p-0.5 border border-slate-200 align-top bg-slate-50/40">
                                    <div className="min-h-[38px] flex items-center justify-center text-slate-300 text-[7pt] font-mono">
                                      —
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Recess Break Row */}
                            {isPreRecess && bafter > 0 && (
                              <tr>
                                <td colSpan={7} className="p-0 border-none">
                                  <div className="recess-row bg-amber-50 border-t border-b border-dashed border-amber-400 py-1 px-3 flex items-center justify-between text-[7.5pt] font-bold text-amber-900">
                                    <span>☕ RECESS / LUNCH BREAK</span>
                                    <span className="text-[7pt] font-medium text-amber-800">Midday Interval</span>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Mass Drill Rows */}
                            {mdPeriodsList
                              .filter((md) => md.afterPeriod === p + 1)
                              .map((md, mi) => (
                                <tr key={mi}>
                                  <td className="period-time-col p-1 border border-slate-300 bg-emerald-50 text-center font-mono text-[7pt] font-bold text-emerald-900 border-r-2 border-r-slate-900">
                                    🏃 MD
                                  </td>
                                  {DAYS.map((_, di) => {
                                    const runsToday = md.days.includes(di);
                                    return (
                                      <td
                                        key={di}
                                        className={`p-1 border border-slate-300 text-center ${
                                          runsToday ? 'bg-emerald-50' : 'bg-slate-50/30'
                                        }`}
                                      >
                                        {runsToday ? (
                                          <div className="massdrill-row text-[7.5pt] font-bold text-emerald-900 flex items-center justify-center gap-1 py-0.5">
                                            <span>🏃 {md.entry.label || 'Mass Drill'}</span>
                                            <span className="text-[6.5pt] font-normal text-emerald-800">
                                              ({md.entry.startTime}–{md.entry.endTime})
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 text-[7pt]">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 3. FACULTY & SUBJECT REFERENCE KEY */}
                <div className="print-legend border-t border-slate-300 pt-1.5 mt-auto">
                  <div className="text-[7.5pt] font-extrabold uppercase tracking-wider text-slate-900 mb-1 flex items-center justify-between">
                    <span>Faculty &amp; Subject Reference Key</span>
                    <span className="text-[7pt] font-normal text-slate-500">Class {cls.name} Curriculum Allocation</span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[7pt] text-slate-700 bg-slate-50 p-1.5 rounded-xs border border-slate-200">
                    {cls.subjects.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-xs inline-block shrink-0 border border-slate-300"
                          style={{ backgroundColor: DOT_COLORS[idx % DOT_COLORS.length] }}
                        />
                        <span className="font-bold text-slate-900">{s.subjectName}:</span>
                        <span className="truncate">{getTeacherName(teachers, s.teacherId)}</span>
                        <span className="font-mono text-slate-500 font-semibold text-[6.5pt]">
                          ({s.teacherId || '—'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. FOOTER SIGNATURES & PAGE NUMBER */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-end justify-between text-[7pt] text-slate-600">
                <div className="flex gap-12">
                  <div className="border-t border-slate-400 pt-0.5 min-w-[90px] text-center">
                    <span className="font-bold text-slate-800">Prepared By</span>
                    <div className="text-[6.5pt] text-slate-500">Timetable In-Charge</div>
                  </div>
                  <div className="border-t border-slate-400 pt-0.5 min-w-[90px] text-center">
                    <span className="font-bold text-slate-800">Verified By</span>
                    <div className="text-[6.5pt] text-slate-500">Academic Coordinator</div>
                  </div>
                  <div className="border-t border-slate-400 pt-0.5 min-w-[90px] text-center">
                    <span className="font-bold text-slate-800">Approved By</span>
                    <div className="text-[6.5pt] text-slate-500">Principal / Headmaster</div>
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-slate-500">
                  Page {selectedClass === 'ALL' ? classIndex + 1 : 1} of {selectedClass === 'ALL' ? validClasses.length : 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
