import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Teacher,
  ClassEntry,
  ScheduleEntry,
  RecessPreferences,
  TimetableGrid,
  TimetableConflict,
  SavedTimetable,
  AutoSaveSession,
  SwapSuggestion,
  ConfigOptionTab,
} from './types';
import {
  generateTimetable,
  detectConflicts,
  autoResolveAllConflicts,
  applySwapSuggestion,
  massResolveClashesHeuristic,
  resolveClashesForTeacher,
  resolveClashesForSubject,
  removeTeacherAndAssignedPeriods,
  DAYS,
} from './utils/timetableGenerator';
import {
  persistAutoSave,
  getLatestAutoSave,
  computeStateFingerprint,
  getAutoSaveEnabledPreference,
  setAutoSaveEnabledPreference,
  AUTOSAVE_STORAGE_KEY,
  AUTOSAVE_INTERVAL_MS,
} from './utils/autoSaveService';
import { AutoSaveStatus } from './components/AutoSaveIndicator';
import { AutoSaveRestoreBanner } from './components/AutoSaveRestoreBanner';
import {
  Sliders,
  Eye,
  Users,
  Layers,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Download,
  Printer,
  BookOpen,
  FileSpreadsheet,
  Settings,
  FolderOpen,
  Save,
  CheckCircle2,
  BarChart3,
  Zap,
} from 'lucide-react';
import { exportTimetablePDF } from './utils/pdfExport';
import { Header } from './components/Header';
import { RibbonMenu, RibbonTabType } from './components/RibbonMenu';
import {
  saveTimetableOnline,
  fetchSavedTimetablesOnline,
  deleteTimetableOnline,
  subscribeToSavedTimetablesOnline,
} from './services/timetableStorage';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { TeacherRegistryCard } from './components/TeacherRegistryCard';
import { ClassesAccordionCard } from './components/ClassesAccordionCard';
import { RecessPreferencesCard } from './components/RecessPreferencesCard';
import { PeriodRestrictionsCard } from './components/PeriodRestrictionsCard';
import { GeneratorBar } from './components/GeneratorBar';
import { TimetableArea } from './components/TimetableArea';
import { ConflictModal } from './components/ConflictModal';
import { SubjectSummaryModal } from './components/SubjectSummaryModal';
import { ClassInfoModal } from './components/ClassInfoModal';
import { TeacherDirectoryModal } from './components/TeacherDirectoryModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { ClashResultModal } from './components/ClashResultModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { AddSubjectModal } from './components/AddSubjectModal';
import { TeacherFreePeriodsModal } from './components/TeacherFreePeriodsModal';
import { ClearDataConfirmModal, ClearDataMode } from './components/ClearDataConfirmModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileActionsDrawer } from './components/MobileActionsDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BlockedAccessScreen } from './components/BlockedAccessScreen';
import { SuperuserConsoleModal } from './components/SuperuserConsoleModal';
import { LoginScreen } from './components/LoginScreen';

const SAVES_STORAGE_KEY = 'schoolgrid_timetables_v2';

const DEFAULT_CLASSES: ClassEntry[] = [
  {
    id: 'cls_10a',
    name: 'Class 10A',
    subjects: [
      { subjectName: 'Mathematics', teacherId: '', periodsPerWeek: 7, doublePeriods: 1 },
      { subjectName: 'Physics', teacherId: '', periodsPerWeek: 6, doublePeriods: 1 },
      { subjectName: 'Chemistry', teacherId: '', periodsPerWeek: 6, doublePeriods: 1 },
      { subjectName: 'Biology', teacherId: '', periodsPerWeek: 6, doublePeriods: 1 },
      { subjectName: 'English', teacherId: '', periodsPerWeek: 6, doublePeriods: 0 },
      { subjectName: 'Social Studies', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'Computer Science', teacherId: '', periodsPerWeek: 5, doublePeriods: 1 },
      { subjectName: 'Physical Education', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'MD', teacherId: '', periodsPerWeek: 2, doublePeriods: 0 },
    ],
  },
  {
    id: 'cls_10b',
    name: 'Class 10B',
    subjects: [
      { subjectName: 'Mathematics', teacherId: '', periodsPerWeek: 7, doublePeriods: 1 },
      { subjectName: 'Physics', teacherId: '', periodsPerWeek: 6, doublePeriods: 1 },
      { subjectName: 'Chemistry', teacherId: '', periodsPerWeek: 6, doublePeriods: 1 },
      { subjectName: 'Biology', teacherId: '', periodsPerWeek: 6, doublePeriods: 1 },
      { subjectName: 'English', teacherId: '', periodsPerWeek: 6, doublePeriods: 0 },
      { subjectName: 'Social Studies', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'Computer Science', teacherId: '', periodsPerWeek: 5, doublePeriods: 1 },
      { subjectName: 'Physical Education', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'MD', teacherId: '', periodsPerWeek: 2, doublePeriods: 0 },
    ],
  },
  {
    id: 'cls_9a',
    name: 'Class 9A',
    subjects: [
      { subjectName: 'Mathematics', teacherId: '', periodsPerWeek: 7, doublePeriods: 1 },
      { subjectName: 'General Science', teacherId: '', periodsPerWeek: 7, doublePeriods: 1 },
      { subjectName: 'English', teacherId: '', periodsPerWeek: 6, doublePeriods: 0 },
      { subjectName: 'History', teacherId: '', periodsPerWeek: 6, doublePeriods: 0 },
      { subjectName: 'Computer Tech', teacherId: '', periodsPerWeek: 5, doublePeriods: 1 },
      { subjectName: 'Physical Ed', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'Chemistry Intro', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'Physics Intro', teacherId: '', periodsPerWeek: 5, doublePeriods: 0 },
      { subjectName: 'MD', teacherId: '', periodsPerWeek: 2, doublePeriods: 0 },
    ],
  },
];

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  { type: 'period', label: 'P1', duration: 45, startTime: '08:00', endTime: '08:45' },
  { type: 'period', label: 'P2', duration: 45, startTime: '08:45', endTime: '09:30' },
  { type: 'period', label: 'P3', duration: 45, startTime: '09:30', endTime: '10:15' },
  { type: 'period', label: 'P4', duration: 45, startTime: '10:15', endTime: '11:00' },
  { type: 'break', label: 'Recess', duration: 20, startTime: '11:00', endTime: '11:20' },
  { type: 'period', label: 'P5', duration: 45, startTime: '11:20', endTime: '12:05' },
  { type: 'period', label: 'P6', duration: 45, startTime: '12:05', endTime: '12:50' },
  { type: 'period', label: 'P7', duration: 45, startTime: '12:50', endTime: '13:35' },
  { type: 'period', label: 'P8', duration: 45, startTime: '13:35', endTime: '14:20' },
];

function TimetableApp() {
  const {
    user,
    firebaseUser,
    isSuperuser,
    isAuthorizedFacilityUser,
    isBlocked,
    blockedDetails,
    isLoading,
    logout,
  } = useAuth();
  const activeAuthUid = firebaseUser?.uid || user?.uid;

  // Core App State
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassEntry[]>(DEFAULT_CLASSES);
  const [nperiods, setNperiods] = useState<number>(8);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(DEFAULT_SCHEDULE);
  const [recessPrefs, setRecessPrefs] = useState<RecessPreferences>({
    before: ['Mathematics', 'Physics'],
    after: ['Physical Education', 'Computer Science'],
  });
  const [notFirstPeriod, setNotFirstPeriod] = useState<string[]>(['Physical Education']);
  const [notLastPeriod, setNotLastPeriod] = useState<string[]>(['Mathematics']);

  // Timetable State
  const [tt, setTt] = useState<TimetableGrid>({});
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [activeClass, setActiveClass] = useState<string>('Class 10A');

  // Saved Timetables
  const [savedTimetables, setSavedTimetables] = useState<SavedTimetable[]>([]);

  // Modals & Panels
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'institution' | 'security'>('profile');
  const [superuserConsoleOpen, setSuperuserConsoleOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [summaryModalClass, setSummaryModalClass] = useState<string | null>(null);
  const [classInfoModalClass, setClassInfoModalClass] = useState<string | null>(null);
  const [teacherDirModalOpen, setTeacherDirModalOpen] = useState(false);
  const [teacherDirInitialTab, setTeacherDirInitialTab] = useState<'directory' | 'chart' | 'report'>('directory');
  const [teacherDirInitialTeacherId, setTeacherDirInitialTeacherId] = useState<string>('');
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [addSubjectTargetClass, setAddSubjectTargetClass] = useState<string>('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalTab, setSaveModalTab] = useState<'save' | 'retrieve' | 'import'>('save');
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTabType>('home');
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(true);
  const [selectedConfigOption, setSelectedConfigOption] = useState<ConfigOptionTab>('all');
  const [clashResultData, setClashResultData] = useState<{
    title: string;
    subtitle: string;
    results: Array<{ day: string; period: number; oldSubj: string; newSubj: string; cls?: string }>;
    isAllClear: boolean;
    remainingCount: number;
  } | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewClass, setPrintPreviewClass] = useState<string>('ALL');
  const [freePeriodsModalOpen, setFreePeriodsModalOpen] = useState(false);
  const [freePeriodsTeacherId, setFreePeriodsTeacherId] = useState<string>('');
  const [freePeriodsMode, setFreePeriodsMode] = useState<'single' | 'all'>('single');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'timetable' | 'config'>('timetable');

  // Auto-Save States & Tracking
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(getAutoSaveEnabledPreference());
  const [latestAutoSaveSession, setLatestAutoSaveSession] = useState<AutoSaveSession | null>(null);
  const [restoreBannerSession, setRestoreBannerSession] = useState<AutoSaveSession | null>(null);
  const lastAutoSaveFingerprintRef = useRef<string>('');

  // Clear confirmation modal state
  const [clearConfirmState, setClearConfirmState] = useState<{
    isOpen: boolean;
    mode: ClearDataMode;
    targetClassName?: string;
  }>({
    isOpen: false,
    mode: 'teachers',
  });

  const handleOpenClearConfirm = (mode: ClearDataMode, targetClassName?: string) => {
    setClearConfirmState({
      isOpen: true,
      mode,
      targetClassName,
    });
  };

  const handleConfirmClearData = (mode: ClearDataMode, targetClassName?: string) => {
    if (mode === 'teachers') {
      const count = teachers.length;
      setTeachers([]);
      const updatedClasses = classes.map((c) => ({
        ...c,
        subjects: c.subjects.map((s) => ({ ...s, teacherId: '' })),
      }));
      setClasses(updatedClasses);
      setTt({});
      setConflicts([]);
      showToast(`✓ Cleared all ${count} faculty members and reset timetable.`);
    } else if (mode === 'all-subjects') {
      const updatedClasses = classes.map((c) => ({
        ...c,
        subjects: [],
      }));
      setClasses(updatedClasses);
      setTt({});
      setConflicts([]);
      setRecessPrefs({ before: [], after: [] });
      setNotFirstPeriod([]);
      setNotLastPeriod([]);
      showToast(`✓ Cleared all subjects across all ${classes.length} classes.`);
    } else if (mode === 'class-subjects' && targetClassName) {
      const updatedClasses = classes.map((c) => {
        if (c.name === targetClassName) {
          return { ...c, subjects: [] };
        }
        return c;
      });
      setClasses(updatedClasses);
      const copyTT = { ...tt };
      delete copyTT[targetClassName];
      setTt(copyTT);
      showToast(`✓ Cleared all subjects from Class ${targetClassName}.`);
    } else if (mode === 'all-curriculum') {
      setTeachers([]);
      const updatedClasses = classes.map((c) => ({
        ...c,
        subjects: [],
      }));
      setClasses(updatedClasses);
      setTt({});
      setConflicts([]);
      setRecessPrefs({ before: [], after: [] });
      setNotFirstPeriod([]);
      setNotLastPeriod([]);
      showToast('✓ Cleared all faculty and all subjects.');
    }
  };

  const handleOpenAddSubjectModal = (targetClass?: string) => {
    setAddSubjectTargetClass(targetClass || activeClass || classes[0]?.name || '');
    setAddSubjectModalOpen(true);
  };

  const handleOpenTeacherDirectory = (tab: 'directory' | 'chart' | 'report' = 'directory', teacherId?: string) => {
    setTeacherDirInitialTab(tab);
    if (teacherId) setTeacherDirInitialTeacherId(teacherId);
    setTeacherDirModalOpen(true);
  };

  const handleOpenTeacherWorkloadChart = () => {
    handleOpenTeacherDirectory('chart');
  };

  const handleOpenTeacherScheduleReport = (teacherId: string) => {
    handleOpenTeacherDirectory('report', teacherId);
  };

  const handleOpenPrintPreview = (clsName?: string) => {
    if (Object.keys(tt).length === 0) {
      showToast('⚠️ Please generate a timetable first.');
      return;
    }
    setPrintPreviewClass(clsName || activeClass || 'ALL');
    setPrintPreviewOpen(true);
  };

  const handleViewTeacherFreePeriods = (teacherId?: string, mode?: 'single' | 'all') => {
    setFreePeriodsTeacherId(teacherId || teachers[0]?.id || '');
    setFreePeriodsMode(mode || (teacherId ? 'single' : 'all'));
    setFreePeriodsModalOpen(true);
  };

  const handleOpenSave = () => {
    setSaveModalTab('save');
    setSaveModalOpen(true);
  };

  const handleOpenRetrieve = () => {
    setSaveModalTab('retrieve');
    setSaveModalOpen(true);
  };

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2800);
  };

  // Draggable Split Divider
  const [topHeight, setTopHeight] = useState<number>(380);
  const [isDragging, setIsDragging] = useState(false);
  const startDragY = useRef(0);
  const startHeight = useRef(380);

  // Load saves from online Firestore database & real-time sync (only once authorized facility user is active)
  useEffect(() => {
    let isMounted = true;
    if (!isAuthorizedFacilityUser || !firebaseUser?.uid) {
      return;
    }

    const loadOnlineSaves = async () => {
      try {
        const res = await fetchSavedTimetablesOnline(firebaseUser.uid);
        if (isMounted && res && res.timetables && res.timetables.length > 0) {
          setSavedTimetables(res.timetables);
        }
      } catch (e) {
        console.error('Error loading online saved timetables:', e);
      }
    };
    loadOnlineSaves();

    const unsubscribe = subscribeToSavedTimetablesOnline((onlineSaves) => {
      if (isMounted && onlineSaves) {
        setSavedTimetables(onlineSaves);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isAuthorizedFacilityUser, firebaseUser?.uid]);

  // Check for existing auto-saved draft on mount or user sign-in
  useEffect(() => {
    let isMounted = true;
    const checkAutoSaveDraft = async () => {
      if (!isAuthorizedFacilityUser || !activeAuthUid) return;
      try {
        const draft = await getLatestAutoSave(activeAuthUid);
        if (!isMounted || !draft || !draft.state) return;

        setLatestAutoSaveSession(draft);
        setLastAutoSavedAt(draft.savedAt);

        // If the auto-save is within 7 days and has content, show restore banner
        const timeDiff = Date.now() - new Date(draft.savedAt).getTime();
        const isRecent = timeDiff < 7 * 24 * 60 * 60 * 1000;
        const hasContent =
          (draft.state.classes?.length || 0) > 0 ||
          (draft.state.teachers?.length || 0) > 0 ||
          (draft.state.tt && Object.keys(draft.state.tt).length > 0);

        if (isRecent && hasContent) {
          setRestoreBannerSession(draft);
        }
      } catch (err) {
        console.warn('Error checking initial auto-save draft:', err);
      }
    };

    checkAutoSaveDraft();
    return () => {
      isMounted = false;
    };
  }, [isAuthorizedFacilityUser, activeAuthUid]);

  // Periodic 60-Second Auto-Save Interval
  useEffect(() => {
    if (!isAuthorizedFacilityUser) return;
    if (!isAutoSaveEnabled) {
      setAutoSaveStatus('disabled');
      return;
    }

    const intervalId = setInterval(() => {
      handleTriggerAutoSave(false);
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [
    isAuthorizedFacilityUser,
    isAutoSaveEnabled,
    teachers,
    classes,
    schedule,
    recessPrefs,
    notLastPeriod,
    notFirstPeriod,
    tt,
    nperiods,
    startTime,
    activeClass,
    user?.uid,
    user?.institutionName,
    conflicts.length,
  ]);

  // Flush auto-save snapshot on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAuthorizedFacilityUser && isAutoSaveEnabled && (classes.some((c) => c.name.trim()) || teachers.length > 0)) {
        try {
          const snapshotSession: AutoSaveSession = {
            id: 'autosave_latest',
            userId: user?.uid || 'guest_user',
            savedAt: new Date().toISOString(),
            source: 'localStorage',
            state: {
              teachers,
              subjectNames: allSubjectNames,
              classes,
              schedule,
              recessPrefs,
              notLastPeriod,
              notFirstPeriod,
              tt,
            },
            settings: {
              nperiods,
              stime: startTime,
              activeClass,
            },
            summary: {
              classCount: classes.filter((c) => c.name.trim()).length,
              teacherCount: teachers.length,
              hasGeneratedGrid: Object.keys(tt).length > 0,
              institutionName: user?.institutionName,
              conflictCount: conflicts.length,
            },
          };
          localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(snapshotSession));
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    isAutoSaveEnabled,
    teachers,
    classes,
    schedule,
    recessPrefs,
    notLastPeriod,
    notFirstPeriod,
    tt,
    nperiods,
    startTime,
    activeClass,
    user?.uid,
    user?.institutionName,
    conflicts.length,
  ]);

  // Sync conflicts whenever tt or teachers change
  useEffect(() => {
    if (Object.keys(tt).length > 0) {
      const detected = detectConflicts(tt, classes, teachers, nperiods, schedule);
      setConflicts(detected);
    } else {
      setConflicts([]);
    }
  }, [tt, classes, teachers, nperiods, schedule]);

  // Compute all unique subject names across all classes
  const allSubjectNames: string[] = Array.from(
    new Set<string>(classes.flatMap((c) => c.subjects.map((s) => s.subjectName.trim()).filter(Boolean)))
  ).sort();

  // Generate action
  const handleGenerate = () => {
    const valid = classes.filter((c) => c.name.trim() && c.subjects.length);
    if (!valid.length) {
      showToast('Please add at least one class with subjects.');
      return;
    }

    const { tt: generatedTT, conflicts: generatedConflicts } = generateTimetable(
      classes,
      teachers,
      schedule,
      recessPrefs,
      notFirstPeriod,
      notLastPeriod,
      nperiods
    );

    setTt(generatedTT);
    setConflicts(generatedConflicts);
    setActiveClass(valid[0].name);

    if (generatedConflicts.length === 0) {
      showToast('✓ Timetable generated with 0 faculty clashes!');
    } else {
      showToast(`Generated: ${generatedConflicts.length} clash(es) detected.`);
    }
  };

  // Shuffle action
  const handleShuffle = () => {
    handleGenerate();
    showToast('🔀 Timetable reshuffled with new seed!');
  };

  // Clear action
  const handleClear = () => {
    setTt({});
    setConflicts([]);
    showToast('Timetable cleared.');
  };

  // Re-assign cell slot manually
  const handleCellAssign = (
    clsName: string,
    day: number,
    period: number,
    subjectIndex: number | null
  ) => {
    const copy = JSON.parse(JSON.stringify(tt));
    if (!copy[clsName]) copy[clsName] = {};
    if (!copy[clsName][day]) copy[clsName][day] = {};
    copy[clsName][day][period] = subjectIndex;
    setTt(copy);
  };

  // Auto-resolve all conflicts
  const handleResolveAllConflicts = (silent: boolean = false) => {
    const { tt: resolvedTT, totalResolved, remaining } = autoResolveAllConflicts(
      tt,
      classes,
      teachers,
      nperiods,
      schedule
    );

    setTt(resolvedTT);
    const updatedConflicts = detectConflicts(resolvedTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    if (!silent) {
      if (remaining === 0) {
        showToast(`🎉 All conflicts resolved! ${totalResolved} slots reassigned.`);
      } else {
        showToast(`Resolved ${totalResolved} slots. ${remaining} remain.`);
      }
    }
  };

  // Remove clashes for a single class sheet
  const handleRemoveClashesForClass = (clsName: string) => {
    const cls = classes.find((c) => c.name === clsName);
    if (!cls) return;

    const copyTT: TimetableGrid = JSON.parse(JSON.stringify(tt));
    const results: Array<{ day: string; period: number; oldSubj: string; newSubj: string }> = [];

    DAYS.forEach((dayName, di) => {
      for (let p = 0; p < nperiods; p++) {
        const curConflicts = detectConflicts(copyTT, classes, teachers, nperiods, schedule);
        const conflictSet = new Set(
          curConflicts
            .filter((c) => c.type === 'slot-clash')
            .flatMap((c) => c.entries.map((e) => `${e.cls}|${c.day}|${c.period}`))
        );

        if (!conflictSet.has(`${clsName}|${di}|${p}`)) continue;

        const curSi = copyTT[clsName]?.[di]?.[p];
        const curSubj = curSi !== undefined && curSi !== null ? cls.subjects[curSi] : null;

        const busy = new Set<string>();
        classes.forEach((other) => {
          if (other.name === clsName) return;
          const si = copyTT[other.name]?.[di]?.[p];
          if (si === undefined || si === null) return;
          const s = other.subjects[si];
          if (s?.teacherId) busy.add(s.teacherId);
        });

        const freeIdx = cls.subjects.findIndex(
          (s) => s.teacherId && !busy.has(s.teacherId) && s.subjectName !== curSubj?.subjectName
        );
        const fallbackIdx = cls.subjects.findIndex((s) => s.teacherId && !busy.has(s.teacherId));
        const newIdx = freeIdx >= 0 ? freeIdx : fallbackIdx;

        if (newIdx >= 0) {
          const oldName = curSubj?.subjectName || '?';
          const newName = cls.subjects[newIdx]?.subjectName || '?';
          if (!copyTT[clsName]) copyTT[clsName] = {};
          if (!copyTT[clsName][di]) copyTT[clsName][di] = {};
          copyTT[clsName][di][p] = newIdx;
          results.push({ day: dayName, period: p + 1, oldSubj: oldName, newSubj: newName });
        }
      }
    });

    setTt(copyTT);
    const updatedConflicts = detectConflicts(copyTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    setClashResultData({
      title: `Clashes Removed — ${clsName}`,
      subtitle: `Automatically reassigned ${results.length} clashing periods to conflict-free faculty.`,
      results,
      isAllClear: updatedConflicts.length === 0,
      remainingCount: updatedConflicts.length,
    });
  };

  // Remove ALL clashes globally across all classes
  const handleRemoveAllClashes = () => {
    const { tt: resolvedTT, totalResolved, remaining } = autoResolveAllConflicts(
      tt,
      classes,
      teachers,
      nperiods,
      schedule
    );

    setTt(resolvedTT);
    const updatedConflicts = detectConflicts(resolvedTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    setClashResultData({
      title: 'Global Clash Removal Finished',
      subtitle: `Optimized schedule across all classes. Reassigned ${totalResolved} conflicting periods.`,
      results: [],
      isAllClear: remaining === 0,
      remainingCount: remaining,
    });
  };

  // Mass Resolve using global heuristic optimization
  const handleMassResolve = () => {
    if (Object.keys(tt).length === 0) {
      showToast('⚠️ Please generate a timetable first.');
      return;
    }

    const {
      tt: resolvedTT,
      initialClashes,
      resolvedCount,
      remainingCount,
      actions,
    } = massResolveClashesHeuristic(tt, classes, teachers, nperiods, schedule);

    setTt(resolvedTT);
    const updatedConflicts = detectConflicts(resolvedTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    if (initialClashes === 0) {
      showToast('✨ All clear! Global timetable has zero faculty clashes.');
      return;
    }

    const isAllClear = remainingCount === 0;
    const msg = isAllClear
      ? `✨ Mass Resolve successful! All ${resolvedCount} clash${resolvedCount > 1 ? 'es' : ''} resolved.`
      : `✨ Mass Resolve applied: Resolved ${resolvedCount} clash${resolvedCount > 1 ? 'es' : ''} (${remainingCount} remaining).`;

    showToast(msg);

    setClashResultData({
      title: isAllClear ? 'Mass Resolve Complete (0 Clashes Left)' : 'Mass Resolve Optimization Summary',
      subtitle: `Analyzed global timetable state with heuristic slot-swapping. Resolved ${resolvedCount} conflicting slots across all classes.`,
      results: actions.map((a) => ({
        day: a.day,
        period: a.period,
        oldSubj: a.oldSubj,
        newSubj: `${a.newSubj}${a.className ? ` [Class ${a.className}]` : ''}`,
      })),
      isAllClear,
      remainingCount,
    });
  };

  // Auto resolve single conflict item
  const handleResolveOneConflict = (c: TimetableConflict) => {
    const { day, period, entries } = c;
    if (period < 0) return;

    const copyTT: TimetableGrid = JSON.parse(JSON.stringify(tt));
    entries.slice(1).forEach((e) => {
      const cls = classes.find((x) => x.name === e.cls);
      if (!cls) return;
      const subjs = cls.subjects;

      const busy = new Set<string>();
      classes.forEach((other) => {
        const si = copyTT[other.name]?.[day]?.[period];
        if (si === undefined || si === null) return;
        const subj = other.subjects[si];
        if (subj && subj.teacherId) busy.add(subj.teacherId);
      });

      const freeIdx = subjs.findIndex(
        (s) => s.teacherId && !busy.has(s.teacherId) && s.subjectName !== e.subjName
      );
      const fallbackIdx = subjs.findIndex((s) => s.teacherId && !busy.has(s.teacherId));
      const chosen = freeIdx >= 0 ? freeIdx : fallbackIdx >= 0 ? fallbackIdx : -1;

      if (chosen >= 0) {
        if (!copyTT[e.cls]) copyTT[e.cls] = {};
        if (!copyTT[e.cls][day]) copyTT[e.cls][day] = {};
        copyTT[e.cls][day][period] = chosen;
      }
    });

    setTt(copyTT);
    const updatedConflicts = detectConflicts(copyTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);
    showToast('✓ Conflict slot reassigned!');
  };

  // Smart swap suggestion apply
  const handleApplySwapSuggestion = (swap: SwapSuggestion) => {
    const updatedTT = applySwapSuggestion(tt, swap);
    setTt(updatedTT);
    const updatedConflicts = detectConflicts(updatedTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);
    showToast(`✓ Swapped in Class ${swap.clsName}: ${swap.sourceDayName} P${swap.sourcePeriod + 1} ⇄ ${swap.targetDayName} P${swap.targetPeriod + 1}`);
  };

  // Add Subject across one or multiple classes
  const handleAddSubject = (
    newSubject: { subjectName: string; teacherId: string; periodsPerWeek: number; doublePeriods: number },
    targetClassNames: string[]
  ) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (!targetClassNames.includes(c.name)) return c;
        const existingIdx = c.subjects.findIndex(
          (s) => s.subjectName.trim().toLowerCase() === newSubject.subjectName.trim().toLowerCase()
        );
        let updatedSubjects;
        if (existingIdx >= 0) {
          updatedSubjects = [...c.subjects];
          updatedSubjects[existingIdx] = { ...newSubject };
        } else {
          updatedSubjects = [...c.subjects, { ...newSubject }];
        }
        return { ...c, subjects: updatedSubjects };
      })
    );
    showToast(`✓ Added "${newSubject.subjectName}" (${newSubject.periodsPerWeek} p/wk) to ${targetClassNames.length} class${targetClassNames.length > 1 ? 'es' : ''}!`);
  };

  // Resolve clash for a specific faculty member
  const handleResolveTeacherClash = (teacherId: string) => {
    if (Object.keys(tt).length === 0) {
      showToast('⚠️ Please generate a timetable first.');
      return;
    }
    const res = resolveClashesForTeacher(tt, teacherId, classes, teachers, nperiods, schedule);
    setTt(res.tt);
    const updatedConflicts = detectConflicts(res.tt, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    if (res.resolvedCount > 0) {
      showToast(`✨ Resolved ${res.resolvedCount} clash${res.resolvedCount > 1 ? 'es' : ''} for ${res.teacherName}!`);
      setClashResultData({
        title: `Resolved Clashes for ${res.teacherName}`,
        subtitle: `Applied heuristic slot swaps to clear overlapping bookings for ${res.teacherName} (${teacherId}).`,
        results: res.actions.map((a) => ({
          day: a.day,
          period: a.period,
          oldSubj: a.oldSubj,
          newSubj: `${a.newSubj}${a.className ? ` [Class ${a.className}]` : ''}`,
        })),
        isAllClear: res.remainingCount === 0,
        remainingCount: res.remainingCount,
      });
    } else {
      showToast(`Faculty ${res.teacherName} has no resolvable slot clashes.`);
    }
  };

  // Resolve clash for all faculty members with clashes
  const handleResolveAllFacultyClashes = () => {
    if (Object.keys(tt).length === 0) {
      showToast('⚠️ Please generate a timetable first.');
      return;
    }
    const busyTeacherIds = new Set<string>();
    conflicts.forEach((c) => {
      c.entries.forEach((e) => {
        if (e.teacherId) busyTeacherIds.add(e.teacherId);
      });
    });

    if (busyTeacherIds.size === 0) {
      showToast('✨ All faculty members are clash-free!');
      return;
    }

    let currentTT = tt;
    let totalResolved = 0;
    const allActions: Array<{ day: string; period: number; oldSubj: string; newSubj: string; className?: string }> = [];

    busyTeacherIds.forEach((tid) => {
      const res = resolveClashesForTeacher(currentTT, tid, classes, teachers, nperiods, schedule);
      currentTT = res.tt;
      totalResolved += res.resolvedCount;
      allActions.push(...res.actions);
    });

    setTt(currentTT);
    const updatedConflicts = detectConflicts(currentTT, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    if (totalResolved > 0) {
      showToast(`✨ Resolved ${totalResolved} faculty clash(es) across ${busyTeacherIds.size} teachers!`);
      setClashResultData({
        title: 'Faculty Clashes Resolved',
        subtitle: `Applied faculty-specific heuristic swaps across all conflicting faculty members.`,
        results: allActions.map((a) => ({
          day: a.day,
          period: a.period,
          oldSubj: a.oldSubj,
          newSubj: `${a.newSubj}${a.className ? ` [Class ${a.className}]` : ''}`,
        })),
        isAllClear: updatedConflicts.length === 0,
        remainingCount: updatedConflicts.length,
      });
    } else {
      showToast('No further faculty slot swaps possible.');
    }
  };

  // Resolve clash for a specific subject in a class
  const handleResolveSubjectClashes = (className: string, subjectIndex: number) => {
    if (Object.keys(tt).length === 0) {
      showToast('⚠️ Please generate a timetable first.');
      return;
    }
    const res = resolveClashesForSubject(tt, className, subjectIndex, classes, teachers, nperiods, schedule);
    setTt(res.tt);
    const updatedConflicts = detectConflicts(res.tt, classes, teachers, nperiods, schedule);
    setConflicts(updatedConflicts);

    if (res.resolvedCount > 0) {
      showToast(`✨ Resolved ${res.resolvedCount} clash(es) for ${res.subjectName} in Class ${className}!`);
      setClashResultData({
        title: `Resolved Clashes for ${res.subjectName} (${className})`,
        subtitle: `Swapped schedule slots within Class ${className} to clear faculty clash for ${res.subjectName}.`,
        results: res.actions.map((a) => ({
          day: a.day,
          period: a.period,
          oldSubj: a.oldSubj,
          newSubj: `${a.newSubj}${a.className ? ` [Class ${a.className}]` : ''}`,
        })),
        isAllClear: updatedConflicts.length === 0,
        remainingCount: updatedConflicts.length,
      });
    } else {
      showToast(`No resolvable slot clashes found for ${res.subjectName}.`);
    }
  };

  // PDF exports
  const handleExportAllPDF = () => {
    const names = classes.filter((c) => c.name.trim()).map((c) => c.name);
    if (!names.length || Object.keys(tt).length === 0) {
      showToast('Generate a timetable first.');
      return;
    }
    exportTimetablePDF(
      names,
      classes,
      teachers,
      schedule,
      tt,
      user?.institutionName || 'SchoolGrid Academy',
      user?.academicYear || '2026–2027'
    );
    showToast('⬇ All Class Timetables PDF downloaded!');
  };

  const handleExportClassPDF = (clsName: string) => {
    exportTimetablePDF(
      [clsName],
      classes,
      teachers,
      schedule,
      tt,
      user?.institutionName || 'SchoolGrid Academy',
      user?.academicYear || '2026–2027'
    );
    showToast(`⬇ PDF for ${clsName} downloaded!`);
  };

  // Save / Retrieve logic (Online Firestore Cloud Storage)
  const handleConfirmSave = async (name: string, notes?: string, overwriteId?: string) => {
    const newSave: SavedTimetable = {
      id: overwriteId || 'save_' + Date.now(),
      name,
      userId: activeAuthUid || 'usr_guest',
      savedAt: new Date().toISOString(),
      state: {
        teachers,
        subjectNames: allSubjectNames,
        classes,
        schedule,
        recessPrefs,
        notLastPeriod,
        notFirstPeriod,
        tt,
      },
      settings: {
        nperiods,
        stime: startTime,
      },
      notes,
    };

    // Optimistically update local state
    let updatedSaves: SavedTimetable[];
    if (overwriteId) {
      updatedSaves = savedTimetables.map((s) => (s.id === overwriteId ? newSave : s));
    } else {
      updatedSaves = [newSave, ...savedTimetables];
    }
    setSavedTimetables(updatedSaves);
    localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(updatedSaves));

    try {
      const res = await saveTimetableOnline(newSave, activeAuthUid);
      if (res.isCloud) {
        showToast(`☁ Saved timetable "${name}" online to cloud database!`);
      } else {
        showToast(`💾 Saved timetable "${name}" (cached locally)`);
      }
    } catch (e) {
      console.warn('Online save fallback:', e);
      showToast(`💾 Saved timetable "${name}"`);
    }
  };

  const handleLoadTimetable = (id: string) => {
    const target = savedTimetables.find((s) => s.id === id);
    if (!target) {
      showToast('Saved timetable not found.');
      return;
    }

    const st = target.state;
    if (st.teachers) setTeachers(st.teachers);
    if (st.classes) setClasses(st.classes);
    if (st.schedule) setSchedule(st.schedule);
    if (st.recessPrefs) setRecessPrefs(st.recessPrefs);
    if (st.notLastPeriod) setNotLastPeriod(st.notLastPeriod);
    if (st.notFirstPeriod) setNotFirstPeriod(st.notFirstPeriod);
    if (st.tt) setTt(st.tt);
    if (target.settings) {
      setNperiods(target.settings.nperiods || 8);
      setStartTime(target.settings.stime || '08:00');
    }

    showToast(`📂 Retrieved "${target.name}"`);
  };

  const handleDeleteTimetable = async (id: string, name: string) => {
    if (!confirm(`Delete saved schedule "${name}"?`)) return;
    const updated = savedTimetables.filter((s) => s.id !== id);
    setSavedTimetables(updated);
    localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(updated));

    try {
      await deleteTimetableOnline(id, user?.uid);
      showToast(`🗑 Deleted "${name}" from online database`);
    } catch (e) {
      console.warn('Online delete error:', e);
      showToast(`🗑 Deleted "${name}"`);
    }
  };

  // Toggle Auto-Save feature on/off
  const handleToggleAutoSave = (enabled: boolean) => {
    setIsAutoSaveEnabled(enabled);
    setAutoSaveEnabledPreference(enabled);
    if (!enabled) {
      setAutoSaveStatus('disabled');
      showToast('⏸ Auto-save paused');
    } else {
      setAutoSaveStatus('idle');
      showToast('▶ Auto-save active (every 60s)');
    }
  };

  // Trigger immediate or interval-based auto-save
  const handleTriggerAutoSave = async (isManual = false) => {
    if (!isAutoSaveEnabled && !isManual) return;

    // Avoid saving if unauthorized, blocked, or completely empty
    if (!isAuthorizedFacilityUser || (isBlocked && !isSuperuser)) return;
    const validClasses = classes.filter((c) => c.name.trim());
    if (validClasses.length === 0 && teachers.length === 0) return;

    const currentFingerprint = computeStateFingerprint(
      {
        teachers,
        subjectNames: allSubjectNames,
        classes,
        schedule,
        recessPrefs,
        notLastPeriod,
        notFirstPeriod,
        tt,
      },
      { nperiods, stime: startTime }
    );

    // Skip if nothing changed since last auto-save, unless user explicitly clicked manual save snapshot
    if (!isManual && currentFingerprint === lastAutoSaveFingerprintRef.current) {
      return;
    }

    setAutoSaveStatus('saving');
    try {
      const res = await persistAutoSave(
        {
          state: {
            teachers,
            subjectNames: allSubjectNames,
            classes,
            schedule,
            recessPrefs,
            notLastPeriod,
            notFirstPeriod,
            tt,
          },
          settings: {
            nperiods,
            stime: startTime,
            activeClass,
          },
          institutionName: user?.institutionName,
          conflictCount: conflicts.length,
        },
        activeAuthUid
      );

      if (res.success) {
        setLastAutoSavedAt(res.savedAt);
        lastAutoSaveFingerprintRef.current = currentFingerprint;
        setAutoSaveStatus('saved');

        // Update latest session in memory
        setLatestAutoSaveSession({
          id: 'autosave_latest',
          userId: user?.uid || 'guest_user',
          savedAt: res.savedAt,
          source: res.storageTarget === 'firestore' ? 'firestore' : 'localStorage',
          state: {
            teachers,
            subjectNames: allSubjectNames,
            classes,
            schedule,
            recessPrefs,
            notLastPeriod,
            notFirstPeriod,
            tt,
          },
          settings: {
            nperiods,
            stime: startTime,
            activeClass,
          },
          summary: {
            classCount: validClasses.length,
            teacherCount: teachers.length,
            hasGeneratedGrid: Object.keys(tt).length > 0,
            institutionName: user?.institutionName,
            conflictCount: conflicts.length,
          },
        });

        if (isManual) {
          const destName =
            res.storageTarget === 'both'
              ? 'Cloud & Local'
              : res.storageTarget === 'firestore'
              ? 'Cloud'
              : 'Local Storage';
          showToast(`💾 Auto-saved snapshot recorded (${destName})`);
        }
      } else {
        setAutoSaveStatus('error');
        if (isManual) showToast('⚠ Failed to auto-save snapshot');
      }
    } catch (err) {
      console.error('Auto-save execution error:', err);
      setAutoSaveStatus('error');
    }
  };

  // Restore state from latest auto-saved draft
  const handleRestoreFromAutoSave = (sessionToRestore?: AutoSaveSession) => {
    const target = sessionToRestore || latestAutoSaveSession;
    if (!target || !target.state) {
      showToast('No auto-save session data found to restore.');
      return;
    }

    const st = target.state;
    if (st.teachers) setTeachers(st.teachers);
    if (st.classes) setClasses(st.classes);
    if (st.schedule) setSchedule(st.schedule);
    if (st.recessPrefs) setRecessPrefs(st.recessPrefs);
    if (st.notLastPeriod) setNotLastPeriod(st.notLastPeriod);
    if (st.notFirstPeriod) setNotFirstPeriod(st.notFirstPeriod);
    if (st.tt) setTt(st.tt);
    if (target.settings) {
      if (target.settings.nperiods) setNperiods(target.settings.nperiods);
      if (target.settings.stime) setStartTime(target.settings.stime);
      if (target.settings.activeClass) setActiveClass(target.settings.activeClass);
    }

    setRestoreBannerSession(null);
    showToast('✓ Successfully restored auto-saved timetable state!');
  };

  // Remove teacher and all assigned periods/subjects across classes and active timetable grid
  const handleRemoveTeacherWithPeriods = (teacherId: string) => {
    const targetTeacher = teachers.find((t) => t.id === teacherId);
    const teacherName = targetTeacher?.name || teacherId;

    const {
      updatedTeachers,
      updatedClasses,
      updatedTT,
      removedPeriodsCount,
      affectedClasses,
    } = removeTeacherAndAssignedPeriods(teacherId, teachers, classes, tt, nperiods);

    setTeachers(updatedTeachers);
    setClasses(updatedClasses);
    setTt(updatedTT);

    if (removedPeriodsCount > 0) {
      showToast(
        `✓ Removed ${teacherName} & cleared ${removedPeriodsCount} assigned period${
          removedPeriodsCount !== 1 ? 's' : ''
        } across ${affectedClasses.length} class${affectedClasses.length !== 1 ? 'es' : ''}.`
      );
    } else {
      showToast(`✓ Removed teacher ${teacherName} (${teacherId})`);
    }
  };

  // Export single saved item as JSON
  const handleExportSavedItemJSON = (savedItem: SavedTimetable) => {
    const snap = {
      version: 2,
      savedAt: savedItem.savedAt,
      name: savedItem.name,
      notes: savedItem.notes,
      state: savedItem.state,
      settings: savedItem.settings,
    };
    const fileName = `${savedItem.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_SchoolGrid.json`;
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`⬇ Exported "${fileName}"`);
  };

  // JSON Export / Import
  const handleExportJSON = () => {
    const snap = {
      version: 2,
      savedAt: new Date().toISOString(),
      state: {
        teachers,
        classes,
        schedule,
        recessPrefs,
        notLastPeriod,
        notFirstPeriod,
        tt,
      },
      settings: { nperiods, startTime },
    };
    const fileName = `SchoolGrid_${user?.institutionName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Timetable'}_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`⬇ Exported ${fileName}`);
  };

  const handleImportJSONFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const snap = JSON.parse(event.target?.result as string);
        if (snap.state) {
          const st = snap.state;
          if (st.teachers) setTeachers(st.teachers);
          if (st.classes) setClasses(st.classes);
          if (st.schedule) setSchedule(st.schedule);
          if (st.recessPrefs) setRecessPrefs(st.recessPrefs);
          if (st.notLastPeriod) setNotLastPeriod(st.notLastPeriod);
          if (st.notFirstPeriod) setNotFirstPeriod(st.notFirstPeriod);
          if (st.tt) setTt(st.tt);
          if (snap.settings) {
            setNperiods(snap.settings.nperiods || 8);
            setStartTime(snap.settings.startTime || '08:00');
          }
          showToast(`⬆ Successfully retrieved "${file.name}"`);
        }
      } catch (err) {
        showToast('⚠ Invalid JSON timetable file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportJSONFile(file);
      e.target.value = '';
    }
  };

  // Auto fill duration helper
  const handleAutoFillTimes = () => {
    const durStr = prompt('Default period duration in minutes:', '45');
    const breakStr = prompt('Recess break duration in minutes:', '20');
    if (!durStr) return;

    const dur = parseInt(durStr) || 45;
    const bdur = parseInt(breakStr || '20') || 20;

    let [hStr, mStr] = startTime.split(':');
    let h = parseInt(hStr) || 8;
    let m = parseInt(mStr) || 0;
    const pad = (num: number) => String(num).padStart(2, '0');

    const updated = schedule.map((e) => {
      const d = e.type === 'period' ? dur : bdur;
      const st = `${pad(h)}:${pad(m)}`;
      let em = m + d;
      let eh = h + Math.floor(em / 60);
      em %= 60;
      const et = `${pad(eh)}:${pad(em)}`;
      h = eh;
      m = em;
      return { ...e, duration: d, startTime: st, endTime: et };
    });

    setSchedule(updated);
    showToast(`✓ Auto-filled: ${dur}m periods, ${bdur}m breaks`);
  };

  // Resizing divider mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startDragY.current = e.clientY;
    startHeight.current = topHeight;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientY - startDragY.current;
      const newHeight = Math.max(160, Math.min(window.innerHeight - 200, startHeight.current + delta));
      setTopHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-10 h-10 rounded-full border-3 border-indigo-500/30 border-t-indigo-400 animate-spin mb-3" />
        <p className="text-xs font-bold tracking-wide text-slate-300">Verifying authorized access...</p>
      </div>
    );
  }

  if (isBlocked && !isSuperuser) {
    return (
      <BlockedAccessScreen
        blockedDetails={blockedDetails}
        userEmail={user?.email || firebaseUser?.email || undefined}
        onLogout={logout}
      />
    );
  }

  if (!isAuthorizedFacilityUser) {
    return <LoginScreen />;
  }

  return (
    <div className="app-viewport h-screen w-screen overflow-hidden flex flex-col bg-slate-50 font-sans antialiased text-slate-900 print:h-auto print:w-auto print:overflow-visible print:bg-white">
      {/* Auto-Save Restore Banner if an un-restored previous session exists */}
      {restoreBannerSession && (
        <AutoSaveRestoreBanner
          session={restoreBannerSession}
          onRestore={() => handleRestoreFromAutoSave(restoreBannerSession)}
          onDismiss={() => setRestoreBannerSession(null)}
        />
      )}

      {/* Ribbon Menu (Hidden in Print) */}
      <RibbonMenu
        teachers={teachers}
        classes={classes}
        schedule={schedule}
        tt={tt}
        conflicts={conflicts}
        activeClass={activeClass}
        nperiods={nperiods}
        startTime={startTime}
        recessPrefs={recessPrefs}
        notFirstPeriod={notFirstPeriod}
        notLastPeriod={notLastPeriod}
        savedCount={savedTimetables.length}
        savedTimetables={savedTimetables}
        activeRibbonTab={activeRibbonTab}
        onSelectRibbonTab={setActiveRibbonTab}
        onSelectClass={setActiveClass}
        onGenerate={handleGenerate}
        onShuffle={handleShuffle}
        onClear={handleClear}
        onOpenSave={handleOpenSave}
        onOpenRetrieve={handleOpenRetrieve}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onOpenProfile={(tab) => {
          setProfileModalTab(tab || 'profile');
          setProfileModalOpen(true);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenSuperuserConsole={() => setSuperuserConsoleOpen(true)}
        onLoadTimetable={handleLoadTimetable}
        onDeleteTimetable={handleDeleteTimetable}
        onOpenConflicts={() => setConflictModalOpen(true)}
        onRemoveAllClashes={handleRemoveAllClashes}
        onResolveAllConflicts={() => handleResolveAllConflicts(false)}
        onMassResolve={handleMassResolve}
        onRemoveClashesForClass={handleRemoveClashesForClass}
        onResolveTeacherClash={handleResolveTeacherClash}
        onResolveAllFacultyClashes={handleResolveAllFacultyClashes}
        onOpenTeacherDirectory={() => handleOpenTeacherDirectory('directory')}
        onOpenTeacherWorkloadChart={handleOpenTeacherWorkloadChart}
        onOpenTeacherScheduleReport={handleOpenTeacherScheduleReport}
        onViewTeacherFreePeriods={(tid, mode) => handleViewTeacherFreePeriods(tid, mode)}
        onOpenSubjectSummary={(clsName) => setSummaryModalClass(clsName)}
        onOpenClassInfo={(clsName) => setClassInfoModalClass(clsName)}
        onOpenAddSubjectModal={handleOpenAddSubjectModal}
        onOpenPrintPreview={(clsName) => handleOpenPrintPreview(clsName)}
        onExportAllPDF={handleExportAllPDF}
        onExportClassPDF={handleExportClassPDF}
        onClearAllTeachers={() => handleOpenClearConfirm('teachers')}
        onClearAllSubjects={() => handleOpenClearConfirm('all-subjects')}
        onClearClassSubjects={(clsName) => handleOpenClearConfirm('class-subjects', clsName)}
        autoSaveStatus={autoSaveStatus}
        lastAutoSavedAt={lastAutoSavedAt}
        isAutoSaveEnabled={isAutoSaveEnabled}
        onToggleAutoSave={handleToggleAutoSave}
        onTriggerManualAutoSave={() => handleTriggerAutoSave(true)}
        onRestoreAutoSave={() => handleRestoreFromAutoSave()}
        latestAutoSaveSession={latestAutoSaveSession}
        isConfigDrawerOpen={isConfigDrawerOpen}
        onToggleConfigDrawer={() => setIsConfigDrawerOpen(!isConfigDrawerOpen)}
        selectedConfigOption={selectedConfigOption}
        onSelectConfigOption={(opt) => {
          setSelectedConfigOption(opt);
          setIsConfigDrawerOpen(true);
        }}
      />

      {/* Main Split Body */}
      <div className="main-split-body flex-1 flex flex-col overflow-hidden min-h-0 print:overflow-visible print:h-auto">
        {activeRibbonTab === 'home' && (
          <>
            {/* GENERATOR ACTIONS BAR (Hidden in Print) */}
            <div id="generator-bar" className="print:hidden">
              <GeneratorBar
                conflicts={conflicts}
                hasGenerated={Object.keys(tt).length > 0}
                teachers={teachers}
                onGenerate={handleGenerate}
                onShuffle={handleShuffle}
                onClear={handleClear}
                onOpenConflicts={() => setConflictModalOpen(true)}
                onOpenTeacherDirectory={() => setTeacherDirModalOpen(true)}
                onRemoveAllClashes={handleRemoveAllClashes}
                onResolveAllConflicts={() => handleResolveAllConflicts(false)}
                onMassResolve={handleMassResolve}
                onExportAllPDF={handleExportAllPDF}
                onOpenPrintPreview={() => handleOpenPrintPreview()}
                onViewTeacherFreePeriods={(tid) => handleViewTeacherFreePeriods(tid, 'single')}
                onGenerateAllTeachersFreePeriods={() => handleViewTeacherFreePeriods('', 'all')}
                onOpenSave={handleOpenSave}
                onOpenRetrieve={handleOpenRetrieve}
              />
            </div>

            {/* BOTTOM TIMETABLE AREA */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50 print:overflow-visible print:h-auto print:bg-white">
              <TimetableArea
                classes={classes}
                teachers={teachers}
                schedule={schedule}
                tt={tt}
                conflicts={conflicts}
                activeClass={activeClass}
                onSelectClass={setActiveClass}
                onCellAssign={handleCellAssign}
                onOpenSubjectSummary={(clsName) => setSummaryModalClass(clsName)}
                onOpenClassInfo={(clsName) => setClassInfoModalClass(clsName)}
                onOpenConflicts={() => setConflictModalOpen(true)}
                onRemoveClashesForClass={handleRemoveClashesForClass}
                onExportClassPDF={handleExportClassPDF}
                onOpenPrintPreview={(cls) => handleOpenPrintPreview(cls)}
                onOpenAddSubjectModal={handleOpenAddSubjectModal}
                onResolveTeacherClash={handleResolveTeacherClash}
                onResolveSubjectClashes={handleResolveSubjectClashes}
                institutionName={user?.institutionName}
                academicYear={user?.academicYear}
              />
            </div>
          </>
        )}

        {/* TEACHER TAB VIEW (Dedicated Teacher Registry) */}
        {activeRibbonTab === 'teachers' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>Teacher Registry &amp; Faculty Management</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Register faculty members, inspect teaching allocations, and manage period workloads
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenTeacherDirectory('directory')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Faculty Directory ({teachers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenTeacherWorkloadChart}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Workload Distribution</span>
                  </button>
                </div>
              </div>

              {/* Faculty / Teacher Registry Card */}
              <TeacherRegistryCard
                teachers={teachers}
                classes={classes}
                onTeachersChange={setTeachers}
                onRemoveTeacherWithPeriods={handleRemoveTeacherWithPeriods}
                onClearAllTeachers={() => handleOpenClearConfirm('teachers')}
                onToast={showToast}
              />
            </div>
          </div>
        )}

        {/* CLASSES, SUBJECTS & FACULTY TAB VIEW */}
        {activeRibbonTab === 'classes' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <span>Classes &amp; Subjects</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign custom class names, manage subjects, assign faculty teachers, and configure period allocations
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      handleGenerate();
                      setActiveRibbonTab('home');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:bg-emerald-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Generate clash-free timetable across all classes and open timetable view"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Generate Timetable</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAddSubjectModal()}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Subject Entry</span>
                  </button>
                </div>
              </div>

              {/* Main Classes & Subjects Manager */}
              <ClassesAccordionCard
                classes={classes}
                teachers={teachers}
                nperiods={nperiods}
                onClassesChange={setClasses}
                onTeachersChange={setTeachers}
                onToast={showToast}
                onOpenAddSubjectModal={handleOpenAddSubjectModal}
                onClearAllSubjects={() => handleOpenClearConfirm('all-subjects')}
                onClearClassSubjects={(clsName) => handleOpenClearConfirm('class-subjects', clsName)}
                onGenerateTimetable={() => {
                  handleGenerate();
                  setActiveRibbonTab('home');
                }}
              />

              {/* Subject Recess & Period Rules */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
                <RecessPreferencesCard
                  allSubjectNames={allSubjectNames}
                  recessPrefs={recessPrefs}
                  onRecessPrefsChange={setRecessPrefs}
                  onToast={showToast}
                />

                <PeriodRestrictionsCard
                  allSubjectNames={allSubjectNames}
                  notFirstPeriod={notFirstPeriod}
                  notLastPeriod={notLastPeriod}
                  onNotFirstChange={setNotFirstPeriod}
                  onNotLastChange={setNotLastPeriod}
                />
              </div>
            </div>
          </div>
        )}

        {/* EXPORTS TAB VIEW */}
        {activeRibbonTab === 'exports' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-600" />
                    <span>Export &amp; Print Center</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Export high-resolution PDF timetables, teacher schedules, free period matrices, and backups
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. All Classes PDF */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">All Classes Timetable (PDF)</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Download complete PDF bundle containing schedule matrices for all {classes.length} registered classes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAllPDF}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All Classes PDF</span>
                  </button>
                </div>

                {/* 2. Print Preview */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Interactive Print Preview</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Preview formatted print pages, paper orientation, headers, and print directly.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPrintPreview()}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Open Print Preview</span>
                  </button>
                </div>

                {/* 3. Teacher Free Periods */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Faculty Free Periods Matrix</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Generate and export free period availability roster for all faculty across all school days.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleViewTeacherFreePeriods('', 'all')}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Free Periods Matrix</span>
                  </button>
                </div>

                {/* 4. Cloud Snapshots & Saves */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Save className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Save to Online Cloud</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Persist full timetable snapshot to cloud database or retrieve past schedules.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenSave}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenRetrieve}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Retrieve ({savedTimetables.length})</span>
                    </button>
                  </div>
                </div>

                {/* 5. JSON Backup Export */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Backup JSON File</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Export complete workspace configuration to local JSON file for safe offline storage.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ALL MODALS (Hidden in Print) */}
      <div className="print:hidden">
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

        <UserProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          savedCount={savedTimetables.length}
          initialTab={profileModalTab}
        />

        <SuperuserConsoleModal
          isOpen={superuserConsoleOpen}
          onClose={() => setSuperuserConsoleOpen(false)}
          isSuperuser={isSuperuser}
          onToast={showToast}
        />

        <ConflictModal
          isOpen={conflictModalOpen}
          onClose={() => setConflictModalOpen(false)}
          conflicts={conflicts}
          classes={classes}
          teachers={teachers}
          schedule={schedule}
          tt={tt}
          onResolveOne={handleResolveOneConflict}
          onResolveAll={() => handleResolveAllConflicts(false)}
          onApplySwap={handleApplySwapSuggestion}
        />

        <SubjectSummaryModal
          isOpen={!!summaryModalClass}
          onClose={() => setSummaryModalClass(null)}
          classes={classes}
          teachers={teachers}
          tt={tt}
          initialClass={summaryModalClass || ''}
          nperiods={nperiods}
          conflicts={conflicts}
          onOpenAddSubjectModal={handleOpenAddSubjectModal}
          onResolveSubjectClashes={handleResolveSubjectClashes}
          onClearAllSubjects={() => handleOpenClearConfirm('all-subjects')}
          onClearClassSubjects={(clsName) => handleOpenClearConfirm('class-subjects', clsName)}
        />

        <ClassInfoModal
          isOpen={!!classInfoModalClass}
          onClose={() => setClassInfoModalClass(null)}
          classes={classes}
          teachers={teachers}
          schedule={schedule}
          tt={tt}
          conflicts={conflicts}
          initialClass={classInfoModalClass || ''}
        />

        <TeacherDirectoryModal
          isOpen={teacherDirModalOpen}
          onClose={() => setTeacherDirModalOpen(false)}
          teachers={teachers}
          classes={classes}
          schedule={schedule}
          tt={tt}
          conflicts={conflicts}
          institutionName={user?.institutionName}
          initialTab={teacherDirInitialTab}
          initialTeacherId={teacherDirInitialTeacherId}
          onResolveTeacherClash={handleResolveTeacherClash}
          onResolveAllFacultyClashes={handleResolveAllFacultyClashes}
          onViewTeacherFreePeriods={(tid) => handleViewTeacherFreePeriods(tid, 'single')}
          onGenerateAllTeachersFreePeriods={() => handleViewTeacherFreePeriods('', 'all')}
          onRemoveTeacherWithPeriods={handleRemoveTeacherWithPeriods}
          onClearAllTeachers={() => handleOpenClearConfirm('teachers')}
        />

        <TeacherFreePeriodsModal
          isOpen={freePeriodsModalOpen}
          onClose={() => setFreePeriodsModalOpen(false)}
          teachers={teachers}
          classes={classes}
          tt={tt}
          nperiods={nperiods}
          initialTeacherId={freePeriodsTeacherId}
          initialMode={freePeriodsMode}
          onToast={showToast}
        />

        <AddSubjectModal
          isOpen={addSubjectModalOpen}
          onClose={() => setAddSubjectModalOpen(false)}
          classes={classes}
          teachers={teachers}
          nperiods={nperiods}
          defaultClass={addSubjectTargetClass}
          onAddSubject={handleAddSubject}
        />

        <SaveLoadModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          initialTab={saveModalTab}
          savedTimetables={savedTimetables}
          currentClasses={classes}
          currentTeachers={teachers}
          currentSchedule={schedule}
          currentTT={tt}
          onConfirmSave={handleConfirmSave}
          onLoadTimetable={handleLoadTimetable}
          onDeleteTimetable={handleDeleteTimetable}
          onImportJSONFile={handleImportJSONFile}
          onExportSavedItemJSON={handleExportSavedItemJSON}
          latestAutoSaveSession={latestAutoSaveSession}
          onRestoreAutoSave={handleRestoreFromAutoSave}
          onToast={showToast}
        />

        <ClashResultModal
          isOpen={clashResultData !== null}
          onClose={() => setClashResultData(null)}
          title={clashResultData?.title || 'Clash Removal Results'}
          subtitle={clashResultData?.subtitle || ''}
          results={clashResultData?.results || []}
          isAllClear={clashResultData?.isAllClear || false}
          remainingCount={clashResultData?.remainingCount || 0}
        />

        <PrintPreviewModal
          isOpen={printPreviewOpen}
          onClose={() => setPrintPreviewOpen(false)}
          classes={classes}
          teachers={teachers}
          schedule={schedule}
          tt={tt}
          activeClass={printPreviewClass}
          institutionName={user?.institutionName}
          academicYear={user?.academicYear}
          onExportClassPDF={handleExportClassPDF}
          onExportAllPDF={handleExportAllPDF}
        />

        <ClearDataConfirmModal
          isOpen={clearConfirmState.isOpen}
          onClose={() => setClearConfirmState((prev) => ({ ...prev, isOpen: false }))}
          mode={clearConfirmState.mode}
          targetClassName={clearConfirmState.targetClassName}
          teachers={teachers}
          classes={classes}
          onConfirmClear={handleConfirmClearData}
        />

        {/* MOBILE ACTIONS DRAWER */}
        <MobileActionsDrawer
          isOpen={mobileActionsOpen}
          onClose={() => setMobileActionsOpen(false)}
          activeClass={activeClass}
          hasGenerated={Object.keys(tt).length > 0}
          onShuffle={handleShuffle}
          onOpenPrintPreview={(cls) => handleOpenPrintPreview(cls)}
          onExportAllPDF={handleExportAllPDF}
          onExportClassPDF={handleExportClassPDF}
          onViewTeacherFreePeriods={(tid, mode) => handleViewTeacherFreePeriods(tid, mode)}
          onOpenTeacherWorkloadChart={() => {
            setTeacherDirInitialTab('chart');
            setTeacherDirModalOpen(true);
          }}
          onOpenTeacherDirectory={() => {
            setTeacherDirInitialTab('directory');
            setTeacherDirModalOpen(true);
          }}
          onRemoveAllClashes={handleRemoveAllClashes}
          onClearTimetable={handleClear}
          onOpenSave={handleOpenSave}
          onOpenRetrieve={handleOpenRetrieve}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          selectedConfigOption={selectedConfigOption}
          onSelectConfigOption={(opt) => {
            setSelectedConfigOption(opt);
            setIsConfigDrawerOpen(true);
            setActiveMobileTab('config');
          }}
          onOpenConfigDrawer={() => {
            setIsConfigDrawerOpen(true);
            setActiveMobileTab('config');
          }}
        />
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed on Mobile Viewports) */}
      <MobileBottomNav
        hasGenerated={Object.keys(tt).length > 0}
        conflicts={conflicts}
        isConfigDrawerOpen={isConfigDrawerOpen}
        activeMobileTab={activeMobileTab}
        onSelectMobileTab={(tab) => {
          setActiveMobileTab(tab);
          if (tab === 'config') {
            setIsConfigDrawerOpen(true);
          } else {
            setIsConfigDrawerOpen(false);
          }
        }}
        onGenerate={handleGenerate}
        onOpenConflicts={() => setConflictModalOpen(true)}
        onOpenTeacherDirectory={() => {
          setTeacherDirInitialTab('directory');
          setTeacherDirModalOpen(true);
        }}
        onOpenMoreMenu={() => setMobileActionsOpen(true)}
      />

      {/* TOAST POPUP (Hidden in Print) */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-2xl z-[999] border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-150 select-none print:hidden">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TimetableApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
