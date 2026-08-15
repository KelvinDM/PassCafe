import { initializeApp } from 'firebase/app'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
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

export const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null
const db = app ? getFirestore(app) : null

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
    const batch = writeBatch(db)
    defaultMembers.forEach((member) => batch.set(doc(db, 'passcafeMembers', member.id), member))
    await batch.commit()
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
