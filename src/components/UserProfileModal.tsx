import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEFAULT_PRINCIPAL_AVATARS } from '../context/AuthContext';
import { UserProfile } from '../types';
import {
  User,
  School,
  Mail,
  Phone,
  Calendar,
  Lock,
  Check,
  ShieldCheck,
  LogOut,
  Save,
  Building,
  KeyRound,
  FileText,
  BadgeAlert,
  Camera,
  Upload,
  Sparkles,
  AtSign,
  Briefcase,
  GraduationCap,
  Clock,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCount: number;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, savedCount }) => {
  const { user, isSuperuser, updateProfile, changePassword, uploadAvatarImage, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'institution' | 'security'>('profile');

  // Form states initialized from active user
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [role, setRole] = useState<UserProfile['role']>('Principal');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [bio, setBio] = useState('');
  const [academicYear, setAcademicYear] = useState('2026–2027');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Upload & UI status
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Security tab states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate state whenever modal opens or user updates
  useEffect(() => {
    if (user) {
      setUsername(user.username || user.email.split('@')[0] || 'principal_admin');
      setName(user.name || '');
      setInstitutionName(user.institutionName || 'St. Jude International Academy');
      setRole(user.role || 'Principal');
      setDepartment(user.department || 'School Leadership & Curriculum Administration');
      setPhoneNumber(user.phoneNumber || '+1 (555) 234-8901');
      setOfficeHours(user.officeHours || 'Mon–Fri 08:00 AM – 04:30 PM (Executive Office 204)');
      setQualifications(user.qualifications || 'Ph.D. in Educational Leadership, M.Ed. Curriculum & Instruction');
      setBio(user.bio || 'Principal leading academic scheduling, faculty assignments, and school operations.');
      setAcademicYear(user.academicYear || '2026–2027');
      setAvatarUrl(user.avatarUrl || DEFAULT_PRINCIPAL_AVATARS[0]);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle local image file upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const res = await uploadAvatarImage(file);
      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        setSaveStatus({ success: true, message: 'New photo selected! Click "Save Profile" to commit to Firebase.' });
      } else {
        setUploadError(res.error || 'Failed to process image file.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading profile image.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle saving profile changes to Firebase Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setUploadError(null);

    // Validate username
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    if (!cleanUsername) {
      setSaveStatus({ success: false, message: 'Please provide a valid username.' });
      setIsSaving(false);
      return;
    }

    const res = await updateProfile({
      username: cleanUsername,
      name: name.trim(),
      institutionName: institutionName.trim(),
      role,
      department: department.trim(),
      phoneNumber: phoneNumber.trim(),
      officeHours: officeHours.trim(),
      qualifications: qualifications.trim(),
      bio: bio.trim(),
      academicYear: academicYear.trim(),
      avatarUrl,
    });

    setIsSaving(false);

    if (res.success) {
      setSaveStatus({ success: true, message: 'Principal profile saved successfully to Firebase Firestore!' });
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus({ success: false, message: res.error || 'Failed to update profile.' });
    }
  };

  // Handle password update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ success: false, message: 'New passwords do not match.' });
      return;
    }

    const res = await changePassword(oldPassword, newPassword);
    if (res.success) {
      setPasswordStatus({ success: true, message: 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordStatus({ success: false, message: res.error || 'Failed to update password.' });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[850] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[720px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Principal Hero Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative shrink-0 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
            title="Close modal"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar with Camera Overlay */}
            <div className="relative group self-start sm:self-center shrink-0">
              <img
                src={avatarUrl || DEFAULT_PRINCIPAL_AVATARS[0]}
                alt={user.name}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-500/80 shadow-xl ring-4 ring-indigo-500/20"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                title="Click to upload profile photo"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[0.65rem] font-bold">Upload</span>
              </button>
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-white"
                title="Cloud Synced"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            {/* Profile Summary Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.68rem] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  {user.role === 'Principal' ? 'School Principal' : user.role}
                </span>
                <span className="text-[0.68rem] text-slate-300 flex items-center gap-1 font-mono">
                  <AtSign className="w-3 h-3 text-indigo-400" />
                  {user.username || 'principal_admin'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1 truncate">
                {user.name}
              </h2>

              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5 truncate">
                <School className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{user.institutionName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{user.academicYear}</span>
              </p>

              <div className="flex items-center gap-3 mt-2 text-[0.7rem] text-slate-400">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Firebase Firestore</span>
                </span>
                <span>•</span>
                <span>{savedCount} Saved Schedules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile &amp; Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('institution')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'institution'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>School &amp; Administration</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security &amp; Account</span>
          </button>
        </div>

        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-900 bg-white">
          {/* Status Alert Banner */}
          {saveStatus && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
                saveStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {saveStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}

          {uploadError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* TAB 1: Profile & Identity */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              {/* Profile Picture Upload & Presets Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600">
                    Profile Picture (Avatar)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? 'Processing image...' : 'Upload Image from Computer'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
                  {/* Current Active or Uploaded Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={avatarUrl}
                      alt="Selected Profile"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-600 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  </div>

                  <div className="h-8 w-[1px] bg-slate-200 mx-1 shrink-0" />

                  {/* Preset Principal Avatars */}
                  {DEFAULT_PRINCIPAL_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`relative rounded-xl p-0.5 transition-all shrink-0 cursor-pointer ${
                        avatarUrl === url
                          ? 'ring-2 ring-indigo-600 scale-105 opacity-100'
                          : 'opacity-60 hover:opacity-100 hover:ring-1 hover:ring-slate-300'
                      }`}
                      title={`Select preset avatar ${i + 1}`}
                    >
                      <img
                        src={url}
                        alt={`Preset ${i + 1}`}
                        className="w-10 h-10 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Username & Full Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Username / Handle
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. principal_evelyn"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 bg-white"
                    />
                  </div>
                  <span className="text-[0.65rem] text-slate-500 mt-0.5 block">
                    Unique identifier for your Principal administrative profile.
                  </span>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name &amp; Title
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Evelyn Martinez"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Account Email (Verified)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-500 bg-slate-50 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Office Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="+1 (555) 234-8901"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Qualifications & Office Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Academic Qualifications
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Ph.D. in Educational Leadership"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Office Hours &amp; Room
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Mon–Fri 08:00 AM – 04:30 PM (Office 204)"
                      value={officeHours}
                      onChange={(e) => setOfficeHours(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Administrative Bio */}
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Principal’s Bio &amp; Institutional Vision
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Notes regarding curriculum planning, faculty workload, and scheduling guidelines..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 resize-none bg-white font-normal"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-[0.7rem] text-slate-400 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Saves directly to Firebase Firestore</span>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving to Firebase...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: School & Administration */}
          {activeTab === 'institution' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  School / Institution Name
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="St. Jude International Academy"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Administrative Role
                  </label>
                  <select
                    value={role}
                    disabled={isSuperuser}
                    onChange={(e) => setRole(e.target.value as UserProfile['role'])}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 bg-white disabled:bg-slate-50 disabled:text-slate-600"
                  >
                    {isSuperuser && <option value="Superuser">Superuser (Global Owner)</option>}
                    <option value="Principal">Principal / Head of School</option>
                    <option value="Academic Dean">Academic Dean / Coordinator</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="Teacher">Teacher / Faculty</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Current Academic Year
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2026–2027"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Department / Administrative Division
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="School Leadership & Curriculum Administration"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 bg-white"
                  />
                </div>
              </div>

              {/* Timetable & Cloud Quota Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Timetable Cloud Database Quota</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[0.7rem]">Active Schedules</span>
                    <strong className="text-sm text-indigo-600 font-black">{savedCount}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[0.7rem]">Database Type</span>
                    <strong className="text-sm text-slate-900 font-bold">Cloud Firestore</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[0.7rem]">Sync Status</span>
                    <strong className="text-sm text-emerald-600 font-bold">✓ Connected</strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save School Details</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Security & Account */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-4">
              {/* Account Meta Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Principal Account Credentials</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500">Firebase User ID:</span>
                    <div className="font-mono text-slate-800 text-[0.7rem] truncate bg-white p-1.5 rounded border border-slate-200 mt-0.5">
                      {user.uid || user.id}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Account Created:</span>
                    <div className="text-slate-800 text-xs font-semibold bg-white p-1.5 rounded border border-slate-200 mt-0.5">
                      {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Password update form */}
              <form onSubmit={handleChangePassword} className="flex flex-col gap-3.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Update Account Password
                </h4>

                {passwordStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      passwordStatus.success
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {passwordStatus.success ? <Check className="w-4 h-4" /> : <BadgeAlert className="w-4 h-4" />}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all self-end px-5 cursor-pointer mt-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
