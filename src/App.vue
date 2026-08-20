<script setup>
import { Icon, addCollection } from '@iconify/vue'
import pixelarticons from '@iconify-json/pixelarticons/icons.json'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import CafeButton from './components/CafeButton.vue'
import CafeSelect from './components/CafeSelect.vue'
import FeatureIcon from './components/FeatureIcon.vue'
import StatTile from './components/StatTile.vue'
import {
  deleteMember as deleteFirestoreMember,
  createPaymentRequest,
  hasFirebaseConfig,
  loadMembers,
  loadPaymentRequests,
  loadSettings,
  observeAuth,
  saveMember,
  saveMembers,
  saveSettings,
  signInWithGoogle,
  signOutUser,
  updatePaymentRequest,
  watchPaymentRequests
} from './firebase'

addCollection(pixelarticons)

const MASTER_EMAIL = 'kelvindaniel1932@gmail.com'
const ADMIN_EMAILS = (import.meta.env.VITE_PASSCAFE_ADMIN_EMAILS || MASTER_EMAIL)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const DEFAULT_SETTINGS = {
  month: 'AGOSTO / 2026',
  monthlyFee: 15,
  pixType: 'E-mail',
  pixKey: 'cafe-equipe@firma.com.br',
  pixOwner: 'Sr. Cafeeiro do RH'
}

const DEFAULT_MEMBERS = [
  { id: '1', name: 'Carlinhos do T.I.', dept: 'Tecnologia', status: 'PAID', paidAt: '14/08/2026 09:15' },
  { id: '2', name: 'Dona Maria do RH', dept: 'Recursos Humanos', status: 'PAID', paidAt: '14/08/2026 10:30' },
  { id: '3', name: 'Lucão do Marketing', dept: 'Marketing', status: 'UNPAID', paidAt: null },
  { id: '4', name: 'Vanessa do Financeiro', dept: 'Financeiro', status: 'PAID', paidAt: '13/08/2026 16:45' },
  { id: '5', name: 'Pedrinho Estagiário', dept: 'Suporte', status: 'UNPAID', paidAt: null }
]

const FUNNY_EXCUSES = [
  '"Achei que o café era patrocinado pela diretoria este mês..."',
  '"Esqueci a chave de segurança do banco no meu outro casaco."',
  '"Estou em transição para o chá verde, por isso não paguei."',
  '"Paguei na semana passada em pensamentos positivos!"',
  '"Achei que quem faz o café ganha isenção automática."',
  '"O Pix do meu banco está em manutenção programada de 30 dias."'
]

const FUNNY_BANNERS = [
  'Dica do Dia: Café sem pagamento causa sonolência extrema no relatório de sexta-feira!',
  'Alerta RH: A garrafa térmica detectou 2 invasores não quitados hoje!',
  'Sabia que? Cada xícara paga aumenta sua produtividade em 400% e evita reuniões desnecessárias.',
  'Cuidado! O café de quem não paga fica com sabor de chá de boldo requentado.'
]

const statusOptions = [
  { value: 'ALL', label: 'Todos os Colegas' },
  { value: 'PAID', label: 'Quitados (Paga-Lanches)' },
  { value: 'PENDING', label: 'Na Fila do Fiscal' },
  { value: 'UNPAID', label: 'Desidratados (Pendentes)' }
]

const pixTypeOptions = [
  { value: 'E-mail', label: 'E-mail' },
  { value: 'CPF / CNPJ', label: 'CPF / CNPJ' },
  { value: 'Celular', label: 'Celular' },
  { value: 'Chave Aleatória', label: 'Chave Aleatória' }
]

const settings = reactive({ ...DEFAULT_SETTINGS })
const members = ref([...DEFAULT_MEMBERS])
const activeTab = ref('pay')
const loading = ref(true)
const authReady = ref(false)
const authLoading = ref(false)
const authError = ref('')
const currentUser = ref(null)

const userPayment = reactive({ name: '', dept: '' })
const joinForm = reactive({ name: '', dept: '' })
const adminForm = reactive({ ...DEFAULT_SETTINGS })
const adminUser = ref(null)
const paymentRequests = ref([])
const adminNewMember = reactive({ name: '', dept: '' })
const searchMember = ref('')
const filterStatus = ref('ALL')
const receiptSearch = ref('')
const selectedReceipt = ref(null)
const joinModalOpen = ref(false)
const funnyExcuse = ref('"Não paguei ainda porque estou fazendo jejum intermitente de cafeína..."')
const funnyBanner = ref(FUNNY_BANNERS[0])
const toasts = ref([])
let unwatchPaymentRequests = () => {}
let paymentRequestsReady = false

const paidMembers = computed(() => members.value.filter((member) => member.status === 'PAID'))
const pendingMembers = computed(() => members.value.filter((member) => member.status === 'PENDING'))
const unpaidCount = computed(() => members.value.length - paidMembers.value.length)
const totalRaised = computed(() => paidMembers.value.length * Number(settings.monthlyFee || 0))
const goalPercentage = computed(() => members.value.length ? Math.round((paidMembers.value.length / members.value.length) * 100) : 0)
const isCoffeeMaster = computed(() => adminUser.value?.role === 'MASTER')
const pendingPaymentRequests = computed(() => {
  const unique = new Map()
  paymentRequests.value
    .filter((request) => request.status === 'PENDING')
    .forEach((request) => unique.set(request.id, request))
  return [...unique.values()]
})
const pixPayload = computed(() => buildPixPayload())
const qrUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload.value)}&color=1F120B&bgcolor=FFFDF9`)
const adminUnlocked = computed(() => Boolean(adminUser.value))
const signedInWithWrongAccount = computed(() => Boolean(currentUser.value && !adminUnlocked.value))
const filteredMembers = computed(() => {
  const search = searchMember.value.trim().toLowerCase()
  return members.value.filter((member) => {
    const matchesSearch = !search || member.name.toLowerCase().includes(search) || (member.dept || '').toLowerCase().includes(search)
    const matchesFilter = filterStatus.value === 'ALL' || member.status === filterStatus.value
    return matchesSearch && matchesFilter
  })
})

onMounted(async () => {
  observeAuth((user) => {
    unwatchPaymentRequests()
    paymentRequestsReady = false
    currentUser.value = user
    authReady.value = true
    const email = user?.email?.toLowerCase() || ''
    adminUser.value = ADMIN_EMAILS.includes(email)
      ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'MASTER'
        }
      : null
    paymentRequests.value = []
    if (adminUser.value) {
      unwatchPaymentRequests = watchPaymentRequests((requests) => {
        const previousPending = pendingPaymentRequests.value.length
        paymentRequests.value = requests
        const nextPending = requests.filter((request) => request.status === 'PENDING').length
        if (paymentRequestsReady && nextPending > previousPending) {
          showToast('Notificação da brigada: tem Pix novo pedindo carimbo.', 'info')
          playMailSound()
        }
        paymentRequestsReady = true
      })
    }
  })

  try {
    const [loadedSettings, loadedMembers] = await Promise.all([
      loadSettings(loadLocalSettings()),
      loadMembers(loadLocalMembers())
    ])
    Object.assign(settings, loadedSettings)
    Object.assign(adminForm, loadedSettings)
    members.value = loadedMembers
  } catch (error) {
    showToast('Não foi possível carregar o Firestore. Usando dados locais.', 'error')
  } finally {
    loading.value = false
  }

  setInterval(() => {
    funnyBanner.value = FUNNY_BANNERS[Math.floor(Math.random() * FUNNY_BANNERS.length)]
  }, 5000)
})

onBeforeUnmount(() => unwatchPaymentRequests())

function requireAdmin() {
  if (adminUnlocked.value) return true
  showToast('Entre com o Gmail do Mestre do Cafe para alterar o painel.', 'error')
  return false
}

function loadLocalSettings() {
  return JSON.parse(localStorage.getItem('cafe_settings') || 'null') || DEFAULT_SETTINGS
}

function loadLocalMembers() {
  return JSON.parse(localStorage.getItem('cafe_members') || 'null') || DEFAULT_MEMBERS
}

function saveLocalState() {
  localStorage.setItem('cafe_settings', JSON.stringify(settings))
  localStorage.setItem('cafe_members', JSON.stringify(members.value))
}

function switchTab(tabId) {
  activeTab.value = tabId
  playClickSound()
}

function openJoinModal() {
  joinModalOpen.value = true
  playOpenSound()
}

function nowFormatted() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function emv(id, value) {
  const content = String(value ?? '')
  return `${id}${content.length.toString().padStart(2, '0')}${content}`
}

function normalizePixText(value, maxLength) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .,&-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength)
}

function crc16(payload) {
  let crc = 0xffff
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function buildPixPayload() {
  const pixKey = settings.pixKey.trim()
  const merchantName = normalizePixText(settings.pixOwner || 'CAFE PASS', 25) || 'CAFE PASS'
  const merchantCity = 'FIRMA'
  const amount = Number(settings.monthlyFee || 0).toFixed(2)
  const description = normalizePixText(`Cafe Pass ${settings.month}`, 40)
  const merchantAccount = emv('00', 'br.gov.bcb.pix') + emv('01', pixKey) + emv('02', description)
  const additionalData = emv('05', 'CAFEPASS')

  const payloadWithoutCrc = [
    emv('00', '01'),
    emv('26', merchantAccount),
    emv('52', '0000'),
    emv('53', '986'),
    emv('54', amount),
    emv('58', 'BR'),
    emv('59', merchantName),
    emv('60', merchantCity),
    emv('62', additionalData),
    '6304'
  ].join('')

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`
}

async function persistMember(member) {
  saveLocalState()
  await saveMember(member)
}

async function requestPaymentApproval(member) {
  const request = {
    id: `${member.id}-${Date.now()}`,
    memberId: member.id,
    name: member.name,
    dept: member.dept || 'Geral',
    amount: Number(settings.monthlyFee || 0),
    month: settings.month,
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null
  }

  await createPaymentRequest(request)
}

async function handleUserPayment() {
  const name = userPayment.name.trim()
  const dept = userPayment.dept.trim() || 'Geral'
  if (!name) return

  let member = members.value.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (member) {
    if (member.status === 'PAID') {
      showToast(`${member.name} já está cafeinado oficialmente.`, 'info')
      playBumpSound()
      return
    }
    if (member.status === 'PENDING') {
      showToast(`${member.name} já está na fila do fiscal do bule.`, 'info')
      playBumpSound()
      return
    }
    member.status = 'PENDING'
    member.paidAt = null
    if (dept !== 'Geral') member.dept = dept
  } else {
    member = { id: Date.now().toString(), name, dept, status: 'PENDING', paidAt: null }
    members.value.push(member)
  }

  await persistMember(member)
  await requestPaymentApproval(member)
  showToast(`Pedido enviado para a brigada do café. Agora é perícia do Pix!`, 'success')
  playMailSound()
  userPayment.name = ''
  userPayment.dept = ''
}

async function markAsPaidFromList(id) {
  const member = members.value.find((item) => item.id === id)
  if (!member) return
  if (member.status === 'PENDING') {
    showToast(`${member.name} já está aguardando carimbo da brigada.`, 'info')
    playBumpSound()
    return
  }
  member.status = 'PENDING'
  member.paidAt = null
  await persistMember(member)
  await requestPaymentApproval(member)
  showToast(`${member.name} entrou na fila de conferência do Pix.`, 'success')
  playMailSound()
}

async function removeMember(id) {
  const member = members.value.find((item) => item.id === id)
  members.value = members.value.filter((item) => item.id !== id)
  saveLocalState()
  await deleteFirestoreMember(id)
  if (member) showToast(`Colega ${member.name} saiu da vaquinha deste mês.`, 'info')
  playRemoveSound()
}

function searchAndShowReceipt() {
  const name = receiptSearch.value.trim()
  if (!name) {
    playErrorSound()
    return showToast('Digite um nome para consultar!', 'error')
  }
  const member = members.value.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (!member) {
    playErrorSound()
    return showToast('Colega não encontrado na lista do mês!', 'error')
  }
  if (member.status !== 'PAID') {
    playErrorSound()
    return showToast(`Atenção: ${member.name} ainda consta como PENDENTE!`, 'error')
  }
  selectedReceipt.value = member
  playStampSound()
}

function viewUserReceipt(name) {
  receiptSearch.value = name
  selectedReceipt.value = members.value.find((item) => item.name.toLowerCase() === name.toLowerCase())
  switchTab('receipts')
  playStampSound()
}

function authErrorMessage(error) {
  const code = error?.code || ''
  if (code.includes('auth/popup-closed-by-user')) return 'O login foi cancelado antes de ser concluído.'
  if (code.includes('auth/popup-blocked')) return 'O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.'
  if (code.includes('auth/unauthorized-domain')) return 'Este domínio ainda não foi autorizado no Firebase Authentication.'
  if (code.includes('auth/operation-not-allowed')) return 'O login Google ainda não está habilitado no Firebase Authentication.'
  if (code.includes('auth/too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  return 'Não foi possível entrar com o Google. Tente novamente.'
}

async function unlockAdmin() {
  if (!hasFirebaseConfig) {
    showToast('Firebase ainda não configurado. Login Google indisponível.', 'error')
    playErrorSound()
    return
  }

  try {
    authLoading.value = true
    authError.value = ''
    const credential = await signInWithGoogle()
    currentUser.value = credential.user
    const email = credential.user.email?.toLowerCase() || ''
    if (ADMIN_EMAILS.includes(email)) {
      adminUser.value = {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
        role: 'MASTER'
      }
      showToast('Painel do Mestre liberado com Google!', 'success')
      playAdminUnlockSound()
    } else {
      adminUser.value = null
      showToast('Conta Google sem permissão de Mestre do Café.', 'error')
      playErrorSound()
    }
  } catch (error) {
    authError.value = authErrorMessage(error)
    showToast(authError.value, 'error')
    playErrorSound()
  } finally {
    authLoading.value = false
  }
}

async function lockAdmin() {
  await signOutUser()
  currentUser.value = null
  adminUser.value = null
  paymentRequests.value = []
  unwatchPaymentRequests()
  showToast('Sessão do Mestre encerrada.', 'info')
  playLockSound()
}

function roleLabel(role) {
  return role === 'MASTER' ? 'Mestre do Café' : 'Aprendiz do Café'
}

function memberStatusLabel(status) {
  if (status === 'PAID') return 'CAFEINADO (QUITADO)'
  if (status === 'PENDING') return 'EM PERÍCIA DO PIX'
  return 'DESIDRATADO (PENDENTE)'
}

function memberStatusIcon(status) {
  if (status === 'PAID') return 'pixelarticons:coffee'
  if (status === 'PENDING') return 'pixelarticons:hourglass'
  return 'pixelarticons:robot-face-sad'
}

function memberStatusClass(status) {
  if (status === 'PAID') return 'bg-mint text-foam'
  if (status === 'PENDING') return 'bg-caramel text-espresso'
  return 'bg-chili text-foam'
}

function memberAvatarClass(status) {
  if (status === 'PAID') return 'bg-mint/20 text-mint'
  if (status === 'PENDING') return 'bg-caramel/20 text-caramel'
  return 'bg-chili/20 text-chili'
}

async function refreshPaymentRequests() {
  paymentRequests.value = await loadPaymentRequests()
  showToast('Fila de Pix auditada novamente. O coador foi sacudido.', 'info')
  playClickSound()
}

async function approvePaymentRequest(request) {
  const member = members.value.find((item) => item.id === request.memberId) || {
    id: request.memberId,
    name: request.name,
    dept: request.dept || 'Geral',
    status: 'PENDING',
    paidAt: null
  }
  const wasNewMember = !members.value.some((item) => item.id === request.memberId)

  member.name = request.name
  member.dept = request.dept || 'Geral'
  member.status = 'PAID'
  member.paidAt = nowFormatted()
  if (wasNewMember) members.value.push(member)

  await persistMember(member)
  await updatePaymentRequest(request.id, {
    ...request,
    status: 'APPROVED',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUser.value?.email || 'Brigada do Café'
  })
  paymentRequests.value = paymentRequests.value.map((item) => (
    item.id === request.id
      ? { ...item, status: 'APPROVED', reviewedAt: new Date().toISOString(), reviewedBy: adminUser.value?.email }
      : item
  ))
  showToast(`${request.name} aprovado. Café liberado sem recurso ao RH.`, 'success')
  playSuccessSound()
}

async function rejectPaymentRequest(request) {
  const member = members.value.find((item) => item.id === request.memberId)
  if (member && member.status === 'PENDING') {
    member.status = 'UNPAID'
    member.paidAt = null
    await persistMember(member)
  }

  await updatePaymentRequest(request.id, {
    ...request,
    status: 'REJECTED',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUser.value?.email || 'Brigada do Café'
  })
  paymentRequests.value = paymentRequests.value.map((item) => (
    item.id === request.id
      ? { ...item, status: 'REJECTED', reviewedAt: new Date().toISOString(), reviewedBy: adminUser.value?.email }
      : item
  ))
  showToast(`${request.name} recusado. O Pix não convenceu o conselho do coador.`, 'error')
  playErrorSound()
}

async function saveAdminSettings() {
  if (!requireAdmin()) return
  Object.assign(settings, {
    month: adminForm.month.trim(),
    monthlyFee: Number(adminForm.monthlyFee) || 15,
    pixType: adminForm.pixType,
    pixKey: adminForm.pixKey.trim(),
    pixOwner: adminForm.pixOwner.trim()
  })
  saveLocalState()
  await saveSettings({ ...settings })
  showToast('Novas configurações salvas com sucesso!', 'success')
  playSaveSound()
}

async function addMemberFromAdmin() {
  if (!requireAdmin()) return
  const name = adminNewMember.name.trim()
  if (!name) return
  const member = { id: Date.now().toString(), name, dept: adminNewMember.dept.trim() || 'Geral', status: 'UNPAID', paidAt: null }
  members.value.push(member)
  await persistMember(member)
  adminNewMember.name = ''
  adminNewMember.dept = ''
  showToast(`${name} entrou na lista do café.`, 'success')
  playJoinSound()
}

async function handleJoinSubmit() {
  const name = joinForm.name.trim()
  if (!name) return
  if (members.value.some((member) => member.name.toLowerCase() === name.toLowerCase())) {
    showToast('Você já está na vaquinha deste mês!', 'info')
    joinModalOpen.value = false
    playBumpSound()
    return
  }
  const member = { id: Date.now().toString(), name, dept: joinForm.dept.trim() || 'Geral', status: 'UNPAID', paidAt: null }
  members.value.push(member)
  await persistMember(member)
  joinForm.name = ''
  joinForm.dept = ''
  joinModalOpen.value = false
  showToast('Entrada confirmada. Agora só falta pagar o café!', 'success')
  playJoinSound()
}

async function resetMonthlyPayments() {
  if (!requireAdmin()) return
  members.value = members.value.map((member) => ({ ...member, status: 'UNPAID', paidAt: null }))
  saveLocalState()
  await saveMembers(members.value)
  selectedReceipt.value = null
  showToast('Pagamentos reiniciados para o novo mês.', 'info')
  playResetSound()
}

function copyPixKey() {
  navigator.clipboard?.writeText(settings.pixKey)
  showToast('Chave Pix copiada!', 'success')
  playCoinSound()
}

function generateExcuse() {
  funnyExcuse.value = FUNNY_EXCUSES[Math.floor(Math.random() * FUNNY_EXCUSES.length)]
  playClickSound()
}

function triggerHornSound() {
  showToast(`Sirene acionada: ${unpaidCount.value} pendente(s) detectado(s)!`, 'error')
  playHornSound()
}

function printReceipt() {
  playPrintSound()
  window.print()
}

function showToast(message, type = 'info') {
  const id = Date.now()
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }, 3200)
}

let audioContext

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function tone(frequency, duration, type = 'sine', delay = 0, volume = 0.045) {
  const ctx = getAudioContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const startAt = ctx.currentTime + delay
  const endAt = startAt + duration

  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.001, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, endAt)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

function playSequence(notes, type = 'square', volume = 0.045) {
  notes.forEach(([frequency, duration, delay]) => tone(frequency, duration, type, delay, volume))
}

function playClickSound() { playSequence([[260, 0.035, 0], [390, 0.035, 0.035]], 'square', 0.035) }
function playOpenSound() { playSequence([[330, 0.04, 0], [494, 0.05, 0.045]], 'square', 0.035) }
function playSuccessSound() { playSequence([[523, 0.07, 0], [659, 0.08, 0.075], [784, 0.12, 0.16]], 'triangle', 0.05) }
function playAdminUnlockSound() { playSequence([[392, 0.06, 0], [523, 0.06, 0.07], [659, 0.07, 0.14], [988, 0.1, 0.23]], 'square', 0.04) }
function playLockSound() { playSequence([[330, 0.06, 0], [247, 0.08, 0.07], [165, 0.1, 0.16]], 'square', 0.04) }
function playErrorSound() { playSequence([[196, 0.08, 0], [147, 0.08, 0.085]], 'sawtooth', 0.035) }
function playBumpSound() { playSequence([[180, 0.05, 0], [140, 0.06, 0.055]], 'square', 0.03) }
function playStampSound() { playSequence([[130, 0.05, 0], [220, 0.04, 0.055], [440, 0.06, 0.1]], 'sawtooth', 0.035) }
function playHornSound() { playSequence([[180, 0.12, 0], [150, 0.12, 0.13], [180, 0.18, 0.26]], 'square', 0.05) }
function playCoinSound() { playSequence([[988, 0.06, 0], [1319, 0.11, 0.07]], 'square', 0.035) }
function playSaveSound() { playSequence([[440, 0.06, 0], [660, 0.08, 0.07]], 'triangle', 0.04) }
function playJoinSound() { playSequence([[330, 0.06, 0], [392, 0.06, 0.065], [494, 0.1, 0.135]], 'square', 0.04) }
function playPowerUpSound() { playSequence([[262, 0.055, 0], [330, 0.055, 0.06], [392, 0.055, 0.12], [523, 0.12, 0.19]], 'square', 0.04) }
function playMailSound() { playSequence([[659, 0.05, 0], [523, 0.05, 0.055], [784, 0.09, 0.12]], 'triangle', 0.04) }
function playResetSound() { playSequence([[523, 0.055, 0], [392, 0.055, 0.06], [262, 0.055, 0.12], [131, 0.12, 0.2]], 'square', 0.035) }
function playRemoveSound() { playSequence([[247, 0.05, 0], [165, 0.08, 0.06]], 'sawtooth', 0.03) }
function playPrintSound() { playSequence([[220, 0.035, 0], [220, 0.035, 0.05], [440, 0.04, 0.1], [330, 0.06, 0.16]], 'square', 0.025) }
</script>

<template>
  <div class="min-h-screen flex flex-col text-espresso selection:bg-caramel selection:text-foam">
    <div class="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="comic-border shadow-comic rounded-xl px-4 py-3 text-sm font-bold bg-foam"
        :class="{ 'text-emerald-700': toast.type === 'success', 'text-red-700': toast.type === 'error', 'text-mocha': toast.type === 'info' }"
      >
        {{ toast.message }}
      </div>
    </div>

    <header class="bg-mocha text-crema comic-border-lg border-b-8 border-espresso shadow-comic-lg sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3 cursor-pointer select-none" @click="switchTab('pay')">
          <div class="relative w-12 h-12 bg-caramel rounded-2xl comic-border flex items-center justify-center shadow-comic">
            <span class="absolute -top-3 left-2 text-xs steam-line text-crema font-bold">~</span>
            <span class="absolute -top-4 left-5 text-sm steam-line steam-2 text-crema font-bold">~</span>
            <span class="absolute -top-3 right-2 text-xs steam-line steam-3 text-crema font-bold">~</span>
            <Icon icon="pixelarticons:coffee" class="text-3xl text-espresso" />
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-black tracking-wide text-foam flex items-center gap-2">
              CAFÉ PASS <span class="bg-caramel text-espresso text-xs px-2 py-0.5 rounded-full comic-border font-mono">v2.0</span>
            </h1>
            <p class="text-xs text-latte font-medium hidden sm:block">"A lei do cafezinho da firma é clara: pagou, tomou!"</p>
          </div>
        </div>

        <nav class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button v-for="tab in [
            ['pay', 'pixelarticons:wallet', 'Pagar Cota'],
            ['list', 'pixelarticons:users', 'Lista dos Cafeinados'],
            ['receipts', 'pixelarticons:receipt', 'Segundas Vias'],
            ['admin', 'pixelarticons:shield', 'Painel Admin']
          ]" :key="tab[0]" @click="switchTab(tab[0])" class="nav-btn font-bold px-4 py-2 rounded-xl comic-border shadow-comic hover:shadow-comic-hover transition-all flex items-center gap-2 text-sm whitespace-nowrap" :class="activeTab === tab[0] ? 'bg-caramel text-espresso' : tab[0] === 'admin' ? 'bg-roast text-latte' : 'bg-crema text-espresso'">
            <span class="nav-icon"><Icon :icon="tab[1]" /></span> {{ tab[2] }}
          </button>
        </nav>
      </div>
    </header>

    <div class="bg-caramel comic-border-lg border-t-0 border-x-0 py-1.5 px-4 text-center font-bold text-xs sm:text-sm text-espresso overflow-hidden shadow-sm">
      <span class="inline-flex items-center justify-center gap-2"><Icon icon="pixelarticons:warning-box" class="text-lg" /> {{ funnyBanner }}</span>
    </div>

    <main class="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
      <div v-if="loading" class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl text-center font-black">Carregando café...</div>

      <section v-show="!loading && activeTab === 'pay'" class="tab-content space-y-6">
        <div class="bg-crema rounded-3xl p-6 sm:p-8 comic-border-lg shadow-comic-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 text-mocha/10 text-9xl pointer-events-none select-none">
            <Icon icon="pixelarticons:coffee-alt" />
          </div>

          <div class="md:col-span-5 bg-foam p-5 rounded-2xl comic-border shadow-comic text-center flex flex-col items-center">
            <div class="inline-block bg-caramel/20 text-caramel text-xs font-black px-3 py-1 rounded-full comic-border mb-3 font-mono">
              MÊS ATUAL: <span>{{ settings.month }}</span>
            </div>
            <h2 class="text-xl font-black text-espresso mb-1">Chave Pix do Café</h2>
            <p class="text-xs text-mocha mb-4 font-medium">Escaneie o QR Code com valor ou copie a chave abaixo</p>
            <div class="relative group my-2">
              <div class="w-48 h-48 bg-white p-3 rounded-2xl comic-border shadow-comic flex items-center justify-center">
                <img :src="qrUrl" alt="QR Code Pix Café" class="w-full h-full object-contain">
              </div>
              <div class="absolute inset-0 bg-espresso/80 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 text-center">
                <p class="text-foam text-xs font-bold">Faça a transferência no app do seu banco e informe seu nome ao lado!</p>
              </div>
            </div>
            <div class="mt-4 bg-roast text-foam px-4 py-2 rounded-xl comic-border w-full flex items-center justify-between">
              <span class="text-xs font-bold text-latte">Cota Mensal:</span>
              <span class="text-2xl font-black text-caramel font-mono">{{ formatMoney(settings.monthlyFee) }}</span>
            </div>
            <div class="mt-3 w-full">
              <p class="text-xs font-bold text-mocha text-left mb-1">Chave cadastrada (<span>{{ settings.pixType }}</span>):</p>
              <div class="flex items-center gap-1">
                <input type="text" readonly :value="settings.pixKey" class="w-full bg-latte/50 text-espresso text-xs font-mono font-bold p-2.5 rounded-lg comic-border focus:outline-none select-all">
                <button @click="copyPixKey" title="Copiar Chave Pix" class="bg-caramel hover:bg-amber-600 text-espresso p-2.5 rounded-lg comic-border shadow-comic hover:shadow-comic-hover active:translate-x-0.5 active:translate-y-0.5 transition-all">
                  <Icon icon="pixelarticons:copy" class="text-lg" />
                </button>
              </div>
              <p class="text-[10px] text-mocha/80 text-left mt-1 font-medium">Titular: <span class="font-bold">{{ settings.pixOwner }}</span></p>
            </div>
          </div>

          <div class="md:col-span-7 flex flex-col justify-between h-full">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="bg-chili text-foam text-xs px-2 py-0.5 rounded-md comic-border font-bold uppercase tracking-wider">Sem Fila & Sem Senha</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-black text-espresso mb-2">Já fez a transferência?</h2>
              <p class="text-sm text-mocha font-medium mb-6">
                Digite seu nome abaixo para registrar o pagamento na lista da firma e liberar sua <strong>Licença de Cafeína MENSAL</strong>!
              </p>
              <form @submit.prevent="handleUserPayment" class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-espresso uppercase mb-1">Seu Nome / Apelido da Firma *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-mocha/60"><Icon icon="pixelarticons:user" class="text-lg" /></span>
                    <input v-model="userPayment.name" type="text" required placeholder="Ex: Carlinhos do T.I. / Ana do Vendas" class="w-full bg-foam text-espresso font-bold pl-10 pr-4 py-3 rounded-xl comic-border focus:ring-4 focus:ring-caramel/30 focus:outline-none transition-all placeholder:font-normal placeholder:text-mocha/40">
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-espresso uppercase mb-1">Setor / Departamento (Opcional)</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-mocha/60"><Icon icon="pixelarticons:briefcase-check" class="text-lg" /></span>
                    <input v-model="userPayment.dept" type="text" placeholder="Ex: T.I., Marketing, Financeiro, RH" class="w-full bg-foam text-espresso font-bold pl-10 pr-4 py-3 rounded-xl comic-border focus:ring-4 focus:ring-caramel/30 focus:outline-none transition-all placeholder:font-normal placeholder:text-mocha/40">
                  </div>
                </div>
                <div class="bg-latte/60 p-3.5 rounded-xl comic-border text-xs text-mocha flex items-start gap-2.5">
                  <Icon icon="pixelarticons:info-box" class="text-caramel text-lg mt-0.5 shrink-0" />
                  <p>Ao clicar abaixo, você declara formalmente que transferiu a cota e tem total consciência de que café requentado após as 16h é de sua inteira responsabilidade.</p>
                </div>
                <CafeButton type="submit" variant="mint" size="lg" block icon="pixelarticons:check-double">
                  ENVIAR PARA A PERÍCIA DO PIX!
                </CafeButton>
              </form>
            </div>
            <div class="mt-8 pt-4 border-t-2 border-espresso/20">
              <div class="flex justify-between items-center text-xs font-bold mb-1">
                <span class="text-espresso">Meta do Mês (Pó de Café + Leite):</span>
                <span class="text-caramel font-mono">{{ paidMembers.length }} / {{ members.length }} Quitados ({{ goalPercentage }}%)</span>
              </div>
              <div class="w-full bg-foam rounded-full h-4 comic-border overflow-hidden p-0.5">
                <div class="bg-gradient-to-r from-caramel to-mint h-full rounded-full transition-all duration-500" :style="{ width: `${goalPercentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-foam p-4 rounded-2xl comic-border shadow-comic flex items-start gap-3">
            <FeatureIcon icon="pixelarticons:coffee-alt" tone="coffee" />
            <div><h4 class="font-bold text-sm text-espresso">Regra nº 1</h4><p class="text-xs text-mocha font-medium">Fez o último gole? Coloque mais água e pó ou corra para se esconder.</p></div>
          </div>
          <div class="bg-foam p-4 rounded-2xl comic-border shadow-comic flex items-start gap-3">
            <FeatureIcon icon="pixelarticons:wallet" tone="debt" />
            <div><h4 class="font-bold text-sm text-espresso">Caloteiros</h4><p class="text-xs text-mocha font-medium">Quem consome sem pagar aciona a maldição da garrafa morna e sem açúcar.</p></div>
          </div>
          <div class="bg-foam p-4 rounded-2xl comic-border shadow-comic flex items-start gap-3">
            <FeatureIcon icon="pixelarticons:receipt" tone="proof" />
            <div><h4 class="font-bold text-sm text-espresso">Comprovação</h4><p class="text-xs text-mocha font-medium">Emita sua segunda via a qualquer hora na aba "Segundas Vias" para esfregar no RH.</p></div>
          </div>
        </div>
      </section>

      <section v-show="!loading && activeTab === 'list'" class="tab-content space-y-6">
        <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-2xl font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:checklist" class="text-caramel text-3xl" /> Lista Oficial dos Cafeinados</h2>
              <p class="text-xs text-mocha font-medium">Mês de <span class="font-bold">{{ settings.month }}</span> • Todo mês a lista se renova!</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative flex-1 sm:w-64">
                <input v-model="searchMember" type="text" placeholder="Buscar colega..." class="w-full bg-foam text-xs font-bold pl-8 pr-3 py-2 rounded-xl comic-border focus:outline-none">
                <Icon icon="pixelarticons:search" class="absolute left-2.5 top-2.5 text-sm text-mocha/50" />
              </div>
              <CafeSelect v-model="filterStatus" :options="statusOptions" class="sm:w-56" />
              <CafeButton variant="caramel" size="sm" icon="pixelarticons:plus" @click="openJoinModal">
                Entrar Este Mês
              </CafeButton>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatTile label="Total Inscritos" :value="members.length" tone="foam" />
            <StatTile label="Quitados" :value="paidMembers.length" icon="pixelarticons:coffee" tone="mint" />
            <StatTile label="Em Análise" :value="pendingMembers.length" icon="pixelarticons:hourglass" tone="caramel" />
            <StatTile label="Arrecadado" :value="formatMoney(totalRaised)" tone="caramel" />
          </div>

          <div class="member-list-shell rounded-2xl comic-border bg-foam">
            <div class="member-list-scroll">
              <table class="member-list-table w-full text-left">
              <thead>
                <tr class="bg-roast text-foam text-xs font-mono uppercase border-b-2 border-espresso">
                  <th class="p-3">Colega de Trabalho</th><th class="p-3">Setor</th><th class="p-3 text-center">Status do Café</th><th class="p-3 text-center">Data Pagto</th><th class="p-3 text-right">Ação / Comprovante</th>
                </tr>
              </thead>
              <tbody class="divide-y-2 divide-espresso/10 text-sm font-medium">
                <tr v-if="filteredMembers.length === 0"><td colspan="5" class="p-6 text-center text-mocha font-bold italic">Nenhum participante encontrado... O café está solitário!</td></tr>
                <tr v-for="member in filteredMembers" :key="member.id" class="hover:bg-crema/50 transition-colors">
                  <td class="p-3 font-bold text-espresso flex items-center gap-2">
                    <span class="w-8 h-8 rounded-full comic-border flex items-center justify-center text-base" :class="memberAvatarClass(member.status)"><Icon :icon="memberStatusIcon(member.status)" /></span>{{ member.name }}
                  </td>
                  <td class="p-3 text-xs font-semibold text-mocha">{{ member.dept || 'Geral' }}</td>
                  <td class="p-3 text-center"><span class="inline-block text-xs font-black px-3 py-1 rounded-full comic-border" :class="memberStatusClass(member.status)">{{ memberStatusLabel(member.status) }}</span></td>
                  <td class="p-3 text-center text-xs font-mono font-bold text-espresso">{{ member.paidAt || '--/--/----' }}</td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button v-if="member.status === 'PAID'" @click="viewUserReceipt(member.name)" title="Ver Segunda Via" class="bg-caramel hover:bg-amber-600 text-espresso text-xs font-bold p-1.5 px-2.5 rounded-lg comic-border shadow-comic inline-flex items-center gap-1"><Icon icon="pixelarticons:receipt" /> Recibo</button>
                      <span v-else-if="member.status === 'PENDING'" class="bg-caramel/20 text-caramel text-xs font-black p-1.5 px-2.5 rounded-lg comic-border inline-flex items-center gap-1"><Icon icon="pixelarticons:hourglass" /> Em análise</span>
                      <button v-else @click="markAsPaidFromList(member.id)" title="Enviar para conferência" class="bg-mint hover:bg-emerald-600 text-foam text-xs font-bold p-1.5 px-2.5 rounded-lg comic-border shadow-comic inline-flex items-center gap-1"><Icon icon="pixelarticons:check" /> Já paguei</button>
                      <button @click="removeMember(member.id)" title="Sair da vaquinha neste mês" class="bg-roast hover:bg-espresso text-latte text-xs font-bold p-1.5 px-2 rounded-lg comic-border shadow-comic"><Icon icon="pixelarticons:user-minus" /></button>
                    </div>
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>

          <div class="mt-6 bg-latte/40 p-4 rounded-2xl comic-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3"><div class="text-3xl text-mocha"><Icon icon="pixelarticons:mood-sad" /></div><div><h4 class="text-xs font-bold uppercase text-espresso">Gerador Automático de Desculpas de Caloteiro</h4><p class="text-xs text-mocha italic">{{ funnyExcuse }}</p></div></div>
            <CafeButton variant="mocha" size="sm" icon="pixelarticons:dice" @click="generateExcuse">Gerar Outra Desculpa</CafeButton>
          </div>
        </div>
      </section>

      <section v-show="!loading && activeTab === 'receipts'" class="tab-content space-y-6">
        <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
          <div class="mb-6">
            <h2 class="text-2xl font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:card-id" class="text-caramel text-3xl" /> Emissor & Consultor de Licença de Cafeína</h2>
            <p class="text-xs text-mocha font-medium">Esfregue na cara de quem duvidar que você contribuiu para o café do mês!</p>
          </div>
          <div class="bg-foam p-5 rounded-2xl comic-border shadow-comic mb-6 max-w-xl">
            <label class="block text-xs font-bold text-espresso uppercase mb-2">Digite o Nome do Colega Quitado:</label>
            <div class="flex gap-2">
              <input v-model="receiptSearch" type="text" placeholder="Ex: Carlinhos do T.I." class="w-full bg-crema text-espresso font-bold px-4 py-2.5 rounded-xl comic-border focus:outline-none">
              <CafeButton variant="caramel" size="md" icon="pixelarticons:search" @click="searchAndShowReceipt">Gerar Recibo</CafeButton>
            </div>
          </div>
          <div v-if="selectedReceipt">
            <div id="printable-receipt" class="bg-foam p-6 sm:p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-2xl mx-auto relative overflow-hidden text-espresso">
              <div class="absolute top-6 right-6 font-mono font-black text-xl px-4 py-2 rounded-xl uppercase tracking-widest stamp-approved pointer-events-none select-none z-10 inline-flex items-center gap-2">QUITADO <Icon icon="pixelarticons:coffee" /></div>
              <div class="border-b-4 border-espresso pb-4 mb-4 flex items-center gap-3">
                <div class="w-12 h-12 bg-caramel rounded-xl comic-border flex items-center justify-center text-espresso text-3xl"><Icon icon="pixelarticons:coffee" /></div>
                <div><h3 class="text-xl font-black text-espresso tracking-tight">LICENÇA OFICIAL DE CONSUMO DE CAFÉ</h3><p class="text-[11px] font-mono font-bold text-mocha">REPUBLICA CAFEEIRA DA FIRMA S.A. • EDITAL MENSAL</p></div>
              </div>
              <div class="space-y-4 font-mono text-xs sm:text-sm my-6">
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">Nº DA LICENÇA:</span><span class="font-bold text-espresso">CAF-2026-{{ selectedReceipt.id.slice(-4) }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">BENEFICIÁRIO(A):</span><span class="font-bold text-espresso text-sm uppercase">{{ selectedReceipt.name }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">SETOR:</span><span class="font-bold text-espresso">{{ selectedReceipt.dept || 'GERAL' }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">MÊS DE REFERÊNCIA:</span><span class="font-bold text-espresso">{{ settings.month }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">VALOR CONTRIBUÍDO:</span><span class="font-bold text-emerald-700 text-base">{{ formatMoney(settings.monthlyFee) }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">DATA DE REGISTRO:</span><span class="font-bold text-espresso">{{ selectedReceipt.paidAt || '14/08/2026 12:00' }}</span></div>
              </div>
              <div class="bg-latte/50 p-3 rounded-xl comic-border text-[11px] font-sans font-medium text-mocha mb-6"><strong>PARECER TÉCNICO:</strong> O portador deste documento possui passe livre para até 4 xícaras diárias de café puro ou com leite. Proibido colocar açúcar no bule coletivo. Válido até o último dia do mês corrente.</div>
              <div class="text-center pt-2 border-t-2 border-dashed border-espresso/30"><div class="font-mono text-2xl font-black tracking-widest text-espresso mb-1 select-none">||||| | |||| ||| |||||| | ||||| ||| |||</div><p class="text-[9px] font-mono text-mocha uppercase">AUTENTICAÇÃO MECÂNICA DA CAFETEIRA DA FIRMA</p></div>
              <div class="mt-6 flex justify-end gap-2 print:hidden"><CafeButton variant="mint" size="md" icon="pixelarticons:printer" @click="printReceipt">Imprimir / Salvar PDF</CafeButton></div>
            </div>
          </div>
        </div>
      </section>

      <section v-show="!loading && activeTab === 'admin'" class="tab-content space-y-6">
        <div v-if="!adminUnlocked" class="bg-crema p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-md mx-auto text-center space-y-4">
          <div class="w-16 h-16 bg-roast text-caramel rounded-2xl comic-border shadow-comic flex items-center justify-center mx-auto text-4xl"><Icon icon="pixelarticons:lock" /></div>
          <h2 class="text-2xl font-black text-espresso">Acesso Restrito ao Mestre do Café</h2>
          <p class="text-xs text-mocha font-medium">Entre com a conta Google autorizada para alterar Pix, mensalidade e gestão da lista.</p>
          <CafeButton type="button" variant="foam" size="md" block icon="pixelarticons:user" :disabled="authLoading" @click="unlockAdmin">
            {{ authLoading ? 'Conectando...' : 'Entrar com Google' }}
          </CafeButton>
          <p v-if="signedInWithWrongAccount" class="text-[11px] text-chili font-bold">Conta conectada sem permissão: {{ currentUser.email }}</p>
          <p v-else-if="authError" class="text-[11px] text-chili font-bold">{{ authError }}</p>
          <p v-else-if="!hasFirebaseConfig" class="text-[11px] text-chili font-bold">Configure o arquivo .env com os dados do app web do Firebase para liberar o login.</p>
          <p v-else class="text-[10px] text-mocha/70 italic">Mestre inicial: <code class="font-bold">{{ MASTER_EMAIL }}</code></p>
        </div>

        <div v-else class="space-y-6">
          <div class="bg-roast text-foam p-6 rounded-3xl comic-border-lg shadow-comic-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div><span class="bg-caramel text-espresso text-[10px] font-black px-2.5 py-0.5 rounded-full comic-border uppercase">{{ roleLabel(adminUser?.role) }} Ativo</span><h2 class="text-2xl font-black text-foam mt-1 flex items-center gap-2">Painel do Café <Icon icon="pixelarticons:crown" class="text-caramel" /><span v-if="pendingPaymentRequests.length" class="bg-chili text-foam text-xs px-2 py-0.5 rounded-full comic-border inline-flex items-center gap-1"><Icon icon="pixelarticons:bell-ring" /> {{ pendingPaymentRequests.length }}</span></h2><p class="text-xs text-latte">Conectado como <span class="font-mono font-bold text-caramel">{{ adminUser?.email }}</span>. {{ isCoffeeMaster ? 'Você comanda o bule inteiro.' : 'Você ajuda a manter a vaquinha em ordem.' }}</p></div>
            <CafeButton variant="chili" size="sm" icon="pixelarticons:lock" @click="lockAdmin">Sair do Admin</CafeButton>
          </div>

          <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b-2 border-espresso/20 pb-3">
              <div>
                <h3 class="text-lg font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:bell-ring" class="text-caramel text-2xl" /> Notificações da Brigada</h3>
                <p class="text-xs text-mocha font-medium">Pedidos de "já paguei" aguardando o carimbo sagrado do coador.</p>
              </div>
              <CafeButton variant="foam" size="sm" icon="pixelarticons:arrow-up-wide-narrow" @click="refreshPaymentRequests">Atualizar fila</CafeButton>
            </div>

            <div v-if="pendingPaymentRequests.length === 0" class="bg-foam rounded-2xl comic-border p-4 text-xs font-bold text-mocha flex items-center gap-2">
              <Icon icon="pixelarticons:coffee" class="text-caramel text-xl" />
              Nenhum Pix batendo na porta. A paz temporária do RH foi decretada.
            </div>

            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div v-for="request in pendingPaymentRequests" :key="request.id" class="bg-foam rounded-2xl comic-border p-4 shadow-comic">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:receipt" class="text-caramel text-xl" /> {{ request.name }}</p>
                    <p class="text-[11px] text-mocha font-bold">{{ request.dept || 'Geral' }} • {{ request.month }} • {{ formatMoney(request.amount) }}</p>
                    <p class="text-[10px] text-mocha/80 font-mono mt-1">Protocolo: {{ request.id.slice(-8) }}</p>
                  </div>
                  <span class="bg-caramel text-espresso text-[10px] font-black px-2 py-1 rounded-full comic-border inline-flex items-center gap-1"><Icon icon="pixelarticons:hourglass" /> Perícia</span>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2">
                  <CafeButton variant="mint" size="sm" block icon="pixelarticons:check" @click="approvePaymentRequest(request)">Aprovar Pix</CafeButton>
                  <CafeButton variant="chili" size="sm" block icon="pixelarticons:close" @click="rejectPaymentRequest(request)">Recusar</CafeButton>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl space-y-4">
              <h3 class="text-lg font-black text-espresso border-b-2 border-espresso/20 pb-2 flex items-center gap-2"><Icon icon="pixelarticons:settings-cog" class="text-caramel text-2xl" /> Parâmetros da Cota</h3>
              <form v-if="isCoffeeMaster" @submit.prevent="saveAdminSettings" class="space-y-4">
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Mês / Ano de Referência</label><input v-model="adminForm.month" type="text" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm"></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Valor da Mensalidade (R$)</label><input v-model="adminForm.monthlyFee" type="number" step="0.5" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm font-mono"></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Tipo da Chave Pix</label><CafeSelect v-model="adminForm.pixType" :options="pixTypeOptions" /></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Chave Pix para Recebimento</label><input v-model="adminForm.pixKey" type="text" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm font-mono"></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Nome do Titular da Conta</label><input v-model="adminForm.pixOwner" type="text" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm"></div>
                <CafeButton type="submit" variant="mint" size="md" block icon="pixelarticons:checkbox-on">SALVAR ALTERAÇÕES</CafeButton>
              </form>
              <div v-else class="bg-foam p-4 rounded-2xl comic-border text-xs text-mocha font-bold">
                Configurações de Pix, mês e valor são território exclusivo do Mestre do Café.
              </div>
            </div>
            <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 class="text-lg font-black text-espresso border-b-2 border-espresso/20 pb-2 flex items-center gap-2"><Icon icon="pixelarticons:sliders" class="text-caramel text-2xl" /> Ações Rápidas do Gestor</h3>
                <div class="space-y-3 mt-4">
                  <div class="bg-foam p-3 rounded-xl comic-border"><h4 class="text-xs font-bold text-espresso flex items-center gap-1"><Icon icon="pixelarticons:volume-vibrate" class="text-chili text-lg" /> Cobrador Automático</h4><p class="text-[11px] text-mocha mb-2">Dispara um aviso sonoro engraçado e destaca quem ainda não pagou.</p><CafeButton variant="caramel" size="sm" block icon="pixelarticons:volume-3" @click="triggerHornSound">TOCAR SIRENE DA COBRANÇA</CafeButton></div>
                  <div class="bg-foam p-3 rounded-xl comic-border"><h4 class="text-xs font-bold text-espresso flex items-center gap-1"><Icon icon="pixelarticons:calendar-alert" class="text-caramel text-lg" /> Novo Mês (Zerar Pagamentos)</h4><p class="text-[11px] text-mocha mb-2">Mantém a lista de pessoas, mas marca todos como "Pendente" para o próximo mês.</p><CafeButton variant="roast" size="sm" block icon="pixelarticons:arrow-up-wide-narrow" @click="resetMonthlyPayments">REINICIAR PAGAMENTOS DO MÊS</CafeButton></div>
                </div>
              </div>
              <div class="bg-foam p-4 rounded-2xl comic-border mt-4">
                <h4 class="text-xs font-bold text-espresso uppercase mb-2">Adicionar Novo Integrante</h4>
                <form @submit.prevent="addMemberFromAdmin" class="space-y-2">
                  <input v-model="adminNewMember.name" type="text" placeholder="Nome do Colega" required class="w-full bg-crema text-xs font-bold p-2 rounded-lg comic-border">
                  <input v-model="adminNewMember.dept" type="text" placeholder="Setor (ex: RH)" class="w-full bg-crema text-xs font-bold p-2 rounded-lg comic-border">
                  <CafeButton type="submit" variant="mint" size="sm" block icon="pixelarticons:user-plus">Inserir na Lista</CafeButton>
                </form>
              </div>
            </div>
          </div>

          <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
            <div class="mb-5">
              <h3 class="text-lg font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:users" class="text-caramel text-2xl" /> Mestres Autorizados</h3>
              <p class="text-xs text-mocha font-medium">O acesso administrativo usa login Google e os e-mails configurados em <code class="font-bold">VITE_PASSCAFE_ADMIN_EMAILS</code>.</p>
            </div>

            <div class="bg-foam rounded-2xl comic-border overflow-hidden">
              <div v-for="email in ADMIN_EMAILS" :key="email" class="p-4 border-b-2 border-espresso/10 last:border-b-0 flex items-center justify-between gap-3">
                <div>
                  <p class="font-mono font-black text-sm text-espresso">{{ email }}</p>
                  <p class="text-[11px] font-bold text-caramel">{{ roleLabel('MASTER') }}</p>
                </div>
                <Icon icon="pixelarticons:crown" class="text-2xl text-caramel" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <div v-if="joinModalOpen" class="fixed inset-0 bg-espresso/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-crema p-6 sm:p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-md w-full space-y-4 relative">
        <button @click="joinModalOpen = false" class="absolute top-4 right-4 bg-chili text-foam rounded-xl w-8 h-8 comic-border flex items-center justify-center font-bold"><Icon icon="pixelarticons:close" /></button>
        <h3 class="text-2xl font-black text-espresso flex items-center gap-2">Entrar na Vaquinha <Icon icon="pixelarticons:coffee" class="text-caramel" /></h3>
        <p class="text-xs text-mocha font-medium">Você pode entrar e sair nos meses que quiser sem ressentimentos!</p>
        <form @submit.prevent="handleJoinSubmit" class="space-y-3 pt-2">
          <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Seu Nome *</label><input v-model="joinForm.name" type="text" required placeholder="Ex: Roberto do Almoxarifado" class="w-full bg-foam text-espresso font-bold p-3 rounded-xl comic-border focus:outline-none"></div>
          <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Seu Setor</label><input v-model="joinForm.dept" type="text" placeholder="Ex: Compras" class="w-full bg-foam text-espresso font-bold p-3 rounded-xl comic-border focus:outline-none"></div>
          <CafeButton type="submit" variant="mint" size="md" block icon="pixelarticons:user-plus">CONFIRMAR MINHA ENTRADA</CafeButton>
        </form>
      </div>
    </div>

    <footer class="bg-roast text-latte comic-border-lg border-b-0 border-x-0 py-6 px-4 mt-auto">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs">
        <div class="flex items-center gap-3"><span class="text-3xl text-caramel"><Icon icon="pixelarticons:coffee" /></span><div><p class="font-bold text-foam text-sm">Café Pass - O Guardião do Coador</p><p class="text-latte/70">Feito para acabar com as briguinhas de quem tomou e não pagou.</p></div></div>
        <p class="font-mono text-caramel font-bold">Sem cota = Sem cafeína © 2026</p>
      </div>
    </footer>
  </div>
</template>
