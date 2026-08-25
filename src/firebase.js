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
  where,
  writeBatch
} from 'firebase/firestore'

const SUPREME_MASTER_UID = 'OMjgQR2BTlR2UzheRiqF9KMT5Dk1'

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
  if (!auth) throw new Error('Acesso remoto nao configurado.')
  return signInWithPopup(auth, googleProvider)
}

export async function signOutUser() {
  if (auth) await signOut(auth)
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function adminPayload(user, role, inviteId = null, protectedAccount = false) {
  const now = new Date().toISOString()
  return {
    uid: user.uid,
    email: normalizeEmail(user.email),
    role,
    inviteId,
    protected: protectedAccount,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedByUid: null
  }
}

export async function loadMyAdminProfile(user) {
  if (!db || !user?.uid) return null
  const adminRef = doc(db, 'admins', user.uid)
  let snapshot = await getDoc(adminRef)

  if (user.uid === SUPREME_MASTER_UID) {
    const existing = snapshot.exists() ? snapshot.data() : null
    await setDoc(adminRef, {
      ...adminPayload(user, 'MASTER', null, true),
      createdAt: existing?.createdAt || new Date().toISOString(),
      createdBy: existing?.createdBy || 'bootstrap-interno'
    })
    snapshot = await getDoc(adminRef)
  }

  return snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null
}

export function watchMyAdminInvites(email, callback) {
  if (!db || !email) {
    callback([])
    return () => {}
  }
  const normalizedEmail = normalizeEmail(email)
  return onSnapshot(query(collection(db, 'adminInvites'), where('email', '==', normalizedEmail)), (snapshot) => {
    callback(snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((invite) => invite.status === 'PENDING'))
  })
}

export function watchMyAdminProfile(userId, callback) {
  if (!db || !userId) {
    callback(null)
    return () => {}
  }
  return onSnapshot(doc(db, 'admins', userId), (snapshot) => {
    callback(snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null)
  })
}

export async function loadAdminManagement() {
  if (!db) return { admins: [], invites: [] }
  const [adminsSnapshot, invitesSnapshot] = await Promise.all([
    getDocs(collection(db, 'adminDirectory')),
    getDocs(collection(db, 'adminInvites'))
  ])
  return {
    admins: adminsSnapshot.docs.map((item) => ({ uid: item.id, ...item.data() })),
    invites: invitesSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((invite) => invite.status === 'PENDING')
  }
}

export async function createAdminInvite(email, role, actorUid) {
  if (!db) throw new Error('Firestore não configurado.')
  const normalizedEmail = normalizeEmail(email)
  const [activeSnapshot, inviteSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'adminDirectory'), where('email', '==', normalizedEmail))),
    getDocs(query(collection(db, 'adminInvites'), where('email', '==', normalizedEmail)))
  ])
  if (!activeSnapshot.empty) throw new Error('Esta conta já possui acesso administrativo.')
  if (inviteSnapshot.docs.some((item) => item.data().status === 'PENDING')) {
    throw new Error('Já existe um convite pendente para esta conta.')
  }
  const inviteRef = doc(collection(db, 'adminInvites'))
  const invite = {
    id: inviteRef.id,
    email: normalizedEmail,
    role,
    status: 'PENDING',
    createdByUid: actorUid,
    invitedAt: new Date().toISOString(),
    answeredAt: null,
    claimedByUid: null
  }
  await setDoc(inviteRef, invite)
  return { invite }
}

export async function acceptAdminInvite(invite, user) {
  if (!db || !invite?.id || !user?.uid) throw new Error('Convite inválido.')
  const batch = writeBatch(db)
  const profile = adminPayload(user, invite.role, invite.id, false)
  batch.set(doc(db, 'admins', user.uid), profile)
  batch.set(doc(db, 'adminDirectory', user.uid), profile)
  batch.update(doc(db, 'adminInvites', invite.id), {
    status: 'ACCEPTED',
    answeredAt: new Date().toISOString(),
    claimedByUid: user.uid
  })
  await batch.commit()
  return profile
}

export async function declineAdminInvite(inviteId, userId) {
  if (!db || !inviteId || !userId) return
  await setDoc(doc(db, 'adminInvites', inviteId), {
    status: 'DECLINED',
    answeredAt: new Date().toISOString(),
    claimedByUid: userId
  }, { merge: true })
}

export async function changeAdminRole(uid, role, actorUid) {
  if (!db || !uid) return
  const patch = { role, updatedAt: new Date().toISOString(), updatedByUid: actorUid }
  const batch = writeBatch(db)
  batch.set(doc(db, 'admins', uid), patch, { merge: true })
  batch.set(doc(db, 'adminDirectory', uid), patch, { merge: true })
  await batch.commit()
}

export async function removeAdminAccess(type, id) {
  if (!db || !id) return
  if (type === 'invite') {
    await deleteDoc(doc(db, 'adminInvites', id))
    return
  }
  const batch = writeBatch(db)
  batch.delete(doc(db, 'admins', id))
  batch.delete(doc(db, 'adminDirectory', id))
  await batch.commit()
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

export async function createAuditLog(entry) {
  if (!db) return entry
  await setDoc(doc(db, 'auditLogs', entry.id), entry)
  return entry
}

export async function loadPaymentRequests() {
  if (!db) return []
  const snapshot = await getDocs(query(collection(db, 'paymentRequests'), orderBy('requestedAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function loadClickerSave(userId, defaultSave) {
  if (!db || !userId) return defaultSave
  const snapshot = await getDoc(doc(db, 'clickerSaves', userId))
  return snapshot.exists() ? { ...defaultSave, ...snapshot.data() } : defaultSave
}

export async function saveClickerSave(userId, save) {
  if (!db || !userId) return
  await setDoc(doc(db, 'clickerSaves', userId), save, { merge: true })
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
