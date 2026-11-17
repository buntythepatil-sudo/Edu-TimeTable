import React, { useState, useRef, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sliders,
  Database,
  HardDrive,
  AlertCircle,
  Sparkles,
  History,
  RotateCcw,
} from 'lucide-react';
import { AutoSaveSession } from '../types';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'disabled';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  isAutoSaveEnabled: boolean;
  onToggleAutoSave: (enabled: boolean) => void;
  onTriggerManualAutoSave: () => void;
  onRestoreAutoSave?: () => void;
  latestSession: AutoSaveSession | null;
  isAuthenticated: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSavedAt,
  isAutoSaveEnabled,
  onToggleAutoSave,
  onTriggerManualAutoSave,
  onRestoreAutoSave,
  latestSession,
  isAuthenticated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format last saved time
  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Not saved yet';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Trigger Pill */}
      <button
        type="button"
        id="autosave-status-pill"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[34px] px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
          !isAutoSaveEnabled
            ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
            : status === 'saving'
            ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-200'
            : status === 'error'
            ? 'bg-rose-950/70 border-rose-600/50 text-rose-200'
            : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white'
        }`}
        title={`Auto-save ${isAutoSaveEnabled ? 'active (every 60s)' : 'paused'}. Click to configure or save immediately.`}
      >
        {/* Status Dot / Spinner Icon */}
        {!isAutoSaveEnabled ? (
          <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
        ) : status === 'saving' ? (
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
        ) : status === 'error' ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}

        {/* Short Text */}
        <span className="hidden sm:inline text-[0.75rem] font-medium">
          {!isAutoSaveEnabled ? (
            'Auto-save Paused'
          ) : status === 'saving' ? (
            'Auto-saving...'
          ) : lastSavedAt ? (
            <>
              Auto-saved <span className="font-mono text-slate-400 font-normal">{formatTimeAgo(lastSavedAt)}</span>
            </>
          ) : (
            'Auto-save Active'
          )}
        </span>

        <span className="sm:hidden text-[0.7rem]">
          {!isAutoSaveEnabled ? 'Paused' : status === 'saving' ? 'Saving...' : 'Saved'}
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+6px)] right-0 sm:left-auto bg-white border border-slate-200 rounded-xl shadow-2xl w-[310px] p-3.5 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Auto-Save Protection</h4>
                <p className="text-[0.68rem] text-slate-500">Continuous 60s state persistence</p>
              </div>
            </div>
            <span
              className={`text-[0.65rem] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                isAutoSaveEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isAutoSaveEnabled ? 'Active' : 'Off'}
            </span>
          </div>

          {/* Toggle Setting */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">Auto-Save Every 60s</span>
              <span className="text-[0.65rem] text-slate-500">Prevents data loss during edits</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleAutoSave(!isAutoSaveEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAutoSaveEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={isAutoSaveEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAutoSaveEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Targets Breakdown */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[0.72rem] px-2 py-1 rounded bg-slate-50/60 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                <span>Browser LocalStorage</span>
              </span>
              <span className="font-bold text-emerald-600 text-[0.68rem] flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between text-[0.72rem] px-2 py-1 rounded bg-slate-50/60 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cloud Firestore</span>
              </span>
              <span
                className={`font-bold text-[0.68rem] flex items-center gap-0.5 ${
                  isAuthenticated ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {isAuthenticated ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Synced
                  </>
                ) : (
                  'Guest Mode'
                )}
              </span>
            </div>
          </div>

          {/* Last Save & Stats */}
          {lastSavedAt && (
            <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[0.7rem] text-slate-600 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Last auto-saved:</span>
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {formatTimeAgo(lastSavedAt)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                onTriggerManualAutoSave();
              }}
              disabled={status === 'saving'}
              className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} />
              <span>{status === 'saving' ? 'Saving Snapshot...' : 'Save Snapshot Now'}</span>
            </button>

            {latestSession && onRestoreAutoSave && (
              <button
                type="button"
                onClick={() => {
                  onRestoreAutoSave();
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restore Auto-Saved State</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
