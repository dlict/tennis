import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MatchState } from '../types/tennis';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

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
 * Save match to Firestore
 */
export async function saveMatchToFirestore(match: MatchState, userId?: string) {
  try {
    const matchRef = doc(db, 'matches', match.id);
    await setDoc(matchRef, {
      ...match,
      userId: userId || null,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to save match to Firestore:', err);
  }
}

/**
 * Get match from Firestore
 */
export async function getMatchFromFirestore(matchId: string): Promise<MatchState | null> {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const snap = await getDoc(matchRef);
    if (snap.exists()) {
      return snap.data() as MatchState;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load match from Firestore:', err);
    return null;
  }
}
