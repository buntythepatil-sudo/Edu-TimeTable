import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const SUPERUSER_EMAIL = 'buntythepatil@gmail.com';
const PROVISIONING_APP_NAME = 'schoolgrid-admin-provisioning';

// Initialize primary Firebase App instance singleton
export const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore database instance using configured databaseId or default
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== ''
    ? firebaseConfig.firestoreDatabaseId
    : '(default)'
);

function getProvisioningApp(): FirebaseApp {
  return (
    getApps().find((a) => a.name === PROVISIONING_APP_NAME) ||
    initializeApp(firebaseConfig, PROVISIONING_APP_NAME)
  );
}

/**
 * Provision an Email/Password login in Firebase Auth using a secondary app instance
 * so the active Superuser session is not disturbed.
 */
export async function provisionAdminAuthAccount(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ status: 'created' | 'already-exists' | 'error'; error?: string }> {
  const secAuth = getAuth(getProvisioningApp());
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, params.email, params.password);
    try {
      await updateProfile(cred.user, { displayName: params.displayName });
    } catch {
      // optional display name sync
    }
    return { status: 'created' };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      return { status: 'already-exists' };
    }
    if (err?.code === 'auth/operation-not-allowed') {
      return {
        status: 'error',
        error:
          'Email/Password sign-in provider is disabled in Firebase Console. Enable Authentication -> Sign-in method -> Email/Password first.',
      };
    }
    if (err?.code === 'auth/weak-password') {
      return { status: 'error', error: 'Password must be at least 6 characters.' };
    }
    if (err?.code === 'auth/invalid-email') {
      return { status: 'error', error: 'Invalid admin email address.' };
    }
    return { status: 'error', error: err?.message || 'Failed to provision admin login credentials.' };
  } finally {
    try {
      await signOut(secAuth);
    } catch {
      // ignore cleanup errors
    }
  }
}

// Startup connection verification against Firestore server
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore client is offline.');
    }
  }
}

testConnection();

