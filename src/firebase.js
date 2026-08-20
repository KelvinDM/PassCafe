import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export function observeAuth(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase nao configurado.')
  return signInWithPopup(auth, googleProvider)
}

export async function signOutUser() {
  if (auth) await signOut(auth)
}

export async function loadSettings(defaultSettings) {
  if (!db) return defaultSettings
  const snapshot = await getDoc(doc(db, 'passcafe', 'settings'))
  return snapshot.exists() ? { ...defaultSettings, ...snapshot.data() } : defaultSettings
}

export async function saveSettings(settings) {
  if (!db) return
  await setDoc(doc(db, 'passcafe', 'settings'), settings, { merge: true })
}

export async function loadMembers(defaultMembers) {
  if (!db) return defaultMembers
  const snapshot = await getDocs(query(collection(db, 'passcafeMembers'), orderBy('name')))
  if (snapshot.empty) {
    return defaultMembers
  }
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function saveMember(member) {
  if (!db) return
  await setDoc(doc(db, 'passcafeMembers', member.id), member, { merge: true })
}

export async function deleteMember(id) {
  if (!db) return
  await deleteDoc(doc(db, 'passcafeMembers', id))
}

export async function saveMembers(members) {
  if (!db) return
  const batch = writeBatch(db)
  members.forEach((member) => batch.set(doc(db, 'passcafeMembers', member.id), member, { merge: true }))
  await batch.commit()
}

export async function createPaymentRequest(request) {
  if (!db) return request
  await setDoc(doc(db, 'paymentRequests', request.id), request)
  return request
}

export async function loadPaymentRequests() {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, 'paymentRequests'), orderBy('requestedAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export function watchPaymentRequests(callback) {
  if (!db) {
    callback([])
    return () => {}
  }

  return onSnapshot(query(collection(db, 'paymentRequests'), orderBy('requestedAt', 'desc')), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  })
}

export async function updatePaymentRequest(id, patch) {
  if (!db) return
  await setDoc(doc(db, 'paymentRequests', id), patch, { merge: true })
}
