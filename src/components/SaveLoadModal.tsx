import React, { useState, useMemo, useRef } from 'react';
import {
  Save,
  FolderOpen,
  Calendar,
  Trash2,
  Check,
  FileText,
  Upload,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SavedTimetable, AutoSaveSession, ClassEntry, Teacher, ScheduleEntry, TimetableGrid } from '../types';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'save' | 'retrieve' | 'import';
  savedTimetables: SavedTimetable[];
  currentClasses: ClassEntry[];
  currentTeachers: Teacher[];
  currentSchedule: ScheduleEntry[];
  currentTT: TimetableGrid;
  onConfirmSave: (name: string, notes?: string, overwriteId?: string) => void;
  onLoadTimetable: (id: string) => void;
  onDeleteTimetable: (id: string, name: string) => void;
  onImportJSONFile: (file: File) => void;
  onExportSavedItemJSON?: (savedItem: SavedTimetable) => void;
  onToast: (msg: string) => void;
  latestAutoSaveSession?: AutoSaveSession | null;
  onRestoreAutoSave?: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'save',
  savedTimetables,
  currentClasses,
  currentTeachers,
  currentSchedule,
  currentTT,
  onConfirmSave,
  onLoadTimetable,
  onDeleteTimetable,
  onImportJSONFile,
  onExportSavedItemJSON,
  onToast,
  latestAutoSaveSession,
  onRestoreAutoSave,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'retrieve' | 'import'>(initialTab);
  const [saveName, setSaveName] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOverwriteId, setSelectedOverwriteId] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync tab when opening
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Generate intelligent default name if empty
      if (!saveName) {
        const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const validClasses = currentClasses.filter((c) => c.name.trim());
        const hasTT = Object.keys(currentTT).length > 0;
        const defaultTitle = `${validClasses.length > 0 ? validClasses.length + ' Classes' : 'Master'} Timetable (${today}${hasTT ? ' Generated' : ''})`;
        setSaveName(defaultTitle);
      }
    }
  }, [isOpen, initialTab]);

  const validClassCount = currentClasses.filter((c) => c.name.trim()).length;
  const teacherCount = currentTeachers.length;
  const periodCount = currentSchedule.filter((e) => e.type === 'period').length || 8;
  const hasGeneratedTT = Object.keys(currentTT).length > 0;

  // Filter saved timetables
  const filteredSaves = useMemo(() => {
    if (!searchQuery.trim()) return savedTimetables;
    const q = searchQuery.toLowerCase();
    return savedTimetables.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        s.savedAt.toLowerCase().includes(q)
    );
  }, [savedTimetables, searchQuery]);

  if (!isOpen) return null;

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) {
      onToast('Please enter a schedule title.');
      return;
    }
    onConfirmSave(saveName.trim(), notes.trim(), selectedOverwriteId || undefined);
    setSaveName('');
    setNotes('');
    setSelectedOverwriteId('');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSONFile(file);
      onClose();
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.json')) {
        onImportJSONFile(file);
        onClose();
      } else {
        onToast('Please drop a valid .json timetable backup file.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[800] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[620px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head with Tabs */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs font-bold">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-none">
                  Save & Retrieve Timetables
                </h3>
                <p className="text-[0.72rem] text-slate-400 mt-0.5">
                  Preserve your schedules, restore past drafts, or import backups
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('save')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'save'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Timetable</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('retrieve')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'retrieve'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Retrieve Saved ({savedTimetables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Retrieve from File</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB 1: SAVE TIMETABLE */}
          {activeTab === 'save' && (
            <form onSubmit={handleSaveSubmit} className="flex flex-col gap-4">
              {/* Snapshot details card */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Current Timetable Snapshot</span>
                  <span className="text-indigo-600 font-extrabold">Ready to Save</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <div className="text-[0.65rem] font-semibold text-slate-500">Classes</div>
                    <div className="text-sm font-extrabold text-slate-800">{validClassCount}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <div className="text-[0.65rem] font-semibold text-slate-500">Faculty</div>
                    <div className="text-sm font-extrabold text-slate-800">{teacherCount}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <div className="text-[0.65rem] font-semibold text-slate-500">Periods/Day</div>
                    <div className="text-sm font-extrabold text-slate-800">{periodCount}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <div className="text-[0.65rem] font-semibold text-slate-500">Grid Status</div>
                    <div
                      className={`text-xs font-extrabold ${hasGeneratedTT ? 'text-emerald-700' : 'text-amber-700'}`}
                    >
                      {hasGeneratedTT ? '✓ Generated' : 'Draft Config'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[0.72rem] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Schedule Title / Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Term 1 2026 Final Draft, Science Block Schedule..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white"
                />
                {/* Quick Title Tags */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[0.68rem] text-slate-600 font-medium">Quick suggestions:</span>
                  {['Master Draft', 'Term 1 Final', 'Midterm Revision', 'Science & Arts Split'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSaveName(tag)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[0.68rem] font-medium border border-slate-200 cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-[0.72rem] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified with science faculty; Mass Drill configured after 3rd period on Friday."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-none bg-white"
                />
              </div>

              {/* Overwrite option if saved items exist */}
              {savedTimetables.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Save Action:
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="saveAction"
                        checked={!selectedOverwriteId}
                        onChange={() => setSelectedOverwriteId('')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold">Create as a new saved timetable entry</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="saveAction"
                        checked={Boolean(selectedOverwriteId)}
                        onChange={() => setSelectedOverwriteId(savedTimetables[0]?.id || '')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold">Overwrite existing saved schedule:</span>
                    </label>

                    {selectedOverwriteId !== '' && (
                      <select
                        value={selectedOverwriteId}
                        onChange={(e) => setSelectedOverwriteId(e.target.value)}
                        className="mt-1 h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50 outline-none focus:border-indigo-600"
                      >
                        {savedTimetables.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({new Date(s.savedAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{selectedOverwriteId ? 'Overwrite & Save' : 'Save Timetable'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: RETRIEVE SAVED TIMETABLE */}
          {activeTab === 'retrieve' && (
            <div className="flex flex-col gap-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search saved timetables by title, date, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Recent Auto-Saved Session Card */}
              {latestAutoSaveSession && onRestoreAutoSave && !searchQuery.trim() && (
                <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/50 rounded-xl border border-indigo-200 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-indigo-950">Active Auto-Saved Snapshot</span>
                        <span className="text-[0.62rem] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Continuous 60s Recovery
                        </span>
                      </div>
                      <div className="text-[0.68rem] text-slate-600 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        <span>{new Date(latestAutoSaveSession.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(latestAutoSaveSession.savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{latestAutoSaveSession.summary?.classCount || latestAutoSaveSession.state?.classes?.length || 0} classes</span>
                        <span>•</span>
                        <span>{latestAutoSaveSession.summary?.teacherCount || latestAutoSaveSession.state?.teachers?.length || 0} faculty</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onRestoreAutoSave();
                      onClose();
                    }}
                    className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs cursor-pointer shrink-0 transition-all"
                  >
                    <span>Restore</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Saved list */}
              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                {savedTimetables.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="text-xs font-bold text-slate-700">No Saved Timetables Found</div>
                    <p className="text-[0.72rem] text-slate-500 mt-1 max-w-[280px] mx-auto">
                      Switch to the <strong>"Save Timetable"</strong> tab to save your current schedule layout for future retrieval.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('save')}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Current Timetable Now</span>
                    </button>
                  </div>
                ) : filteredSaves.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
                    No saved schedules match "{searchQuery}".
                  </div>
                ) : (
                  filteredSaves.map((s) => {
                    const date = new Date(s.savedAt);
                    const dateStr =
                      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
                      ' at ' +
                      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    const clsCount = s.state.classes?.filter((c) => c.name?.trim()).length || 0;
                    const tchCount = s.state.teachers?.length || 0;
                    const pCount = s.settings?.nperiods || 8;
                    const isGenerated = Boolean(s.state.tt && Object.keys(s.state.tt).length > 0);

                    return (
                      <div
                        key={s.id}
                        className="p-3.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl shadow-2xs flex flex-col gap-2.5 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {s.name}
                              </h4>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[0.62rem] font-extrabold ${
                                  isGenerated
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {isGenerated ? '✓ Timetable Ready' : 'Draft Config'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 text-[0.68rem] text-slate-500 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                {dateStr}
                              </span>
                              <span>•</span>
                              <span>{clsCount} Classes</span>
                              <span>•</span>
                              <span>{tchCount} Faculty</span>
                              <span>•</span>
                              <span>{pCount} Periods/Day</span>
                            </div>

                            {s.notes && (
                              <p className="text-[0.7rem] text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1.5 line-clamp-2">
                                "{s.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {onExportSavedItemJSON && (
                              <button
                                type="button"
                                onClick={() => onExportSavedItemJSON(s)}
                                className="h-7 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold text-[0.68rem] flex items-center gap-1 cursor-pointer transition-colors"
                                title="Download .json backup file of this saved timetable"
                              >
                                <Download className="w-3 h-3 text-slate-500" />
                                <span>Export JSON</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteTimetable(s.id, s.name)}
                              className="h-7 px-2 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 text-slate-400 hover:text-rose-600 font-semibold text-[0.68rem] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Delete saved item"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onLoadTimetable(s.id);
                              onClose();
                            }}
                            className="h-7 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all ml-auto"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Retrieve & Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick tip */}
              <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[0.7rem] text-indigo-900 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Retrieving a saved timetable restores all classes, faculty assignments, breaks, and generated matrices.</span>
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: RETRIEVE FROM FILE (IMPORT) */}
          {activeTab === 'import' && (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-800">
                  Click to select or drag & drop a .JSON Timetable file
                </h4>
                <p className="text-[0.72rem] text-slate-500 mt-1 max-w-[320px]">
                  Retrieve an exported SchoolGrid JSON backup file from your computer to restore its complete timetable setup.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                >
                  Browse Files
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 text-[0.75rem]">Compatible formats</div>
                  <div className="text-[0.7rem] text-slate-500 mt-0.5">
                    Supports JSON files created using SchoolGrid's "Export JSON" feature. Restores all classes, faculty directories, break configurations, and generated timetables.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
