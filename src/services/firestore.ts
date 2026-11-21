import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth } from './firebaseAuth';
import { MatchState } from '../types/tennis';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
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
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot as required by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or waiting for network.');
    }
  }
}
testConnection();

/**
 * Save match to Firestore (gracefully skips if unauthenticated since rules require auth)
 */
export async function saveMatchToFirestore(match: MatchState, userId?: string) {
  const effectiveUid = userId || auth.currentUser?.uid;
  if (!effectiveUid) return;

  const path = `matches/${match.id}`;
  try {
    const matchRef = doc(db, 'matches', match.id);
    // Strip redoStack before cloud persistence to stay well under 1MB limit
    const { redoStack: _r, ...cleanMatch } = match;
    await setDoc(
      matchRef,
      {
        ...cleanMatch,
        userId: effectiveUid,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save match to Firestore:', err);
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

/**
 * Get match from Firestore
 */
export async function getMatchFromFirestore(matchId: string): Promise<MatchState | null> {
  const path = `matches/${matchId}`;
  try {
    const matchRef = doc(db, 'matches', matchId);
    const snap = await getDoc(matchRef);
    if (snap.exists()) {
      return snap.data() as MatchState;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load match from Firestore:', err);
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    return null;
  }
}

/**
 * List recent match history from Firestore
 */
export async function getMatchHistoryFromFirestore(limitCount = 50): Promise<MatchState[]> {
  const path = 'matches';
  try {
    const q = query(
      collection(db, path),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MatchState);
  } catch (err) {
    console.warn('Failed to list matches from Firestore:', err);
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
    return [];
  }
}

/**
 * Delete a match from Firestore (only succeeds for owner per security rules)
 */
export async function deleteMatchFromFirestore(matchId: string): Promise<void> {
  if (!auth.currentUser?.uid) return;
  const path = `matches/${matchId}`;
  try {
    await deleteDoc(doc(db, 'matches', matchId));
  } catch (err) {
    console.warn('Failed to delete match from Firestore:', err);
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
}
