import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AutoSaveSession, TimetableState } from '../types';

export const AUTOSAVE_STORAGE_KEY = 'schoolgrid_autosave_state_v2';
export const AUTOSAVE_CONFIG_KEY = 'schoolgrid_autosave_config_v2';
export const AUTOSAVE_INTERVAL_MS = 60000; // 60 seconds interval

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface AutoSavePayload {
  state: TimetableState;
  settings: {
    nperiods: number;
    stime: string;
    activeClass?: string;
  };
  institutionName?: string;
  conflictCount?: number;
}

export interface AutoSaveResult {
  success: boolean;
  savedAt: string;
  storageTarget: 'both' | 'localStorage' | 'firestore' | 'none';
  error?: string;
}

/**
 * Persist active timetable state to LocalStorage and Firebase Firestore
 */
export async function persistAutoSave(
  payload: AutoSavePayload,
  userUid?: string
): Promise<AutoSaveResult> {
  const savedAt = new Date().toISOString();
  const validClasses = payload.state.classes?.filter((c) => c.name?.trim()) || [];
  const validTeachers = payload.state.teachers || [];
  const hasGrid = Boolean(payload.state.tt && Object.keys(payload.state.tt).length > 0);
  const fbUser = auth.currentUser;
  const activeUid = fbUser?.uid || userUid;

  const summaryObj: AutoSaveSession['summary'] = {
    classCount: validClasses.length,
    teacherCount: validTeachers.length,
    hasGeneratedGrid: hasGrid,
    conflictCount: payload.conflictCount ?? 0,
  };
  if (payload.institutionName) {
    summaryObj.institutionName = payload.institutionName;
  }

  const session: AutoSaveSession = {
    id: 'autosave_latest',
    userId: activeUid || 'guest_user',
    savedAt,
    source: 'localStorage',
    state: payload.state,
    settings: payload.settings,
    summary: summaryObj,
  };

  let localSaved = false;
  let firestoreSaved = false;

  // 1. Write to LocalStorage (Immediate synchronous durability)
  try {
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(session));
    localSaved = true;
  } catch (err) {
    console.warn('LocalStorage quota or storage error during auto-save:', err);
  }

  // 2. Write to Firebase Firestore if Firebase user is authenticated
  if (fbUser && activeUid === fbUser.uid) {
    const docPath = `users/${activeUid}/autosave/latest`;
    try {
      await setDoc(doc(db, 'users', activeUid, 'autosave', 'latest'), {
        ...session,
        userId: activeUid,
        source: 'firestore',
      });
      firestoreSaved = true;
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.WRITE, docPath);
    }
  }

  const storageTarget: AutoSaveResult['storageTarget'] =
    localSaved && firestoreSaved ? 'both' : firestoreSaved ? 'firestore' : localSaved ? 'localStorage' : 'none';

  return {
    success: localSaved || firestoreSaved,
    savedAt,
    storageTarget,
  };
}

/**
 * Retrieve the latest auto-saved timetable session from LocalStorage or Firestore
 */
export async function getLatestAutoSave(userUid?: string): Promise<AutoSaveSession | null> {
  let localSession: AutoSaveSession | null = null;
  let firestoreSession: AutoSaveSession | null = null;

  // 1. Check LocalStorage
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (raw) {
      localSession = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading auto-save from localStorage:', e);
  }

  // 2. Check Firestore if Firebase user is logged in
  const fbUser = auth.currentUser;
  const activeUid = fbUser?.uid || userUid;
  if (fbUser && activeUid === fbUser.uid) {
    const docPath = `users/${activeUid}/autosave/latest`;
    try {
      const snap = await getDoc(doc(db, 'users', activeUid, 'autosave', 'latest'));
      if (snap.exists()) {
        firestoreSession = snap.data() as AutoSaveSession;
      }
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.GET, docPath);
    }
  }

  // Determine latest session between local and firestore
  if (localSession && firestoreSession) {
    const localTime = new Date(localSession.savedAt).getTime();
    const cloudTime = new Date(firestoreSession.savedAt).getTime();
    return cloudTime > localTime ? firestoreSession : localSession;
  }

  return firestoreSession || localSession || null;
}

/**
 * Remove auto-saved snapshot
 */
export async function removeAutoSave(userUid?: string): Promise<void> {
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  const fbUser = auth.currentUser;
  const activeUid = fbUser?.uid || userUid;
  if (fbUser && activeUid === fbUser.uid) {
    const docPath = `users/${activeUid}/autosave/latest`;
    try {
      await deleteDoc(doc(db, 'users', activeUid, 'autosave', 'latest'));
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.DELETE, docPath);
    }
  }
}

/**
 * Helper to compute a lightweight structural fingerprint of timetable state for dirty checking
 */
export function computeStateFingerprint(
  state: TimetableState,
  settings: { nperiods: number; stime: string }
): string {
  try {
    const summary = {
      teachers: (state.teachers || []).map((t) => `${t.id}:${t.name}:${t.department || ''}`),
      classes: (state.classes || []).map((c) => ({
        name: c.name,
        subjects: (c.subjects || []).map((s) => `${s.subjectName}:${s.teacherId}:${s.periodsPerWeek}:${s.doublePeriods || 0}`),
      })),
      schedule: (state.schedule || []).map((s) => `${s.type}:${s.label}:${s.duration}:${s.startTime}`),
      recessPrefs: state.recessPrefs,
      notFirst: state.notFirstPeriod || [],
      notLast: state.notLastPeriod || [],
      ttKeys: Object.keys(state.tt || {}).length,
      ttSample: JSON.stringify(state.tt || {}).slice(0, 500),
      nperiods: settings.nperiods,
      stime: settings.stime,
    };
    return JSON.stringify(summary);
  } catch (e) {
    return String(Date.now());
  }
}

/**
 * Get / set user auto-save preference
 */
export function getAutoSaveEnabledPreference(): boolean {
  try {
    const val = localStorage.getItem(AUTOSAVE_CONFIG_KEY);
    return val !== null ? val === 'true' : true; // Enabled by default
  } catch (e) {
    return true;
  }
}

export function setAutoSaveEnabledPreference(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOSAVE_CONFIG_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    // ignore
  }
}
