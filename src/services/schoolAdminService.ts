import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { auth, db, SUPERUSER_EMAIL, provisionAdminAuthAccount } from '../lib/firebase';
import { School, SchoolAdmin } from '../types';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  console.error('Firestore Error in schoolAdminService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const EMAIL_REGEX = /^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 128);
}

/**
 * Subscribe to all schools (Superuser only)
 */
export function subscribeToSchools(
  onUpdate: (schools: School[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'schools'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: School[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as School), id: d.id });
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        handleFirestoreError(err, OperationType.LIST, 'schools');
      }
    }
  );
}

/**
 * Subscribe to all school admins (Superuser only)
 */
export function subscribeToSchoolAdmins(
  onUpdate: (admins: SchoolAdmin[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'school_admins'));
  return onSnapshot(
    q,
    (snap) => {
      const list: SchoolAdmin[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as SchoolAdmin), email: d.id });
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) {
        onError(err);
      } else {
        handleFirestoreError(err, OperationType.LIST, 'school_admins');
      }
    }
  );
}

/**
 * Lookup a single school admin record by email
 */
export async function getSchoolAdminByEmail(email: string): Promise<SchoolAdmin | null> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) return null;

  const path = `school_admins/${cleanEmail}`;
  try {
    const snap = await getDoc(doc(db, 'school_admins', cleanEmail));
    if (!snap.exists()) return null;
    return { ...(snap.data() as SchoolAdmin), email: snap.id };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Add a new school with its single designated School Admin (atomic writeBatch)
 */
export async function addSchoolWithAdmin(params: {
  name: string;
  code?: string;
  city?: string;
  academicYear?: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  adminRole?: 'Principal' | 'Administrator';
}): Promise<{
  schoolId: string;
  adminEmail: string;
  authProvisionStatus: 'created' | 'already-exists' | 'google-only';
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in as Superuser.');
  }

  const schoolName = params.name.trim().slice(0, 120);
  const adminName = params.adminName.trim().slice(0, 100);
  const adminEmail = normalizeEmail(params.adminEmail);
  const adminPassword = (params.adminPassword || '').trim();
  const adminRole = params.adminRole === 'Administrator' ? 'Administrator' : 'Principal';
  const code = (params.code || '').trim().slice(0, 32);
  const city = (params.city || '').trim().slice(0, 80);
  const academicYear = (params.academicYear || '2026–2027').trim().slice(0, 32);

  if (schoolName.length < 2) {
    throw new Error('School name must be at least 2 characters.');
  }
  if (adminName.length < 2) {
    throw new Error('Admin name must be at least 2 characters.');
  }
  if (!EMAIL_REGEX.test(adminEmail)) {
    throw new Error('Please enter a valid admin email address.');
  }
  if (adminEmail === SUPERUSER_EMAIL.toLowerCase()) {
    throw new Error('Superuser email cannot be assigned as a school admin.');
  }
  if (adminPassword && adminPassword.length < 6) {
    throw new Error('Admin password must be at least 6 characters.');
  }

  // Enforce 1 admin per school and prevent duplicate admin email across schools
  try {
    const existingAdminSnap = await getDoc(doc(db, 'school_admins', adminEmail));
    if (existingAdminSnap.exists()) {
      const existing = existingAdminSnap.data() as SchoolAdmin;
      throw new Error(`Email ${adminEmail} is already assigned as admin for "${existing.schoolName}".`);
    }

    const existingSchoolsSnap = await getDocs(query(collection(db, 'schools'), where('name', '==', schoolName)));
    if (!existingSchoolsSnap.empty) {
      throw new Error(`School "${schoolName}" already exists.`);
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('already assigned') || err.message.includes('already exists'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, `school_admins/${adminEmail}`);
  }

  // Provision Firebase Auth Email/Password credentials if password provided
  let authProvisionStatus: 'created' | 'already-exists' | 'google-only' = 'google-only';
  if (adminPassword) {
    const prov = await provisionAdminAuthAccount({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
    });
    if (prov.status === 'error') {
      throw new Error(prov.error || 'Failed to create Firebase login credentials.');
    }
    authProvisionStatus = prov.status;
  }

  const slug = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const schoolId = `sch_${slug || 'school'}_${Date.now()}`;

  const batch = writeBatch(db);
  const schoolRef = doc(db, 'schools', schoolId);
  const adminRef = doc(db, 'school_admins', adminEmail);

  batch.set(schoolRef, {
    id: schoolId,
    name: schoolName,
    code,
    city,
    academicYear,
    adminEmail,
    adminName,
    adminRole,
    adminStatus: 'active',
    blockedReason: '',
    blockedAt: '',
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(adminRef, {
    email: adminEmail,
    name: adminName,
    schoolId,
    schoolName,
    role: adminRole,
    status: 'active',
    blockedReason: '',
    blockedAt: '',
    blockedBy: '',
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { schoolId, adminEmail, authProvisionStatus };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `schools/${schoolId}`);
  }
}

/**
 * Reassign / replace the designated admin for an existing school (enforces 1 admin per school)
 */
export async function reassignSchoolAdmin(params: {
  school: School;
  newAdminName: string;
  newAdminEmail: string;
  newAdminPassword?: string;
  newAdminRole?: 'Principal' | 'Administrator';
}): Promise<{ authProvisionStatus: 'created' | 'already-exists' | 'google-only' }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in as Superuser.');
  }

  const newName = params.newAdminName.trim().slice(0, 100);
  const newEmail = normalizeEmail(params.newAdminEmail);
  const newPassword = (params.newAdminPassword || '').trim();
  const oldEmail = normalizeEmail(params.school.adminEmail);
  const newRole = params.newAdminRole === 'Administrator' ? 'Administrator' : 'Principal';

  if (newName.length < 2) {
    throw new Error('Admin name must be at least 2 characters.');
  }
  if (!EMAIL_REGEX.test(newEmail)) {
    throw new Error('Please enter a valid admin email address.');
  }
  if (newEmail === SUPERUSER_EMAIL.toLowerCase()) {
    throw new Error('Superuser email cannot be assigned as a school admin.');
  }
  if (newPassword && newPassword.length < 6) {
    throw new Error('Admin password must be at least 6 characters.');
  }

  if (newEmail !== oldEmail) {
    try {
      const dupSnap = await getDoc(doc(db, 'school_admins', newEmail));
      if (dupSnap.exists()) {
        const dup = dupSnap.data() as SchoolAdmin;
        throw new Error(`Email ${newEmail} is already assigned to "${dup.schoolName}".`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('already assigned')) throw err;
      handleFirestoreError(err, OperationType.GET, `school_admins/${newEmail}`);
    }
  }

  let authProvisionStatus: 'created' | 'already-exists' | 'google-only' = 'google-only';
  if (newPassword) {
    const prov = await provisionAdminAuthAccount({
      email: newEmail,
      password: newPassword,
      displayName: newName,
    });
    if (prov.status === 'error') {
      throw new Error(prov.error || 'Failed to create Firebase login credentials.');
    }
    authProvisionStatus = prov.status;
  }

  const batch = writeBatch(db);
  const schoolRef = doc(db, 'schools', params.school.id);

  batch.update(schoolRef, {
    adminEmail: newEmail,
    adminName: newName,
    adminRole: newRole,
    adminStatus: 'active',
    blockedReason: '',
    blockedAt: '',
    updatedAt: serverTimestamp(),
  });

  if (newEmail !== oldEmail) {
    if (oldEmail && EMAIL_REGEX.test(oldEmail)) {
      batch.delete(doc(db, 'school_admins', oldEmail));
    }
    batch.set(doc(db, 'school_admins', newEmail), {
      email: newEmail,
      name: newName,
      schoolId: params.school.id,
      schoolName: params.school.name,
      role: newRole,
      status: 'active',
      blockedReason: '',
      blockedAt: '',
      blockedBy: '',
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(doc(db, 'school_admins', newEmail), {
      name: newName,
      role: newRole,
      status: 'active',
      blockedReason: '',
      blockedAt: '',
      blockedBy: '',
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return { authProvisionStatus };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `schools/${params.school.id}`);
  }
}

/**
 * Block any school admin immediately (Superuser only)
 */
export async function blockSchoolAdmin(
  schoolId: string,
  adminEmail: string,
  reason: string = 'Blocked by Superuser'
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in as Superuser.');
  }

  const cleanEmail = normalizeEmail(adminEmail);
  const cleanReason = (reason.trim() || 'Blocked by Superuser').slice(0, 300);
  const blockedAt = new Date().toISOString();

  const batch = writeBatch(db);
  batch.update(doc(db, 'schools', schoolId), {
    adminStatus: 'blocked',
    blockedReason: cleanReason,
    blockedAt,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'school_admins', cleanEmail), {
    status: 'blocked',
    blockedReason: cleanReason,
    blockedAt,
    blockedBy: currentUser.email || currentUser.uid,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `school_admins/${cleanEmail}`);
  }
}

/**
 * Unblock a previously blocked school admin (Superuser only)
 */
export async function unblockSchoolAdmin(schoolId: string, adminEmail: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in as Superuser.');
  }

  const cleanEmail = normalizeEmail(adminEmail);

  const batch = writeBatch(db);
  batch.update(doc(db, 'schools', schoolId), {
    adminStatus: 'active',
    blockedReason: '',
    blockedAt: '',
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'school_admins', cleanEmail), {
    status: 'active',
    blockedReason: '',
    blockedAt: '',
    blockedBy: '',
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `school_admins/${cleanEmail}`);
  }
}

/**
 * Delete a school and its designated admin assignment atomically (Superuser only)
 */
export async function deleteSchoolAndAdmin(schoolId: string, adminEmail: string): Promise<void> {
  const cleanEmail = normalizeEmail(adminEmail);
  const batch = writeBatch(db);
  batch.delete(doc(db, 'schools', schoolId));
  if (cleanEmail && EMAIL_REGEX.test(cleanEmail)) {
    batch.delete(doc(db, 'school_admins', cleanEmail));
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `schools/${schoolId}`);
  }
}
