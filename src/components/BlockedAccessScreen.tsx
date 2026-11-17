import React from 'react';
import { ShieldOff, LogOut, School, Mail, Clock, AlertOctagon } from 'lucide-react';
import { BlockedDetails } from '../context/AuthContext';

interface BlockedAccessScreenProps {
  blockedDetails: BlockedDetails | null;
  userEmail?: string;
  onLogout: () => Promise<void>;
}

export const BlockedAccessScreen: React.FC<BlockedAccessScreenProps> = ({
  blockedDetails,
  userEmail,
  onLogout,
}) => {
  const email = blockedDetails?.email || userEmail || 'Unknown account';
  const schoolName = blockedDetails?.schoolName || 'Assigned School';
  const reason = blockedDetails?.reason || 'Your administrator access has been suspended by the Superuser.';
  const blockedAt = blockedDetails?.blockedAt
    ? new Date(blockedDetails.blockedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 p-6 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-300/40 flex items-center justify-center mx-auto mb-3">
            <ShieldOff className="w-7 h-7 text-rose-200" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Administrator Access Blocked</h1>
          <p className="text-xs text-rose-100/90 mt-1">
            This account has been blocked by the System Superuser
          </p>
        </div>

        <div className="p-6 flex flex-col gap-3.5 text-slate-900">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-[0.68rem] font-bold uppercase tracking-wider text-rose-700">
                Block Reason
              </div>
              <div className="text-xs font-semibold text-rose-950 mt-0.5">{reason}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500">Account:</span>
              <strong className="text-slate-900 truncate">{email}</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500">School:</span>
              <strong className="text-slate-900 truncate">{schoolName}</strong>
            </div>
            {blockedAt && (
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500">Blocked At:</span>
                <strong className="text-slate-900">{blockedAt}</strong>
              </div>
            )}
          </div>

          <p className="text-[0.72rem] text-slate-500 text-center leading-relaxed">
            Contact the Superuser if you believe this block was applied in error. You can sign out below to switch accounts.
          </p>

          <button
            type="button"
            onClick={onLogout}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
