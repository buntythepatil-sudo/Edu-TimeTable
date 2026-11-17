import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, SUPERUSER_EMAIL } from '../lib/firebase';
import { SavedTimetable } from '../types';

export const LOCAL_SAVES_KEY = 'schoolgrid_saved_timetables_v2';

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
  console.error('Firestore Error in timetableStorage: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function isCurrentUserSuperuser(): boolean {
  const u = auth.currentUser;
  return Boolean(u && u.emailVerified === true && u.email?.toLowerCase() === SUPERUSER_EMAIL.toLowerCase());
}

/**
 * Load local saved timetables from localStorage
 */
export function getLocalSavedTimetables(): SavedTimetable[] {
  try {
    const raw = localStorage.getItem(LOCAL_SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading local saved timetables:', err);
    return [];
  }
}

/**
 * Save to localStorage cache
 */
export function setLocalSavedTimetables(saves: SavedTimetable[]): void {
  try {
    localStorage.setItem(LOCAL_SAVES_KEY, JSON.stringify(saves));
  } catch (err) {
    console.warn('Error writing local saved timetables:', err);
  }
}

/**
 * Save a timetable online in Firebase Firestore (and mirror locally)
 */
export async function saveTimetableOnline(
  timetable: SavedTimetable,
  userId?: string
): Promise<{ success: boolean; isCloud: boolean; error?: string }> {
  let isCloud = false;

  // 1. Mirror locally first
  const localList = getLocalSavedTimetables();
  const existingIdx = localList.findIndex((s) => s.id === timetable.id);
  let updatedLocal: SavedTimetable[];
  if (existingIdx >= 0) {
    updatedLocal = [...localList];
    updatedLocal[existingIdx] = timetable;
  } else {
    updatedLocal = [timetable, ...localList];
  }
  setLocalSavedTimetables(updatedLocal);

  // 2. Write to Firebase Firestore online collection only when Firebase Auth user exists
  const fbUser = auth.currentUser;
  if (!fbUser) {
    return { success: true, isCloud: false };
  }

  const activeUid = fbUser.uid;
  const docId = timetable.id;
  const cloudData: Record<string, unknown> = {
    id: docId,
    name: timetable.name.slice(0, 160),
    userId: activeUid,
    savedAt: timetable.savedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    state: timetable.state,
    settings: timetable.settings,
  };
  if (typeof timetable.notes === 'string' && timetable.notes.length > 0) {
    cloudData.notes = timetable.notes.slice(0, 500);
  }
  if (Array.isArray(timetable.tags) && timetable.tags.length > 0) {
    cloudData.tags = timetable.tags.slice(0, 20);
  }

  try {
    // Write to shared collection scoped to activeUid
    await setDoc(doc(db, 'saved_timetables', docId), cloudData);
    isCloud = true;

    // Also write to user subcollection
    const targetSubUid = userId && userId === activeUid ? userId : activeUid;
    await setDoc(doc(db, 'users', targetSubUid, 'timetables', docId), cloudData);
  } catch (fsErr) {
    handleFirestoreError(fsErr, OperationType.WRITE, `saved_timetables/${docId}`);
  }

  return { success: true, isCloud };
}

/**
 * Retrieve saved timetables online from Firebase Firestore, merged with local cache
 */
export async function fetchSavedTimetablesOnline(
  userId?: string
): Promise<{ timetables: SavedTimetable[]; isOnline: boolean }> {
  const localList = getLocalSavedTimetables();
  const resultMap = new Map<string, SavedTimetable>();

  // Seed with local items
  for (const item of localList) {
    resultMap.set(item.id, item);
  }

  const fbUser = auth.currentUser;
  if (!fbUser) {
    const combinedLocal = Array.from(resultMap.values()).sort(
      (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
    );
    return { timetables: combinedLocal, isOnline: false };
  }

  let isOnline = false;

  try {
    // 1. Query Firestore saved_timetables collection (scoped for non-superusers to satisfy security rules)
    const q = isCurrentUserSuperuser()
      ? query(collection(db, 'saved_timetables'))
      : query(collection(db, 'saved_timetables'), where('userId', '==', fbUser.uid));
    const snap = await getDocs(q);
    isOnline = true;

    snap.forEach((d) => {
      const data = d.data() as SavedTimetable;
      if (data && data.id && data.name) {
        resultMap.set(data.id, {
          ...data,
          id: data.id || d.id,
        });
      }
    });

    // 2. Also check user's subcollection scoped to authenticated uid
    const activeUid = userId && userId === fbUser.uid ? userId : fbUser.uid;
    const userSubQ = query(collection(db, 'users', activeUid, 'timetables'), where('userId', '==', activeUid));
    const userSubSnap = await getDocs(userSubQ);
    userSubSnap.forEach((d) => {
      const data = d.data() as SavedTimetable;
      if (data && data.id && data.name) {
        resultMap.set(data.id, {
          ...data,
          id: data.id || d.id,
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'saved_timetables');
  }

  const combined = Array.from(resultMap.values()).sort(
    (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
  );

  setLocalSavedTimetables(combined);

  return { timetables: combined, isOnline };
}

/**
 * Delete a timetable online from Firebase Firestore and localStorage
 */
export async function deleteTimetableOnline(
  id: string,
  userId?: string
): Promise<{ success: boolean; isCloudDeleted: boolean }> {
  // 1. Remove from local storage
  const localList = getLocalSavedTimetables();
  const updatedLocal = localList.filter((s) => s.id !== id);
  setLocalSavedTimetables(updatedLocal);

  const fbUser = auth.currentUser;
  if (!fbUser) {
    return { success: true, isCloudDeleted: false };
  }

  let isCloudDeleted = false;

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(db, 'saved_timetables', id));
    isCloudDeleted = true;

    const activeUid = userId && userId === fbUser.uid ? userId : fbUser.uid;
    await deleteDoc(doc(db, 'users', activeUid, 'timetables', id));
  } catch (fsErr) {
    handleFirestoreError(fsErr, OperationType.DELETE, `saved_timetables/${id}`);
  }

  return { success: true, isCloudDeleted };
}

/**
 * Subscribe to real-time updates for saved timetables in Firestore
 */
export function subscribeToSavedTimetablesOnline(
  onUpdate: (timetables: SavedTimetable[]) => void
): () => void {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    return () => {};
  }

  try {
    const q = isCurrentUserSuperuser()
      ? query(collection(db, 'saved_timetables'))
      : query(collection(db, 'saved_timetables'), where('userId', '==', fbUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cloudItems: SavedTimetable[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as SavedTimetable;
          if (item && item.id && item.name) {
            cloudItems.push({ ...item, id: item.id || d.id });
          }
        });

        const localList = getLocalSavedTimetables();
        const map = new Map<string, SavedTimetable>();
        for (const localItem of localList) map.set(localItem.id, localItem);
        for (const cloudItem of cloudItems) map.set(cloudItem.id, cloudItem);

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
        );

        setLocalSavedTimetables(merged);
        onUpdate(merged);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'saved_timetables');
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup online saved timetables listener:', err);
    return () => {};
  }
}
