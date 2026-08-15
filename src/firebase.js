import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
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

export const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null
const db = app ? getFirestore(app) : null
const auth = app ? getAuth(app) : null
let secondaryAdminApp = null

function getSecondaryAdminAuth() {
  if (!hasFirebaseConfig) return null
  if (!secondaryAdminApp) secondaryAdminApp = initializeApp(firebaseConfig, 'admin-user-creation')
  return getAuth(secondaryAdminApp)
}

async function getAdminProfile(user) {
  if (!db || !user) return null
  const snapshot = await getDoc(doc(db, 'admins', user.uid))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export function watchAdminAuth(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null)
      return
    }

    const profile = await getAdminProfile(user)
    if (profile) {
      callback({ uid: user.uid, email: user.email, role: profile.role, profile })
      return
    }

    await signOut(auth)
    callback(null)
  })
}

export async function loginAdmin(email, password) {
  if (!auth) throw new Error('Firebase nao configurado.')
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const profile = await getAdminProfile(credential.user)

  if (!profile) {
    await signOut(auth)
    const error = new Error('Usuario sem permissao de cafe.')
    error.code = 'auth/not-cafe-staff'
    throw error
  }

  return { uid: credential.user.uid, email: credential.user.email, role: profile.role, profile }
}

export async function logoutAdmin() {
  if (!auth) return
  await signOut(auth)
}

export async function sendAdminPasswordReset(email) {
  if (!auth) throw new Error('Firebase nao configurado.')
  await sendPasswordResetEmail(auth, email)
}

export async function loadAdmins() {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, 'admins'), orderBy('email')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function createCafeUser({ email, password, role, createdBy }) {
  const secondaryAuth = getSecondaryAdminAuth()
  if (!secondaryAuth || !db) throw new Error('Firebase nao configurado.')

  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
  const admin = {
    uid: credential.user.uid,
    email: credential.user.email,
    role,
    createdBy,
    createdAt: new Date().toISOString()
  }

  await setDoc(doc(db, 'admins', credential.user.uid), admin)
  await signOut(secondaryAuth)
  return admin
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
