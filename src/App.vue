<script setup>
import { Icon, addCollection } from '@iconify/vue'
import pixelarticons from '@iconify-json/pixelarticons/icons.json'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  deleteMember as deleteFirestoreMember,
  createCafeUser,
  hasFirebaseConfig,
  loadAdmins,
  loadMembers,
  loadSettings,
  loginAdmin,
  logoutAdmin,
  saveMember,
  saveMembers,
  saveSettings,
  sendAdminPasswordReset,
  watchAdminAuth
} from './firebase'

addCollection(pixelarticons)

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

const settings = reactive({ ...DEFAULT_SETTINGS })
const members = ref([...DEFAULT_MEMBERS])
const activeTab = ref('pay')
const adminUnlocked = ref(false)
const loading = ref(true)

const userPayment = reactive({ name: '', dept: '' })
const joinForm = reactive({ name: '', dept: '' })
const adminForm = reactive({ ...DEFAULT_SETTINGS })
const adminCredentials = reactive({ email: '', password: '' })
const adminAuthLoading = ref(false)
const adminUser = ref(null)
const cafeUsers = ref([])
const cafeUserForm = reactive({ email: '', password: '', role: 'APPRENTICE' })
const adminNewMember = reactive({ name: '', dept: '' })
const searchMember = ref('')
const filterStatus = ref('ALL')
const receiptSearch = ref('')
const selectedReceipt = ref(null)
const joinModalOpen = ref(false)
const funnyExcuse = ref('"Não paguei ainda porque estou fazendo jejum intermitente de cafeína..."')
const funnyBanner = ref(FUNNY_BANNERS[0])
const toasts = ref([])

const paidMembers = computed(() => members.value.filter((member) => member.status === 'PAID'))
const unpaidCount = computed(() => members.value.length - paidMembers.value.length)
const totalRaised = computed(() => paidMembers.value.length * Number(settings.monthlyFee || 0))
const goalPercentage = computed(() => members.value.length ? Math.round((paidMembers.value.length / members.value.length) * 100) : 0)
const isCoffeeMaster = computed(() => adminUser.value?.role === 'MASTER')
const qrUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(settings.pixKey)}&color=1F120B&bgcolor=FFFDF9`)
const filteredMembers = computed(() => {
  const search = searchMember.value.trim().toLowerCase()
  return members.value.filter((member) => {
    const matchesSearch = !search || member.name.toLowerCase().includes(search) || (member.dept || '').toLowerCase().includes(search)
    const matchesFilter = filterStatus.value === 'ALL' || member.status === filterStatus.value
    return matchesSearch && matchesFilter
  })
})

onMounted(async () => {
  watchAdminAuth(async (user) => {
    adminUser.value = user
    adminUnlocked.value = Boolean(user)
    if (user?.email) adminCredentials.email = user.email
    cafeUsers.value = user ? await loadAdmins() : []
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

function nowFormatted() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function persistMember(member) {
  saveLocalState()
  await saveMember(member)
}

async function handleUserPayment() {
  const name = userPayment.name.trim()
  const dept = userPayment.dept.trim() || 'Geral'
  if (!name) return

  let member = members.value.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (member) {
    member.status = 'PAID'
    member.paidAt = nowFormatted()
    if (dept !== 'Geral') member.dept = dept
  } else {
    member = { id: Date.now().toString(), name, dept, status: 'PAID', paidAt: nowFormatted() }
    members.value.push(member)
  }

  await persistMember(member)
  showToast(`Pagamento registrado com sucesso para ${name}!`, 'success')
  playSuccessSound()
  userPayment.name = ''
  userPayment.dept = ''
  receiptSearch.value = member.name
  selectedReceipt.value = member
  switchTab('receipts')
}

async function markAsPaidFromList(id) {
  const member = members.value.find((item) => item.id === id)
  if (!member) return
  member.status = 'PAID'
  member.paidAt = nowFormatted()
  await persistMember(member)
  showToast(`Pagamento confirmado para ${member.name}!`, 'success')
  playSuccessSound()
}

async function removeMember(id) {
  const member = members.value.find((item) => item.id === id)
  members.value = members.value.filter((item) => item.id !== id)
  saveLocalState()
  await deleteFirestoreMember(id)
  if (member) showToast(`Colega ${member.name} saiu da vaquinha deste mês.`, 'info')
}

function searchAndShowReceipt() {
  const name = receiptSearch.value.trim()
  if (!name) return showToast('Digite um nome para consultar!', 'error')
  const member = members.value.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (!member) return showToast('Colega não encontrado na lista do mês!', 'error')
  if (member.status !== 'PAID') return showToast(`Atenção: ${member.name} ainda consta como PENDENTE!`, 'error')
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
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'E-mail ou senha incorretos.'
  if (code.includes('auth/user-not-found')) return 'Nenhum mestre cadastrado com esse e-mail.'
  if (code.includes('auth/email-already-in-use')) return 'Esse e-mail já está cadastrado no Firebase.'
  if (code.includes('auth/invalid-email')) return 'Digite um e-mail válido.'
  if (code.includes('auth/weak-password')) return 'Use uma senha com pelo menos 6 caracteres.'
  if (code.includes('auth/not-cafe-staff')) return 'Esse usuário existe, mas não é Mestre nem Aprendiz do Café.'
  if (code.includes('auth/too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  if (code.includes('permission-denied')) return 'Login aceito, mas falta liberar este usuário como Mestre/Aprendiz no Firestore.'
  return 'Não foi possível autenticar agora.'
}

async function unlockAdmin() {
  const email = adminCredentials.email.trim()
  const password = adminCredentials.password
  if (!email || !password) return showToast('Informe e-mail e senha do Mestre do Café.', 'error')

  try {
    adminAuthLoading.value = true
    await loginAdmin(email, password)
    adminCredentials.password = ''
    showToast('Painel do Mestre liberado com sucesso!', 'success')
  } catch (error) {
    showToast(authErrorMessage(error), 'error')
  } finally {
    adminAuthLoading.value = false
  }
}

async function lockAdmin() {
  await logoutAdmin()
  adminUnlocked.value = false
  adminCredentials.password = ''
  showToast('Painel do Mestre trancado.', 'info')
}

async function recoverAdminPassword() {
  const email = adminCredentials.email.trim()
  if (!email) return showToast('Digite seu e-mail para receber o link de recuperação.', 'error')

  try {
    adminAuthLoading.value = true
    await sendAdminPasswordReset(email)
    showToast('Link de recuperação enviado para o e-mail informado.', 'success')
  } catch (error) {
    showToast(authErrorMessage(error), 'error')
  } finally {
    adminAuthLoading.value = false
  }
}

function roleLabel(role) {
  return role === 'MASTER' ? 'Mestre do Café' : 'Aprendiz do Café'
}

async function refreshCafeUsers() {
  cafeUsers.value = await loadAdmins()
}

async function addCafeUser() {
  if (!isCoffeeMaster.value) return showToast('Somente o Mestre do Café pode convocar novos aprendizes.', 'error')

  const email = cafeUserForm.email.trim()
  const password = cafeUserForm.password
  if (!email || !password) return showToast('Informe e-mail e senha inicial do novo usuário.', 'error')

  try {
    adminAuthLoading.value = true
    const created = await createCafeUser({
      email,
      password,
      role: cafeUserForm.role,
      createdBy: adminUser.value.email
    })
    cafeUsers.value.push(created)
    cafeUsers.value.sort((a, b) => a.email.localeCompare(b.email))
    cafeUserForm.email = ''
    cafeUserForm.password = ''
    cafeUserForm.role = 'APPRENTICE'
    showToast(`${roleLabel(created.role)} cadastrado com sucesso.`, 'success')
  } catch (error) {
    showToast(authErrorMessage(error), 'error')
  } finally {
    adminAuthLoading.value = false
  }
}

async function saveAdminSettings() {
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
}

async function addMemberFromAdmin() {
  const name = adminNewMember.name.trim()
  if (!name) return
  const member = { id: Date.now().toString(), name, dept: adminNewMember.dept.trim() || 'Geral', status: 'UNPAID', paidAt: null }
  members.value.push(member)
  await persistMember(member)
  adminNewMember.name = ''
  adminNewMember.dept = ''
  showToast(`${name} entrou na lista do café.`, 'success')
}

async function handleJoinSubmit() {
  const name = joinForm.name.trim()
  if (!name) return
  if (members.value.some((member) => member.name.toLowerCase() === name.toLowerCase())) {
    showToast('Você já está na vaquinha deste mês!', 'info')
    joinModalOpen.value = false
    return
  }
  const member = { id: Date.now().toString(), name, dept: joinForm.dept.trim() || 'Geral', status: 'UNPAID', paidAt: null }
  members.value.push(member)
  await persistMember(member)
  joinForm.name = ''
  joinForm.dept = ''
  joinModalOpen.value = false
  showToast('Entrada confirmada. Agora só falta pagar o café!', 'success')
}

async function resetMonthlyPayments() {
  members.value = members.value.map((member) => ({ ...member, status: 'UNPAID', paidAt: null }))
  saveLocalState()
  await saveMembers(members.value)
  selectedReceipt.value = null
  showToast('Pagamentos reiniciados para o novo mês.', 'info')
}

function copyPixKey() {
  navigator.clipboard?.writeText(settings.pixKey)
  showToast('Chave Pix copiada!', 'success')
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
  window.print()
}

function showToast(message, type = 'info') {
  const id = Date.now()
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }, 3200)
}

function tone(frequency, duration, type = 'sine') {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.04, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  oscillator.start()
  oscillator.stop(ctx.currentTime + duration)
}

function playClickSound() { tone(260, 0.05, 'square') }
function playSuccessSound() { tone(620, 0.12, 'triangle') }
function playStampSound() { tone(140, 0.08, 'sawtooth') }
function playHornSound() { tone(180, 0.25, 'square') }
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
            <p class="text-xs text-mocha mb-4 font-medium">Escaneie o QR Code ou copie a chave abaixo</p>
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
                <button type="submit" class="w-full bg-mint hover:bg-emerald-600 text-foam font-black text-lg py-4 px-6 rounded-2xl comic-border shadow-comic hover:shadow-comic-hover active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-3">
                  <Icon icon="pixelarticons:check-double" class="text-2xl" /> CONFIRMAR QUE PAGUEI O CAFÉ!
                </button>
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
            <div class="feature-icon feature-icon--coffee">
              <Icon icon="pixelarticons:coffee-alt" class="feature-icon__main" />
            </div>
            <div><h4 class="font-bold text-sm text-espresso">Regra nº 1</h4><p class="text-xs text-mocha font-medium">Fez o último gole? Coloque mais água e pó ou corra para se esconder.</p></div>
          </div>
          <div class="bg-foam p-4 rounded-2xl comic-border shadow-comic flex items-start gap-3">
            <div class="feature-icon feature-icon--debt">
              <Icon icon="pixelarticons:wallet" class="feature-icon__main" />
            </div>
            <div><h4 class="font-bold text-sm text-espresso">Caloteiros</h4><p class="text-xs text-mocha font-medium">Quem consome sem pagar aciona a maldição da garrafa morna e sem açúcar.</p></div>
          </div>
          <div class="bg-foam p-4 rounded-2xl comic-border shadow-comic flex items-start gap-3">
            <div class="feature-icon feature-icon--proof">
              <Icon icon="pixelarticons:receipt" class="feature-icon__main" />
            </div>
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
              <select v-model="filterStatus" class="bg-foam text-xs font-bold px-3 py-2 rounded-xl comic-border focus:outline-none cursor-pointer">
                <option value="ALL">Todos os Colegas</option>
                <option value="PAID">Quitados (Paga-Lanches)</option>
                <option value="UNPAID">Desidratados (Pendentes)</option>
              </select>
              <button @click="joinModalOpen = true" class="bg-caramel hover:bg-amber-600 text-espresso font-bold text-xs px-3 py-2 rounded-xl comic-border shadow-comic hover:shadow-comic-hover transition-all flex items-center gap-1">
                <Icon icon="pixelarticons:plus" class="text-base" /> Entrar Este Mês
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-foam p-3 rounded-xl comic-border text-center"><span class="text-[10px] font-bold text-mocha uppercase block">Total Inscritos</span><span class="text-xl font-black text-espresso font-mono">{{ members.length }}</span></div>
            <div class="bg-mint/20 p-3 rounded-xl comic-border text-center"><span class="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-center gap-1"><Icon icon="pixelarticons:coffee" /> Quitados</span><span class="text-xl font-black text-emerald-700 font-mono">{{ paidMembers.length }}</span></div>
            <div class="bg-chili/20 p-3 rounded-xl comic-border text-center"><span class="text-[10px] font-bold text-red-800 uppercase flex items-center justify-center gap-1"><Icon icon="pixelarticons:robot-face-sad" /> Pendentes</span><span class="text-xl font-black text-red-700 font-mono">{{ unpaidCount }}</span></div>
            <div class="bg-caramel/20 p-3 rounded-xl comic-border text-center"><span class="text-[10px] font-bold text-amber-900 uppercase block">Arrecadado</span><span class="text-xl font-black text-amber-900 font-mono">{{ formatMoney(totalRaised) }}</span></div>
          </div>

          <div class="overflow-x-auto rounded-2xl comic-border bg-foam">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-roast text-foam text-xs font-mono uppercase border-b-2 border-espresso">
                  <th class="p-3">Colega de Trabalho</th><th class="p-3">Setor</th><th class="p-3 text-center">Status do Café</th><th class="p-3 text-center">Data Pagto</th><th class="p-3 text-right">Ação / Comprovante</th>
                </tr>
              </thead>
              <tbody class="divide-y-2 divide-espresso/10 text-sm font-medium">
                <tr v-if="filteredMembers.length === 0"><td colspan="5" class="p-6 text-center text-mocha font-bold italic">Nenhum participante encontrado... O café está solitário!</td></tr>
                <tr v-for="member in filteredMembers" :key="member.id" class="hover:bg-crema/50 transition-colors">
                  <td class="p-3 font-bold text-espresso flex items-center gap-2">
                    <span class="w-8 h-8 rounded-full comic-border flex items-center justify-center text-base" :class="member.status === 'PAID' ? 'bg-mint/20 text-mint' : 'bg-chili/20 text-chili'"><Icon :icon="member.status === 'PAID' ? 'pixelarticons:coffee' : 'pixelarticons:robot-face-sad'" /></span>{{ member.name }}
                  </td>
                  <td class="p-3 text-xs font-semibold text-mocha">{{ member.dept || 'Geral' }}</td>
                  <td class="p-3 text-center"><span class="inline-block text-xs font-black px-3 py-1 rounded-full comic-border" :class="member.status === 'PAID' ? 'bg-mint text-foam' : 'bg-chili text-foam'">{{ member.status === 'PAID' ? 'CAFEINADO (QUITADO)' : 'DESIDRATADO (PENDENTE)' }}</span></td>
                  <td class="p-3 text-center text-xs font-mono font-bold text-espresso">{{ member.paidAt || '--/--/----' }}</td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button v-if="member.status === 'PAID'" @click="viewUserReceipt(member.name)" title="Ver Segunda Via" class="bg-caramel hover:bg-amber-600 text-espresso text-xs font-bold p-1.5 px-2.5 rounded-lg comic-border shadow-comic inline-flex items-center gap-1"><Icon icon="pixelarticons:receipt" /> Recibo</button>
                      <button v-else @click="markAsPaidFromList(member.id)" title="Marcar como Pago" class="bg-mint hover:bg-emerald-600 text-foam text-xs font-bold p-1.5 px-2.5 rounded-lg comic-border shadow-comic inline-flex items-center gap-1"><Icon icon="pixelarticons:check" /> Paguei</button>
                      <button @click="removeMember(member.id)" title="Sair da vaquinha neste mês" class="bg-roast hover:bg-espresso text-latte text-xs font-bold p-1.5 px-2 rounded-lg comic-border shadow-comic"><Icon icon="pixelarticons:user-minus" /></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-6 bg-latte/40 p-4 rounded-2xl comic-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3"><div class="text-3xl text-mocha"><Icon icon="pixelarticons:mood-sad" /></div><div><h4 class="text-xs font-bold uppercase text-espresso">Gerador Automático de Desculpas de Caloteiro</h4><p class="text-xs text-mocha italic">{{ funnyExcuse }}</p></div></div>
            <button @click="generateExcuse" class="bg-mocha hover:bg-espresso text-foam font-bold text-xs px-3 py-2 rounded-xl comic-border shadow-comic whitespace-nowrap inline-flex items-center gap-1"><Icon icon="pixelarticons:dice" /> Gerar Outra Desculpa</button>
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
              <button @click="searchAndShowReceipt" class="bg-caramel hover:bg-amber-600 text-espresso font-black text-xs px-5 py-2.5 rounded-xl comic-border shadow-comic whitespace-nowrap inline-flex items-center gap-1"><Icon icon="pixelarticons:search" /> Gerar Recibo</button>
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
              <div class="mt-6 flex justify-end gap-2 print:hidden"><button @click="printReceipt" class="bg-mint hover:bg-emerald-600 text-foam font-bold text-xs px-4 py-2.5 rounded-xl comic-border shadow-comic flex items-center gap-2"><Icon icon="pixelarticons:printer" /> Imprimir / Salvar PDF</button></div>
            </div>
          </div>
        </div>
      </section>

      <section v-show="!loading && activeTab === 'admin'" class="tab-content space-y-6">
        <div v-if="!adminUnlocked" class="bg-crema p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-md mx-auto text-center space-y-4">
          <div class="w-16 h-16 bg-roast text-caramel rounded-2xl comic-border shadow-comic flex items-center justify-center mx-auto text-4xl"><Icon icon="pixelarticons:lock" /></div>
          <h2 class="text-2xl font-black text-espresso">Acesso Restrito ao Mestre do Café</h2>
          <p class="text-xs text-mocha font-medium">Entre com o e-mail cadastrado no Firebase. A senha fica guardada lá, longe dos olhos curiosos do bule.</p>
          <form @submit.prevent="unlockAdmin" class="space-y-3 pt-2">
            <input v-model="adminCredentials.email" type="email" autocomplete="email" placeholder="E-mail do Mestre do Café" required class="w-full bg-foam text-espresso text-center font-mono font-bold py-3 rounded-xl comic-border focus:outline-none">
            <input v-model="adminCredentials.password" type="password" autocomplete="current-password" placeholder="Senha secreta" required class="w-full bg-foam text-espresso text-center font-mono font-bold py-3 rounded-xl comic-border focus:outline-none">
            <button type="submit" :disabled="adminAuthLoading" class="w-full bg-caramel hover:bg-amber-600 disabled:opacity-70 text-espresso font-black py-3 rounded-xl comic-border shadow-comic hover:shadow-comic-hover inline-flex items-center justify-center gap-2"><Icon icon="pixelarticons:unlock" class="text-xl" /> {{ adminAuthLoading ? 'CONFERINDO CREDENCIAL...' : 'ENTRAR NO PAINEL' }}</button>
          </form>
          <button type="button" @click="recoverAdminPassword" :disabled="adminAuthLoading" class="text-[11px] text-mocha hover:text-espresso font-bold underline decoration-2 underline-offset-2 disabled:opacity-60">
            Esqueci a senha, mandar link por e-mail
          </button>
        </div>

        <div v-else class="space-y-6">
          <div class="bg-roast text-foam p-6 rounded-3xl comic-border-lg shadow-comic-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div><span class="bg-caramel text-espresso text-[10px] font-black px-2.5 py-0.5 rounded-full comic-border uppercase">{{ roleLabel(adminUser?.role) }} Ativo</span><h2 class="text-2xl font-black text-foam mt-1 flex items-center gap-2">Painel do Café <Icon icon="pixelarticons:crown" class="text-caramel" /></h2><p class="text-xs text-latte">Conectado como <span class="font-mono font-bold text-caramel">{{ adminUser?.email }}</span>. {{ isCoffeeMaster ? 'Você comanda o bule inteiro.' : 'Você ajuda a manter a vaquinha em ordem.' }}</p></div>
            <button @click="lockAdmin" class="bg-chili hover:bg-red-600 text-foam font-bold text-xs px-3 py-2 rounded-xl comic-border shadow-comic inline-flex items-center gap-1"><Icon icon="pixelarticons:lock" /> Sair do Admin</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl space-y-4">
              <h3 class="text-lg font-black text-espresso border-b-2 border-espresso/20 pb-2 flex items-center gap-2"><Icon icon="pixelarticons:settings-cog" class="text-caramel text-2xl" /> Parâmetros da Cota</h3>
              <form v-if="isCoffeeMaster" @submit.prevent="saveAdminSettings" class="space-y-4">
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Mês / Ano de Referência</label><input v-model="adminForm.month" type="text" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm"></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Valor da Mensalidade (R$)</label><input v-model="adminForm.monthlyFee" type="number" step="0.5" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm font-mono"></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Tipo da Chave Pix</label><select v-model="adminForm.pixType" class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm"><option value="E-mail">E-mail</option><option value="CPF / CNPJ">CPF / CNPJ</option><option value="Celular">Celular</option><option value="Chave Aleatória">Chave Aleatória</option></select></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Chave Pix para Recebimento</label><input v-model="adminForm.pixKey" type="text" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm font-mono"></div>
                <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Nome do Titular da Conta</label><input v-model="adminForm.pixOwner" type="text" required class="w-full bg-foam text-espresso font-bold p-2.5 rounded-xl comic-border text-sm"></div>
                <button type="submit" class="w-full bg-mint hover:bg-emerald-600 text-foam font-black text-sm py-3 rounded-xl comic-border shadow-comic inline-flex items-center justify-center gap-2"><Icon icon="pixelarticons:checkbox-on" class="text-xl" /> SALVAR ALTERAÇÕES</button>
              </form>
              <div v-else class="bg-foam p-4 rounded-2xl comic-border text-xs text-mocha font-bold">
                Configurações de Pix, mês e valor são território exclusivo do Mestre do Café.
              </div>
            </div>
            <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 class="text-lg font-black text-espresso border-b-2 border-espresso/20 pb-2 flex items-center gap-2"><Icon icon="pixelarticons:sliders" class="text-caramel text-2xl" /> Ações Rápidas do Gestor</h3>
                <div class="space-y-3 mt-4">
                  <div class="bg-foam p-3 rounded-xl comic-border"><h4 class="text-xs font-bold text-espresso flex items-center gap-1"><Icon icon="pixelarticons:volume-vibrate" class="text-chili text-lg" /> Cobrador Automático</h4><p class="text-[11px] text-mocha mb-2">Dispara um aviso sonoro engraçado e destaca quem ainda não pagou.</p><button @click="triggerHornSound" class="w-full bg-caramel hover:bg-amber-600 text-espresso font-bold text-xs py-2 rounded-lg comic-border shadow-comic inline-flex items-center justify-center gap-1"><Icon icon="pixelarticons:volume-3" /> TOCAR SIRENE DA COBRANÇA</button></div>
                  <div class="bg-foam p-3 rounded-xl comic-border"><h4 class="text-xs font-bold text-espresso flex items-center gap-1"><Icon icon="pixelarticons:calendar-alert" class="text-caramel text-lg" /> Novo Mês (Zerar Pagamentos)</h4><p class="text-[11px] text-mocha mb-2">Mantém a lista de pessoas, mas marca todos como "Pendente" para o próximo mês.</p><button @click="resetMonthlyPayments" class="w-full bg-roast hover:bg-espresso text-latte font-bold text-xs py-2 rounded-lg comic-border shadow-comic inline-flex items-center justify-center gap-1"><Icon icon="pixelarticons:arrow-up-wide-narrow" /> REINICIAR PAGAMENTOS DO MÊS</button></div>
                </div>
              </div>
              <div class="bg-foam p-4 rounded-2xl comic-border mt-4">
                <h4 class="text-xs font-bold text-espresso uppercase mb-2">Adicionar Novo Integrante</h4>
                <form @submit.prevent="addMemberFromAdmin" class="space-y-2">
                  <input v-model="adminNewMember.name" type="text" placeholder="Nome do Colega" required class="w-full bg-crema text-xs font-bold p-2 rounded-lg comic-border">
                  <input v-model="adminNewMember.dept" type="text" placeholder="Setor (ex: RH)" class="w-full bg-crema text-xs font-bold p-2 rounded-lg comic-border">
                  <button type="submit" class="w-full bg-mint text-foam font-bold text-xs py-2 rounded-lg comic-border shadow-comic inline-flex items-center justify-center gap-1"><Icon icon="pixelarticons:user-plus" /> Inserir na Lista</button>
                </form>
              </div>
            </div>
          </div>

          <div class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
              <div>
                <h3 class="text-lg font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:users" class="text-caramel text-2xl" /> Brigada do Café</h3>
                <p class="text-xs text-mocha font-medium">Mestres administram usuários e configurações. Aprendizes ajudam na rotina da vaquinha.</p>
              </div>
              <button @click="refreshCafeUsers" class="bg-foam hover:bg-latte text-espresso font-bold text-xs px-3 py-2 rounded-xl comic-border shadow-comic inline-flex items-center gap-1">
                <Icon icon="pixelarticons:arrow-up-wide-narrow" /> Atualizar lista
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div class="bg-foam rounded-2xl comic-border overflow-hidden">
                <div v-if="cafeUsers.length === 0" class="p-4 text-xs font-bold text-mocha">Nenhum usuário da brigada encontrado.</div>
                <div v-for="user in cafeUsers" :key="user.uid" class="p-4 border-b-2 border-espresso/10 last:border-b-0 flex items-center justify-between gap-3">
                  <div>
                    <p class="font-mono font-black text-sm text-espresso">{{ user.email }}</p>
                    <p class="text-[11px] font-bold" :class="user.role === 'MASTER' ? 'text-caramel' : 'text-mint'">{{ roleLabel(user.role) }}</p>
                  </div>
                  <Icon :icon="user.role === 'MASTER' ? 'pixelarticons:crown' : 'pixelarticons:user'" class="text-2xl" :class="user.role === 'MASTER' ? 'text-caramel' : 'text-mint'" />
                </div>
              </div>

              <div v-if="isCoffeeMaster" class="bg-foam p-4 rounded-2xl comic-border">
                <h4 class="text-xs font-bold text-espresso uppercase mb-3">Convocar Novo Usuário</h4>
                <form @submit.prevent="addCafeUser" class="space-y-3">
                  <input v-model="cafeUserForm.email" type="email" autocomplete="off" placeholder="E-mail do aprendiz ou mestre" required class="w-full bg-crema text-xs font-bold p-2.5 rounded-lg comic-border">
                  <input v-model="cafeUserForm.password" type="password" autocomplete="new-password" placeholder="Senha inicial" required class="w-full bg-crema text-xs font-bold p-2.5 rounded-lg comic-border">
                  <select v-model="cafeUserForm.role" class="w-full bg-crema text-xs font-bold p-2.5 rounded-lg comic-border">
                    <option value="APPRENTICE">Aprendiz do Café</option>
                    <option value="MASTER">Mestre do Café</option>
                  </select>
                  <button type="submit" :disabled="adminAuthLoading" class="w-full bg-caramel hover:bg-amber-600 disabled:opacity-70 text-espresso font-black text-xs py-3 rounded-xl comic-border shadow-comic inline-flex items-center justify-center gap-2">
                    <Icon icon="pixelarticons:user-plus" class="text-lg" /> CADASTRAR NA BRIGADA
                  </button>
                </form>
              </div>

              <div v-else class="bg-foam p-4 rounded-2xl comic-border text-xs text-mocha font-bold">
                Apenas o Mestre do Café pode convocar novos aprendizes.
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
          <button type="submit" class="w-full bg-mint text-foam font-black text-base py-3 rounded-xl comic-border shadow-comic inline-flex items-center justify-center gap-2"><Icon icon="pixelarticons:user-plus" class="text-xl" /> CONFIRMAR MINHA ENTRADA</button>
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
