import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  School as SchoolIcon,
  UserPlus,
  Ban,
  CheckCircle2,
  Search,
  Trash2,
  RefreshCw,
  UserCog,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  Building2,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';
import {
  subscribeToSchools,
  subscribeToSchoolAdmins,
  addSchoolWithAdmin,
  blockSchoolAdmin,
  unblockSchoolAdmin,
  reassignSchoolAdmin,
  deleteSchoolAndAdmin,
} from '../services/schoolAdminService';
import { School, SchoolAdmin } from '../types';
import { SUPERUSER_EMAIL } from '../lib/firebase';

interface SuperuserConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperuser: boolean;
  onToast?: (msg: string) => void;
}

export const SuperuserConsoleModal: React.FC<SuperuserConsoleModalProps> = ({
  isOpen,
  onClose,
  isSuperuser,
  onToast,
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Add School + 1 Admin form
  const [showAddForm, setShowAddForm] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [city, setCity] = useState('');
  const [academicYear, setAcademicYear] = useState('2026–2027');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [adminRole, setAdminRole] = useState<'Principal' | 'Administrator'>('Principal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // One-time issued credentials banner (held in memory only, never persisted to Firestore)
  const [issuedCredentials, setIssuedCredentials] = useState<{
    schoolName: string;
    email: string;
    password?: string;
    status: 'created' | 'already-exists' | 'google-only';
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

  // Row inline states (Block prompt, Reassign admin, Delete confirmation)
  const [blockingSchoolId, setBlockingSchoolId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [reassignSchoolId, setReassignSchoolId] = useState<string | null>(null);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showReassignPassword, setShowReassignPassword] = useState(false);
  const [newAdminRole, setNewAdminRole] = useState<'Principal' | 'Administrator'>('Principal');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isSuperuser) return;

    setLoading(true);
    setErrorMsg(null);

    const unsubSchools = subscribeToSchools(
      (list) => {
        setSchools(list);
        setLoading(false);
      },
      (err) => {
        setErrorMsg(err.message || 'Could not load schools list.');
        setLoading(false);
      }
    );

    const unsubAdmins = subscribeToSchoolAdmins(
      (list) => {
        setAdmins(list);
      },
      (err) => {
        console.warn('school_admins subscription note:', err);
      }
    );

    return () => {
      unsubSchools();
      unsubAdmins();
    };
  }, [isOpen, isSuperuser]);

  const adminMap = useMemo(() => {
    const map = new Map<string, SchoolAdmin>();
    for (const a of admins) {
      map.set(a.email.toLowerCase(), a);
    }
    return map;
  }, [admins]);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schools.filter((s) => {
      const liveAdmin = adminMap.get(s.adminEmail.toLowerCase());
      const effectiveStatus = liveAdmin?.status || s.adminStatus;
      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        s.adminName.toLowerCase().includes(q) ||
        s.adminEmail.toLowerCase().includes(q)
      );
    });
  }, [schools, adminMap, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    let activeCount = 0;
    let blockedCount = 0;
    for (const s of schools) {
      const liveAdmin = adminMap.get(s.adminEmail.toLowerCase());
      const st = liveAdmin?.status || s.adminStatus;
      if (st === 'blocked') blockedCount++;
      else activeCount++;
    }
    return { total: schools.length, active: activeCount, blocked: blockedCount };
  }, [schools, adminMap]);

  if (!isOpen || !isSuperuser) return null;

  const notify = (msg: string) => {
    setStatusMsg(msg);
    onToast?.(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleCopyCredentials = async () => {
    if (!issuedCredentials) return;
    const lines = [
      `SchoolGrid Portal Access`,
      `School: ${issuedCredentials.schoolName}`,
      `Login ID: ${issuedCredentials.email}`,
    ];
    if (issuedCredentials.password && issuedCredentials.status === 'created') {
      lines.push(`Password: ${issuedCredentials.password}`);
    } else if (issuedCredentials.status === 'already-exists') {
      lines.push(`Sign-In: Existing password or Google Sign-In`);
    } else {
      lines.push(`Sign-In: Google Sign-In`);
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2500);
    } catch {
      notify('Copy failed — please copy credentials manually.');
    }
  };

  const handleAddSchoolAndAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setIssuedCredentials(null);
    setIsSubmitting(true);

    const trimmedEmail = adminEmail.trim().toLowerCase();
    const trimmedSchool = schoolName.trim();
    const trimmedPass = adminPassword.trim();

    try {
      const res = await addSchoolWithAdmin({
        name: schoolName,
        code: schoolCode,
        city,
        academicYear,
        adminName,
        adminEmail,
        adminPassword: trimmedPass || undefined,
        adminRole,
      });
      notify(`✓ Added "${trimmedSchool}" with admin ${res.adminEmail}`);
      setIssuedCredentials({
        schoolName: trimmedSchool,
        email: res.adminEmail,
        password: trimmedPass || undefined,
        status: res.authProvisionStatus,
      });
      setCopiedCreds(false);
      setSchoolName('');
      setSchoolCode('');
      setCity('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminRole('Principal');
    } catch (err: any) {
      let msg = err?.message || 'Failed to add school and admin.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = parsed.error;
      } catch {
        // plain error message
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBlock = async (school: School) => {
    setBusyRowId(school.id);
    setErrorMsg(null);
    try {
      await blockSchoolAdmin(school.id, school.adminEmail, blockReason || 'Blocked by Superuser');
      notify(`🚫 Blocked admin ${school.adminEmail} (${school.name})`);
      setBlockingSchoolId(null);
      setBlockReason('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to block admin.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleUnblock = async (school: School) => {
    setBusyRowId(school.id);
    setErrorMsg(null);
    try {
      await unblockSchoolAdmin(school.id, school.adminEmail);
      notify(`✓ Unblocked admin ${school.adminEmail} (${school.name})`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to unblock admin.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleConfirmReassign = async (school: School) => {
    setBusyRowId(school.id);
    setErrorMsg(null);
    setIssuedCredentials(null);
    const trimmedEmail = newAdminEmail.trim().toLowerCase();
    const trimmedPass = newAdminPassword.trim();
    try {
      const res = await reassignSchoolAdmin({
        school,
        newAdminName,
        newAdminEmail,
        newAdminPassword: trimmedPass || undefined,
        newAdminRole,
      });
      notify(`✓ Assigned ${trimmedEmail} as sole admin for "${school.name}"`);
      setIssuedCredentials({
        schoolName: school.name,
        email: trimmedEmail,
        password: trimmedPass || undefined,
        status: res.authProvisionStatus,
      });
      setCopiedCreds(false);
      setReassignSchoolId(null);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (err: any) {
      let msg = err?.message || 'Failed to reassign admin.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = parsed.error;
      } catch {
        // plain message
      }
      setErrorMsg(msg);
    } finally {
      setBusyRowId(null);
    }
  };

  const handleConfirmDelete = async (school: School) => {
    setBusyRowId(school.id);
    setErrorMsg(null);
    try {
      await deleteSchoolAndAdmin(school.id, school.adminEmail);
      notify(`🗑 Removed school "${school.name}" and its admin assignment`);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete school.');
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[900] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shrink-0 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[0.68rem] font-black text-amber-300 uppercase tracking-wider mb-1.5">
              <Crown className="w-3 h-3" /> Superuser Governance Console
            </div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>Schools &amp; Single-Admin Access Control</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Signed in as <strong className="text-white">{SUPERUSER_EMAIL}</strong> — 1 admin permitted per school; block or restore any admin in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close Superuser Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col gap-5 text-slate-900">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                  Registered Schools
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-700">
                  Active Admins
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">{stats.active}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-rose-200 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[0.68rem] font-bold uppercase tracking-wider text-rose-700">
                  Blocked Admins
                </div>
                <div className="text-2xl font-black text-rose-700 mt-0.5">{stats.blocked}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldOff className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Inline Banners */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {issuedCredentials && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <KeyRound className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs min-w-0">
                  <div className="font-black text-indigo-950">
                    Issued Admin Credentials — {issuedCredentials.schoolName}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem]">
                    <span>
                      Login ID: <strong className="font-mono text-indigo-800">{issuedCredentials.email}</strong>
                    </span>
                    {issuedCredentials.status === 'created' && issuedCredentials.password ? (
                      <span>
                        Password: <strong className="font-mono text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">{issuedCredentials.password}</strong>
                      </span>
                    ) : issuedCredentials.status === 'already-exists' ? (
                      <span className="text-amber-800 font-semibold">
                        Account already exists in Firebase Auth — admin keeps their existing password or Google Sign-In.
                      </span>
                    ) : (
                      <span className="text-slate-600 font-semibold">
                        Google Sign-In enabled (no password issued).
                      </span>
                    )}
                  </div>
                  {issuedCredentials.status === 'created' && (
                    <div className="text-[0.66rem] text-indigo-700 mt-1">
                      Save or copy these credentials now — passwords are never stored in the database.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCreds ? 'Copied' : 'Copy Credentials'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIssuedCredentials(null)}
                  className="h-8 px-2.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Add School + Designated Admin Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Add New School &amp; Assign 1 Admin
                </span>
              </div>
              <span className="text-[0.68rem] font-bold text-indigo-600">
                {showAddForm ? 'Hide Form' : 'Expand Form'}
              </span>
            </button>

            {showAddForm && (
              <form onSubmit={handleAddSchoolAndAdmin} className="p-4 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      School Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. Oakridge Public School"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      School Code
                    </label>
                    <input
                      type="text"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value)}
                      placeholder="e.g. OPS-101"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      City / Campus
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Pune"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Admin Login ID (Email) *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@school.edu"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Initial Password (Optional)
                    </label>
                    <div className="flex items-center gap-1">
                      <div className="relative flex-1">
                        <input
                          type={showAddPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Min 6 chars or Google"
                          className="w-full h-9 pl-2.5 pr-8 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddPassword(!showAddPassword)}
                          className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title={showAddPassword ? 'Hide password' : 'Show password'}
                        >
                          {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminPassword(generateStrongPassword());
                          setShowAddPassword(true);
                        }}
                        className="h-9 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[0.68rem] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        title="Generate random password"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Gen</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Admin Role
                    </label>
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value as 'Principal' | 'Administrator')}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    >
                      <option value="Principal">Principal</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2026–2027"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <span className="text-[0.7rem] text-slate-500">
                    Each school has strictly <strong>1 admin</strong>. Provide a password for Login ID sign-in, or leave blank for Google Sign-In only.
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{isSubmitting ? 'Registering...' : 'Add School & Admin'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Registered Schools & Admins List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search school name, code, city, or admin email..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-600 bg-white"
                />
              </div>

              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {(['all', 'active', 'blocked'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 rounded-md text-[0.7rem] font-bold capitalize cursor-pointer transition-colors ${
                      statusFilter === tab
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading schools &amp; admin directory...</span>
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="p-10 text-center">
                <SchoolIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-700">No matching schools found</div>
                <p className="text-xs text-slate-500 mt-1">
                  {schools.length === 0
                    ? 'Add your first school and assign its designated administrator above.'
                    : 'Adjust your search or status filter to view schools.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredSchools.map((school) => {
                  const liveAdmin = adminMap.get(school.adminEmail.toLowerCase());
                  const status = liveAdmin?.status || school.adminStatus;
                  const reason = liveAdmin?.blockedReason || school.blockedReason;
                  const isRowBlocked = status === 'blocked';
                  const isBusy = busyRowId === school.id;

                  return (
                    <div key={school.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/70 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900">{school.name}</span>
                            {school.code && (
                              <span className="text-[0.65rem] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {school.code}
                              </span>
                            )}
                            {school.city && (
                              <span className="text-[0.68rem] text-slate-500">· {school.city}</span>
                            )}
                            <span
                              className={`text-[0.65rem] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                isRowBlocked
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {isRowBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              Admin: <strong className="text-slate-900">{school.adminName}</strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="font-mono text-[0.72rem] text-indigo-700">{school.adminEmail}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[0.7rem] font-semibold text-slate-500">
                              {school.adminRole || liveAdmin?.role || 'Principal'}
                            </span>
                          </div>

                          {isRowBlocked && reason && (
                            <div className="mt-1.5 text-[0.7rem] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 inline-block">
                              Blocked reason: {reason}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {isRowBlocked ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUnblock(school)}
                              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unblock Admin</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setBlockingSchoolId(blockingSchoolId === school.id ? null : school.id);
                                setBlockReason('');
                                setReassignSchoolId(null);
                                setConfirmDeleteId(null);
                              }}
                              className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Block Admin</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (reassignSchoolId === school.id) {
                                setReassignSchoolId(null);
                              } else {
                                setReassignSchoolId(school.id);
                                setNewAdminName(school.adminName);
                                setNewAdminEmail(school.adminEmail);
                                setNewAdminPassword('');
                                setShowReassignPassword(false);
                                setNewAdminRole((school.adminRole as 'Principal' | 'Administrator') || 'Principal');
                                setBlockingSchoolId(null);
                                setConfirmDeleteId(null);
                              }
                            }}
                            className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCog className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Reassign</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirmDeleteId(confirmDeleteId === school.id ? null : school.id);
                              setBlockingSchoolId(null);
                              setReassignSchoolId(null);
                            }}
                            className="h-8 px-2.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Delete school and admin entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Block Confirmation */}
                      {blockingSchoolId === school.id && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Optional block reason (e.g. Policy violation / Term ended)"
                            className="flex-1 h-8 px-3 rounded-lg border border-rose-300 bg-white text-xs outline-none focus:border-rose-600"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmBlock(school)}
                              className="h-8 px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? 'Blocking...' : 'Confirm Block'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBlockingSchoolId(null)}
                              className="h-8 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Reassign Form */}
                      {reassignSchoolId === school.id && (
                        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
                          <input
                            type="text"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder="New Admin Name"
                            className="h-8 px-2.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold outline-none focus:border-indigo-600"
                          />
                          <input
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            placeholder="New Admin Login ID (Email)"
                            className="h-8 px-2.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold outline-none focus:border-indigo-600"
                          />
                          <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                              <input
                                type={showReassignPassword ? 'text' : 'password'}
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                placeholder="Password (optional)"
                                className="w-full h-8 pl-2.5 pr-7 rounded-lg border border-indigo-200 bg-white text-xs font-semibold outline-none focus:border-indigo-600"
                              />
                              <button
                                type="button"
                                onClick={() => setShowReassignPassword(!showReassignPassword)}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title={showReassignPassword ? 'Hide password' : 'Show password'}
                              >
                                {showReassignPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewAdminPassword(generateStrongPassword());
                                setShowReassignPassword(true);
                              }}
                              className="h-8 px-2 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[0.68rem] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              title="Generate random password"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Gen</span>
                            </button>
                          </div>
                          <select
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value as 'Principal' | 'Administrator')}
                            className="h-8 px-2 rounded-lg border border-indigo-200 bg-white text-xs font-semibold outline-none focus:border-indigo-600"
                          >
                            <option value="Principal">Principal</option>
                            <option value="Administrator">Administrator</option>
                          </select>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmReassign(school)}
                              className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex-1 disabled:opacity-50"
                            >
                              {isBusy ? 'Saving...' : 'Save Admin'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReassignSchoolId(null)}
                              className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Delete Confirmation */}
                      {confirmDeleteId === school.id && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-rose-900">
                            Remove &ldquo;{school.name}&rdquo; and revoke admin assignment for {school.adminEmail}?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmDelete(school)}
                              className="h-8 px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-8 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
