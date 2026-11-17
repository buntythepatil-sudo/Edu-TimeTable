import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FolderOpen,
  Save,
  Download,
  Upload,
  User as UserIcon,
  LogOut,
  Sparkles,
  School,
  Settings,
  ShieldCheck,
  Calendar,
  Grid
} from 'lucide-react';
import { SavedTimetable, AutoSaveSession } from '../types';
import { AutoSaveIndicator, AutoSaveStatus } from './AutoSaveIndicator';

interface HeaderProps {
  onOpenSave: () => void;
  onOpenRetrieve: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  savedCount: number;
  savedTimetables: SavedTimetable[];
  onLoadTimetable: (id: string) => void;
  onDeleteTimetable: (id: string, name: string) => void;
  autoSaveStatus: AutoSaveStatus;
  lastAutoSavedAt: string | null;
  isAutoSaveEnabled: boolean;
  onToggleAutoSave: (enabled: boolean) => void;
  onTriggerManualAutoSave: () => void;
  onRestoreAutoSave?: () => void;
  latestAutoSaveSession: AutoSaveSession | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSave,
  onOpenRetrieve,
  onExportJSON,
  onImportJSON,
  onOpenProfile,
  onOpenAuth,
  savedCount,
  savedTimetables,
  onLoadTimetable,
  onDeleteTimetable,
  autoSaveStatus,
  lastAutoSavedAt,
  isAutoSaveEnabled,
  onToggleAutoSave,
  onTriggerManualAutoSave,
  onRestoreAutoSave,
  latestAutoSaveSession,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header id="app-header" className="bg-slate-900 text-white h-[54px] flex items-center justify-between px-4 sm:px-6 shrink-0 border-b border-slate-800 z-30 relative select-none shadow-sm print:hidden">
      {/* Brand logo & School Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-sm border border-indigo-500">
            <Grid className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[1.05rem] font-extrabold tracking-tight leading-none text-white flex items-center gap-1.5">
              School<span className="text-indigo-400 font-extrabold">Grid</span>
              <span className="text-[0.65rem] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 ml-1">
                v2.6 Pro
              </span>
            </h1>
            <p className="text-[0.7rem] text-slate-400 font-medium leading-none mt-0.5 flex items-center gap-1">
              <School className="w-3 h-3 inline text-indigo-400" />
              {user ? user.institutionName : 'St. Jude International Academy'}
            </p>
          </div>
        </div>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Auto-Save Indicator */}
        <AutoSaveIndicator
          status={autoSaveStatus}
          lastSavedAt={lastAutoSavedAt}
          isAutoSaveEnabled={isAutoSaveEnabled}
          onToggleAutoSave={onToggleAutoSave}
          onTriggerManualAutoSave={onTriggerManualAutoSave}
          onRestoreAutoSave={onRestoreAutoSave}
          latestSession={latestAutoSaveSession}
          isAuthenticated={isAuthenticated}
        />

        {/* Save button */}
        <button
          id="header-save-btn"
          onClick={onOpenSave}
          className="h-[34px] px-3 sm:px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all font-bold text-xs sm:text-[0.82rem] flex items-center gap-1.5 shadow-sm cursor-pointer"
          title="Save current timetable configuration and generated grid"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        {/* Retrieve dropdown & button */}
        <div className="relative">
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
            <button
              id="header-retrieve-btn"
              onClick={onOpenRetrieve}
              className="h-[34px] px-2.5 sm:px-3 text-slate-200 hover:bg-slate-700 hover:text-white transition-all font-semibold text-xs sm:text-[0.82rem] flex items-center gap-1.5 cursor-pointer"
              title="Retrieve and restore saved timetables"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Retrieve</span>
              {savedCount > 0 && (
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/60 rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setLoadMenuOpen(!loadMenuOpen)}
              className="h-[34px] px-1.5 text-slate-400 hover:text-white hover:bg-slate-700 border-l border-slate-700 transition-colors cursor-pointer text-xs"
              title="Quick list of saved timetables"
            >
              ▾
            </button>
          </div>

          {loadMenuOpen && (
            <div
              className="absolute top-[calc(100%+6px)] right-0 sm:left-0 bg-white border border-slate-200 rounded-xl shadow-xl w-[320px] max-h-[380px] overflow-y-auto z-50 p-2 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">Retrieve Timetable</span>
                <span className="text-[0.7rem] text-slate-500 font-medium">{savedTimetables.length} saved</span>
              </div>
              {savedTimetables.length === 0 ? (
                <div className="p-5 text-center text-slate-500 text-xs">
                  No saved timetables yet.<br />
                  Click <strong>💾 Save</strong> to store one.
                </div>
              ) : (
                savedTimetables.map((s) => {
                  const date = new Date(s.savedAt);
                  const dateStr =
                    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
                    ' · ' +
                    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const clsCount = s.state.classes?.filter((c) => c.name?.trim()).length || 0;
                  const teacherCount = s.state.teachers?.length || 0;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        onLoadTimetable(s.id);
                        setLoadMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-50/60 cursor-pointer transition-colors group border border-transparent hover:border-indigo-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600">
                          {s.name}
                        </div>
                        <div className="text-[0.68rem] text-slate-500 mt-0.5">
                          {clsCount} class{clsCount !== 1 ? 'es' : ''} · {teacherCount} teacher{teacherCount !== 1 ? 's' : ''} · {dateStr}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTimetable(s.id, s.name);
                        }}
                        className="w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center text-sm transition-colors"
                        title="Delete saved item"
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}

              <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setLoadMenuOpen(false);
                    onOpenRetrieve();
                  }}
                  className="w-full text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 text-[0.72rem] font-bold transition-colors cursor-pointer"
                >
                  Manage All Saved & Backups...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export / Import buttons */}
        <button
          onClick={onExportJSON}
          className="hidden md:inline-flex h-[34px] px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all font-semibold text-[0.8rem] items-center gap-1 cursor-pointer"
          title="Export as backup .json file"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="hidden md:inline-flex h-[34px] px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all font-semibold text-[0.8rem] items-center gap-1 cursor-pointer"
          title="Import a previously exported .json timetable"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onImportJSON}
        />

        <div className="w-[1px] h-6 bg-slate-800 mx-0.5 hidden sm:block" />

        {/* User Account / Profile Widget */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 h-[36px] pl-1.5 pr-2.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-600"
                referrerPolicy="no-referrer"
              />
              <span className="text-xs font-bold text-slate-200 max-w-[100px] truncate hidden sm:inline">
                {user.name.split(' ')[0]}
              </span>
              <span className="text-[0.65rem] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full font-bold uppercase hidden md:inline">
                {user.role}
              </span>
            </button>

            {userDropdownOpen && (
              <div
                className="absolute top-[calc(100%+6px)] right-0 bg-white border border-slate-200 rounded-xl shadow-xl w-[260px] p-2 z-50 text-slate-900"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="p-2.5 bg-slate-50 rounded-lg mb-2 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-slate-900 truncate">{user.name}</div>
                    <span className="text-[0.65rem] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded border border-indigo-200 uppercase">
                      {user.role}
                    </span>
                  </div>
                  <div className="text-[0.68rem] text-indigo-600 font-mono font-medium">@{user.username || 'principal'}</div>
                  <div className="text-[0.7rem] text-slate-500 truncate mt-0.5">{user.email}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[0.65rem] text-slate-600 font-medium truncate">
                      🏫 {user.institutionName}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onOpenProfile}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  <span>Profile &amp; Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    onOpenProfile();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Security &amp; Password</span>
                </button>

                <div className="h-[1px] bg-slate-100 my-1" />

                <button
                  onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="h-[34px] px-3.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
