import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseUserAuth,
  updatePassword,
  linkWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider, SUPERUSER_EMAIL } from '../lib/firebase';
import { getSchoolAdminByEmail } from '../services/schoolAdminService';
import { SchoolAdmin, UserProfile } from '../types';

export interface BlockedDetails {
  email: string;
  schoolName?: string;
  reason?: string;
  blockedAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isAuthorizedFacilityUser: boolean;
  hasPasswordProvider: boolean;
  isBlocked: boolean;
  blockedDetails: BlockedDetails | null;
  assignedAdminRecord: SchoolAdmin | null;
  accessError: string | null;
  clearAccessError: () => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  sendResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  uploadAvatarImage: (file: File) => Promise<{ success: boolean; avatarUrl?: string; error?: string }>;
}

const LOCAL_PROFILE_CACHE_KEY = 'schoolgrid_auth_user_profile_v4';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEFAULT_PRINCIPAL_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
];

function sanitizeUsername(val: string): string {
  const cleaned = val.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_').slice(0, 60);
  return cleaned || 'school_admin';
}

function buildValidProfileDoc(
  uid: string,
  email: string,
  overrides: Partial<UserProfile> = {}
): UserProfile {
  const cleanEmail = (email || 'admin@schoolgrid.app').trim().toLowerCase().slice(0, 128);
  const defaultUsername = sanitizeUsername(overrides.username || cleanEmail.split('@')[0] || 'admin');
  const now = new Date().toISOString();

  const profile: UserProfile = {
    id: uid,
    uid,
    username: defaultUsername,
    email: cleanEmail,
    name: (overrides.name || cleanEmail.split('@')[0] || 'Administrator').trim().slice(0, 120),
    role: overrides.role || 'Principal',
    institutionName: (overrides.institutionName || 'SchoolGrid Academy').trim().slice(0, 150),
    avatarUrl: overrides.avatarUrl || DEFAULT_PRINCIPAL_AVATARS[0],
    academicYear: (overrides.academicYear || '2026–2027').slice(0, 32),
    themePreference: overrides.themePreference || 'light',
    createdAt: overrides.createdAt || now,
    updatedAt: now,
    lastLoginAt: now,
    savedTimetablesCount: typeof overrides.savedTimetablesCount === 'number' ? overrides.savedTimetablesCount : 0,
  };

  if (overrides.schoolId) profile.schoolId = overrides.schoolId.slice(0, 128);
  if (typeof overrides.isBlocked === 'boolean') profile.isBlocked = overrides.isBlocked;
  if (overrides.department) profile.department = overrides.department.slice(0, 120);
  if (overrides.phoneNumber) profile.phoneNumber = overrides.phoneNumber.slice(0, 40);
  if (overrides.officeHours) profile.officeHours = overrides.officeHours.slice(0, 120);
  if (overrides.qualifications) profile.qualifications = overrides.qualifications.slice(0, 200);
  if (overrides.bio) profile.bio = overrides.bio.slice(0, 500);
  if (overrides.institutionLogo) profile.institutionLogo = overrides.institutionLogo.slice(0, 500000);

  return profile;
}

function isSuperuserFirebaseUser(fbUser: FirebaseUser | null): boolean {
  return Boolean(
    fbUser &&
      !fbUser.isAnonymous &&
      fbUser.emailVerified === true &&
      fbUser.email?.toLowerCase() === SUPERUSER_EMAIL.toLowerCase()
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
  const [hasPasswordProvider, setHasPasswordProvider] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockedDetails, setBlockedDetails] = useState<BlockedDetails | null>(null);
  const [assignedAdminRecord, setAssignedAdminRecord] = useState<SchoolAdmin | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAccessError = () => setAccessError(null);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeAdminDoc: (() => void) | null = null;

    const cleanupListeners = () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
      if (unsubscribeAdminDoc) {
        unsubscribeAdminDoc();
        unsubscribeAdminDoc = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      cleanupListeners();

      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setIsSuperuser(false);
        setHasPasswordProvider(false);
        setIsBlocked(false);
        setBlockedDetails(null);
        setAssignedAdminRecord(null);
        setIsLoading(false);
        return;
      }

      if (fbUser.isAnonymous) {
        setFirebaseUser(null);
        setUser(null);
        setIsSuperuser(false);
        setHasPasswordProvider(false);
        setIsBlocked(false);
        setBlockedDetails(null);
        setAssignedAdminRecord(null);
        setIsLoading(false);
        signOut(auth).catch(() => {});
        return;
      }

      setFirebaseUser(fbUser);
      setHasPasswordProvider(fbUser.providerData.some((p) => p.providerId === 'password'));
      const emailLower = (fbUser.email || '').trim().toLowerCase();
      const superCheck = isSuperuserFirebaseUser(fbUser);

      // Strict check: superuser email MUST have verified email claim (no unverified bypass)
      if (emailLower === SUPERUSER_EMAIL.toLowerCase() && !fbUser.emailVerified) {
        setAccessError('Superuser access requires verified Google Sign-In.');
        setUser(null);
        setIsSuperuser(false);
        setIsBlocked(false);
        setAssignedAdminRecord(null);
        setIsLoading(false);
        signOut(auth).catch(() => {});
        return;
      }

      setIsSuperuser(superCheck);

      const subscribeToUserProfile = (adminOverride?: SchoolAdmin | null) => {
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }

        const userDocRef = doc(db, 'users', fbUser.uid);
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const raw = docSnap.data() as UserProfile;
              const synced: UserProfile = {
                ...raw,
                role: superCheck
                  ? 'Superuser'
                  : adminOverride
                  ? adminOverride.role
                  : raw.role === 'Superuser'
                  ? 'Principal'
                  : raw.role,
                institutionName: superCheck
                  ? raw.institutionName || 'SchoolGrid Central Administration'
                  : adminOverride
                  ? adminOverride.schoolName
                  : raw.institutionName,
                schoolId: adminOverride ? adminOverride.schoolId : raw.schoolId,
                isBlocked: false,
              };
              setUser(synced);
              localStorage.setItem(LOCAL_PROFILE_CACHE_KEY, JSON.stringify(synced));

              if (superCheck && raw.role !== 'Superuser') {
                try {
                  await updateDoc(userDocRef, {
                    role: 'Superuser',
                    updatedAt: new Date().toISOString(),
                  });
                } catch {
                  // ignore sync failures
                }
              } else if (
                adminOverride &&
                (raw.schoolId !== adminOverride.schoolId ||
                  raw.institutionName !== adminOverride.schoolName ||
                  raw.role !== adminOverride.role)
              ) {
                try {
                  await updateDoc(userDocRef, {
                    schoolId: adminOverride.schoolId,
                    institutionName: adminOverride.schoolName,
                    role: adminOverride.role,
                    isBlocked: false,
                    updatedAt: new Date().toISOString(),
                  });
                } catch {
                  // ignore
                }
              }
            } else {
              const initialProfile = buildValidProfileDoc(fbUser.uid, emailLower, {
                name: superCheck
                  ? fbUser.displayName || 'Superuser'
                  : adminOverride?.name || fbUser.displayName || 'School Administrator',
                role: superCheck ? 'Superuser' : adminOverride?.role || 'Principal',
                institutionName: superCheck
                  ? 'SchoolGrid Central Administration'
                  : adminOverride?.schoolName || 'SchoolGrid Academy',
                schoolId: adminOverride?.schoolId,
                isBlocked: false,
                avatarUrl: fbUser.photoURL || DEFAULT_PRINCIPAL_AVATARS[0],
                department: superCheck
                  ? 'Global System Governance'
                  : 'School Leadership & Curriculum Administration',
              });
              try {
                await setDoc(userDocRef, initialProfile);
              } catch (writeErr) {
                console.warn('Could not initialize user profile in Firestore:', writeErr);
              }
              setUser(initialProfile);
              localStorage.setItem(LOCAL_PROFILE_CACHE_KEY, JSON.stringify(initialProfile));
            }
            setIsLoading(false);
          },
          (err) => {
            console.warn('User profile listener warning:', err);
            setIsLoading(false);
          }
        );
      };

      if (superCheck) {
        setAccessError(null);
        setIsBlocked(false);
        setBlockedDetails(null);
        setAssignedAdminRecord(null);
        subscribeToUserProfile(null);
        return;
      }

      // Non-superuser MUST exist in /school_admins/{email} and be active
      if (!emailLower) {
        setAccessError('Access denied: account has no verified email identifier.');
        setUser(null);
        setAssignedAdminRecord(null);
        setIsBlocked(false);
        setIsLoading(false);
        signOut(auth).catch(() => {});
        return;
      }

      const adminRef = doc(db, 'school_admins', emailLower);
      unsubscribeAdminDoc = onSnapshot(
        adminRef,
        (adminSnap) => {
          if (!adminSnap.exists()) {
            // Unauthorized account: immediately sign out and reject access
            setAccessError(
              `Access denied: "${emailLower}" is not authorized as a School Admin. Please request credentials from the Superuser.`
            );
            setAssignedAdminRecord(null);
            setIsBlocked(false);
            setBlockedDetails(null);
            setUser(null);
            setIsLoading(false);
            if (unsubscribeUserDoc) {
              unsubscribeUserDoc();
              unsubscribeUserDoc = null;
            }
            localStorage.removeItem(LOCAL_PROFILE_CACHE_KEY);
            signOut(auth).catch(() => {});
            return;
          }

          const adminData = { ...(adminSnap.data() as SchoolAdmin), email: adminSnap.id };
          setAssignedAdminRecord(adminData);
          setAccessError(null);

          if (adminData.status === 'blocked') {
            setIsBlocked(true);
            setBlockedDetails({
              email: adminData.email,
              schoolName: adminData.schoolName,
              reason: adminData.blockedReason || 'Blocked by Superuser',
              blockedAt: adminData.blockedAt,
            });
            if (unsubscribeUserDoc) {
              unsubscribeUserDoc();
              unsubscribeUserDoc = null;
            }
            setUser(
              buildValidProfileDoc(fbUser.uid, emailLower, {
                name: adminData.name || fbUser.displayName || 'Blocked Admin',
                role: adminData.role,
                institutionName: adminData.schoolName,
                schoolId: adminData.schoolId,
                isBlocked: true,
                avatarUrl: fbUser.photoURL || DEFAULT_PRINCIPAL_AVATARS[0],
              })
            );
            setIsLoading(false);
          } else {
            setIsBlocked(false);
            setBlockedDetails(null);
            subscribeToUserProfile(adminData);
          }
        },
        (err) => {
          console.warn('school_admins verification error:', err);
          setAccessError('Unable to verify admin authorization. Please try signing in again.');
          setAssignedAdminRecord(null);
          setIsBlocked(false);
          setUser(null);
          setIsLoading(false);
          signOut(auth).catch(() => {});
        }
      );
    });

    return () => {
      cleanupListeners();
      unsubscribeAuth();
    };
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAccessError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const cleanEmail = (fbUser.email || '').trim().toLowerCase();
      const superCheck = isSuperuserFirebaseUser(fbUser);

      if (cleanEmail === SUPERUSER_EMAIL.toLowerCase() && !fbUser.emailVerified) {
        await signOut(auth);
        const msg = 'Superuser sign-in requires a verified email.';
        setAccessError(msg);
        return { success: false, error: msg };
      }

      if (!superCheck) {
        const adminRecord = cleanEmail ? await getSchoolAdminByEmail(cleanEmail) : null;
        if (!adminRecord) {
          await signOut(auth);
          const msg = `Access denied: "${cleanEmail || 'this account'}" is not registered as a School Admin by the Superuser.`;
          setAccessError(msg);
          return { success: false, error: msg };
        }
        if (adminRecord.status === 'blocked') {
          setIsBlocked(true);
          setBlockedDetails({
            email: adminRecord.email,
            schoolName: adminRecord.schoolName,
            reason: adminRecord.blockedReason || 'Blocked by Superuser',
            blockedAt: adminRecord.blockedAt,
          });
          return {
            success: false,
            error: `Your admin account (${cleanEmail}) is blocked by the Superuser${
              adminRecord.blockedReason ? `: ${adminRecord.blockedReason}` : '.'
            }`,
          };
        }
      }

      return { success: true };
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google sign-in popup was closed before completing.' };
      }
      if (err?.code === 'auth/popup-blocked') {
        return { success: false, error: 'Sign-in popup was blocked by your browser. Please allow popups and retry.' };
      }
      if (err?.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: 'Google sign-in is not enabled in Firebase Console -> Authentication -> Sign-in method.',
        };
      }
      return { success: false, error: err?.message || 'Google sign-in failed.' };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setAccessError(null);
    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail || !pass) {
        return { success: false, error: 'Please provide both Login ID (email) and password.' };
      }

      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      } catch (authErr: any) {
        if (
          authErr?.code === 'auth/user-not-found' ||
          authErr?.code === 'auth/invalid-credential' ||
          authErr?.code === 'auth/wrong-password'
        ) {
          if (cleanEmail === SUPERUSER_EMAIL.toLowerCase()) {
            return {
              success: false,
              error:
                'Incorrect password or no password set yet for Superuser. Sign in via Google first, then create your Superuser password in Superuser Console or Security & Password.',
            };
          }
          return {
            success: false,
            error: 'Incorrect Login ID or password. Please verify credentials with the Superuser.',
          };
        }
        if (authErr?.code === 'auth/operation-not-allowed') {
          return {
            success: false,
            error: 'Email/Password sign-in is disabled in Firebase Console. Enable it in Authentication -> Sign-in method.',
          };
        }
        if (authErr?.code === 'auth/too-many-requests') {
          return { success: false, error: 'Too many failed attempts. Please wait a moment and try again.' };
        }
        return { success: false, error: authErr?.message || 'Failed to sign in.' };
      }

      const fbUser = cred.user;
      if (cleanEmail === SUPERUSER_EMAIL.toLowerCase() && !fbUser.emailVerified) {
        await signOut(auth);
        const msg = 'Superuser access requires verified Google Sign-In.';
        setAccessError(msg);
        return { success: false, error: msg };
      }

      const superCheck = isSuperuserFirebaseUser(fbUser);
      if (!superCheck) {
        const adminRecord = await getSchoolAdminByEmail(cleanEmail);
        if (!adminRecord) {
          await signOut(auth);
          const msg = `Access denied: "${cleanEmail}" is not authorized as an active School Admin.`;
          setAccessError(msg);
          return { success: false, error: msg };
        }
        if (adminRecord.status === 'blocked') {
          setIsBlocked(true);
          setBlockedDetails({
            email: adminRecord.email,
            schoolName: adminRecord.schoolName,
            reason: adminRecord.blockedReason || 'Blocked by Superuser',
            blockedAt: adminRecord.blockedAt,
          });
          return {
            success: false,
            error: `Your admin account (${cleanEmail}) is blocked by the Superuser${
              adminRecord.blockedReason ? `: ${adminRecord.blockedReason}` : '.'
            }`,
          };
        }
      }

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          await updateDoc(userDocRef, { lastLoginAt: new Date().toISOString() });
        }
      } catch {
        // listener will initialize/reconcile profile doc
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to sign in.' };
    }
  };

  const logout = async () => {
    setAccessError(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    setUser(null);
    setFirebaseUser(null);
    setIsSuperuser(false);
    setHasPasswordProvider(false);
    setIsBlocked(false);
    setBlockedDetails(null);
    setAssignedAdminRecord(null);
    localStorage.removeItem(LOCAL_PROFILE_CACHE_KEY);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    const fbUser = auth.currentUser;
    if (!user || !fbUser || fbUser.isAnonymous) {
      return { success: false, error: 'Please sign in to update your profile.' };
    }
    if (isBlocked && !isSuperuser) {
      return { success: false, error: 'Blocked accounts cannot modify profile settings.' };
    }

    try {
      const sanitizedUsername = updates.username ? sanitizeUsername(updates.username) : user.username;
      const safeRole: UserProfile['role'] = isSuperuser
        ? 'Superuser'
        : updates.role && updates.role !== 'Superuser'
        ? updates.role
        : user.role === 'Superuser'
        ? 'Principal'
        : user.role;

      const updated = buildValidProfileDoc(fbUser.uid, user.email, {
        ...user,
        ...updates,
        username: sanitizedUsername,
        role: safeRole,
        institutionName: assignedAdminRecord ? assignedAdminRecord.schoolName : updates.institutionName ?? user.institutionName,
        schoolId: assignedAdminRecord ? assignedAdminRecord.schoolId : user.schoolId,
        isBlocked: false,
      });

      await setDoc(doc(db, 'users', fbUser.uid), updated, { merge: true });

      try {
        await updateFirebaseUserAuth(fbUser, {
          displayName: updated.name,
          photoURL: updated.avatarUrl,
        });
      } catch {
        // optional display sync
      }

      setUser(updated);
      localStorage.setItem(LOCAL_PROFILE_CACHE_KEY, JSON.stringify(updated));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile.' };
    }
  };

  const uploadAvatarImage = async (file: File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> => {
    try {
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Please select a valid image file (PNG, JPEG, WebP).' };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Image size must be under 5 MB.' };
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
              resolve({ success: true, avatarUrl: dataUrl });
            } else {
              resolve({ success: true, avatarUrl: e.target?.result as string });
            }
          };
          img.onerror = () => resolve({ success: false, error: 'Could not parse image.' });
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve({ success: false, error: 'Failed to read image file.' });
        reader.readAsDataURL(file);
      });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to process image.' };
    }
  };

  const changePassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const fbUser = auth.currentUser;
    if (!user || !fbUser || fbUser.isAnonymous || !fbUser.email) {
      return { success: false, error: 'Not authenticated' };
    }
    if (newPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const alreadyHasPassword = fbUser.providerData.some((p) => p.providerId === 'password');

    try {
      if (alreadyHasPassword) {
        if (!oldPass) {
          return { success: false, error: 'Please enter your current password.' };
        }
        const credential = EmailAuthProvider.credential(fbUser.email, oldPass);
        await reauthenticateWithCredential(fbUser, credential);
        await updatePassword(fbUser, newPass);
      } else {
        const emailCredential = EmailAuthProvider.credential(fbUser.email, newPass);
        try {
          await linkWithCredential(fbUser, emailCredential);
        } catch (linkErr: any) {
          if (linkErr?.code === 'auth/requires-recent-login') {
            await reauthenticateWithPopup(fbUser, googleProvider);
            await linkWithCredential(fbUser, emailCredential);
          } else if (linkErr?.code === 'auth/provider-already-linked') {
            await updatePassword(fbUser, newPass);
          } else {
            throw linkErr;
          }
        }
      }

      try {
        await fbUser.reload();
      } catch {
        // ignore reload failure
      }
      setFirebaseUser(auth.currentUser);
      setHasPasswordProvider(
        Boolean(auth.currentUser?.providerData?.some((p) => p.providerId === 'password') ?? true)
      );
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error:
            'Email/Password sign-in provider is disabled in Firebase Console. Enable Authentication -> Sign-in method -> Email/Password first.',
        };
      }
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        return { success: false, error: 'Current password is incorrect.' };
      }
      if (err?.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google verification popup was closed before finishing.' };
      }
      if (err?.code === 'auth/weak-password') {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }
      return { success: false, error: err?.message || 'Could not save password. Please try again.' };
    }
  };

  const sendResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your Login ID (email) first.' };
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: 'Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication -> Sign-in method.',
        };
      }
      return { success: false, error: err?.message || 'Failed to send password reset email.' };
    }
  };

  const isAuthenticated = Boolean(firebaseUser && !firebaseUser.isAnonymous && user);
  const isAuthorizedFacilityUser = Boolean(
    isAuthenticated &&
      !isBlocked &&
      (isSuperuser || (assignedAdminRecord && assignedAdminRecord.status === 'active'))
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated,
        isSuperuser,
        isAuthorizedFacilityUser,
        hasPasswordProvider,
        isBlocked,
        blockedDetails,
        assignedAdminRecord,
        accessError,
        clearAccessError,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        changePassword,
        sendResetEmail,
        uploadAvatarImage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
