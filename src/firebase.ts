import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Ensure same-origin authDomain when hosted on Firebase to avoid third-party cookie blocking
const resolvedAuthDomain =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('.web.app') || window.location.hostname.endsWith('.firebaseapp.com'))
    ? window.location.hostname
    : firebaseConfig.authDomain;

const config = {
  ...firebaseConfig,
  authDomain: resolvedAuthDomain,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy,
  limit,
};
export type { User };
