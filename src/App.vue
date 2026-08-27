<script setup>
import { Icon, addCollection } from '@iconify/vue'
import pixelarticons from '@iconify-json/pixelarticons/icons.json'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import CafeButton from './components/CafeButton.vue'
import CafeClickerGame from './components/CafeClickerGame.vue'
import CafeSelect from './components/CafeSelect.vue'
import FeatureIcon from './components/FeatureIcon.vue'
import StatTile from './components/StatTile.vue'
import AchievementGallery from './components/AchievementGallery.vue'
import { ACHIEVEMENT_CATALOG } from './data/achievements'
import {
  acceptAdminInvite,
  changeAdminRole as changeRemoteAdminRole,
  createAdminInvite,
  declineAdminInvite,
  deleteMember as deleteFirestoreMember,
  createAuditLog,
  createPaymentRequest,
  hasFirebaseConfig,
  loadClickerSave as loadFirestoreClickerSave,
  loadAdminManagement as loadRemoteAdminManagement,
  loadMyAdminProfile,
  loadMembers,
  loadPaymentRequests,
  loadSettings,
  observeAuth,
  removeAdminAccess as removeRemoteAdminAccess,
  saveClickerSave,
  saveMember,
  saveMembers,
  saveSettings,
  signInWithGoogle,
  signOutUser,
  updatePaymentRequest,
  watchMyAdminInvites,
  watchMyAdminProfile,
  watchPaymentRequests
} from './firebase'

addCollection(pixelarticons)

const DEFAULT_SETTINGS = {
  month: 'AGOSTO / 2026',
  monthlyFee: 15,
  pixType: 'E-mail',
  pixKey: 'cafe-equipe@firma.com.br',
  pixOwner: 'Sr. Cafeeiro do RH'
}

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

const LOGIN_SATIRE_PHRASES = [
  'O café de hoje tem notas de produtividade e um leve aroma de sexta-feira.',
  'Carregando cafeína... reuniões desnecessárias foram reduzidas em 87%.',
  'Uma xícara rara apareceu. Ela concede +10 de paciência até o almoço.',
  'O expresso está pronto. A coragem para abrir a caixa de entrada, nem tanto.',
  'Dizem que o café não resolve tudo. Claramente faltou uma segunda dose.',
  'Seu combo de hoje: café forte, foco crítico e zero vontade de responder "ok".',
  'A cafeteira subiu de nível e agora julga silenciosamente quem escolhe descafeinado.',
  'Pressione continuar antes que alguém transforme o último café em cappuccino.'
]

const REBIRTH_LEVEL = 10
const LEVEL_TOTAL_REQUIREMENTS = Object.freeze([
  0,
  500,
  5_000,
  25_000,
  100_000,
  500_000,
  5_000_000,
  50_000_000,
  250_000_000,
  1_000_000_000
])
const POST_FINAL_LEVEL_MULTIPLIER = 2
const CLICKER_AUTO_SAVE_INTERVAL = 30 * 60 * 1000
const REBIRTH_THRESHOLD = coffeeThresholdForLevel(REBIRTH_LEVEL)
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENT_CATALOG.map((achievement) => achievement.id))
const CLICKER_UPGRADE_CATALOG = [
  { id: 'grinder', name: 'Moedor turbo', description: '+1 por clique', icon: 'pixelarticons:speed-fast', baseCost: 25, clickBonus: 1, autoBonus: 0 },
  { id: 'barista', name: 'Barista bot', description: '+1 café por segundo', icon: 'pixelarticons:android', baseCost: 80, clickBonus: 0, autoBonus: 1 },
  { id: 'double', name: 'Dose dupla', description: '+5 por clique', icon: 'pixelarticons:coffee', baseCost: 180, clickBonus: 5, autoBonus: 0 },
  { id: 'machine', name: 'Cafeteira PRO', description: '+6 cafés por segundo', icon: 'pixelarticons:zap', baseCost: 420, clickBonus: 0, autoBonus: 6 },
  { id: 'thermal', name: 'Copo térmico', description: '+18 por clique', icon: 'pixelarticons:briefcase', baseCost: 900, clickBonus: 18, autoBonus: 0 },
  { id: 'delivery', name: 'Delivery expresso', description: '+22 cafés por segundo', icon: 'pixelarticons:truck', baseCost: 1650, clickBonus: 0, autoBonus: 22 },
  { id: 'legendary', name: 'Grão lendário', description: '+65 por clique', icon: 'pixelarticons:star', baseCost: 3600, clickBonus: 65, autoBonus: 0 },
  { id: 'franchise', name: 'Franquia orbital', description: '+75 cafés por segundo', icon: 'pixelarticons:building-community', baseCost: 8200, clickBonus: 0, autoBonus: 75 }
]

const SKILL_TREE_CATALOG = [
  { id: 'origin', name: 'Receita ancestral', description: '+10% em toda produção', icon: 'pixelarticons:coffee-alt', baseCost: 1, maxLevel: 1, branch: 'root', globalBonus: 0.1 },
  { id: 'rapid', name: 'Mãos de barista', description: '+25% de força no clique', icon: 'pixelarticons:human-handsup', baseCost: 1, maxLevel: 4, branch: 'click', requires: { id: 'origin', level: 1 }, clickBonus: 0.25 },
  { id: 'automatic', name: 'Turno automático', description: '+25% de produção por segundo', icon: 'pixelarticons:repeat', baseCost: 1, maxLevel: 4, branch: 'auto', requires: { id: 'origin', level: 1 }, autoBonus: 0.25 },
  { id: 'supplier', name: 'Fornecedor VIP', description: '-7% no preço dos upgrades', icon: 'pixelarticons:briefcase-check', baseCost: 2, maxLevel: 3, branch: 'utility', requires: { id: 'origin', level: 1 }, discountBonus: 0.07 },
  { id: 'critical', name: 'Dose crítica', description: '+8% de chance de clique x5', icon: 'pixelarticons:zap', baseCost: 2, maxLevel: 3, branch: 'click', requires: { id: 'rapid', level: 2 }, criticalBonus: 0.08 },
  { id: 'temporal', name: 'Cafeteira temporal', description: '+20% em toda produção', icon: 'pixelarticons:clock', baseCost: 3, maxLevel: 3, branch: 'auto', requires: { id: 'automatic', level: 2 }, globalBonus: 0.2 },
  { id: 'precision', name: 'Moagem de precisão', description: '+40% de força no clique', icon: 'pixelarticons:bullseye', baseCost: 3, maxLevel: 3, branch: 'click', requires: { id: 'critical', level: 2 }, clickBonus: 0.4 },
  { id: 'roastery', name: 'Torra lendária', description: '+15% em toda produção', icon: 'pixelarticons:fire', baseCost: 5, maxLevel: 2, branch: 'click', requires: { id: 'precision', level: 2 }, globalBonus: 0.15 },
  { id: 'nightshift', name: 'Plantão da madrugada', description: '+40% de produção por segundo', icon: 'pixelarticons:moon-star', baseCost: 4, maxLevel: 3, branch: 'auto', requires: { id: 'temporal', level: 2 }, autoBonus: 0.4 },
  { id: 'network', name: 'Rede de cafeterias', description: '+15% em toda produção', icon: 'pixelarticons:building-community', baseCost: 5, maxLevel: 2, branch: 'auto', requires: { id: 'nightshift', level: 2 }, globalBonus: 0.15 },
  { id: 'warehouse', name: 'Estoque estratégico', description: '-4% no preço dos upgrades', icon: 'pixelarticons:archive', baseCost: 3, maxLevel: 3, branch: 'utility', requires: { id: 'supplier', level: 2 }, discountBonus: 0.04 },
  { id: 'pilgrimage', name: 'Peregrinação do grão', description: '+1 CoinFé em cada renascimento', icon: 'pixelarticons:coin', baseCost: 5, maxLevel: 2, branch: 'utility', requires: { id: 'warehouse', level: 2 }, rebirthBonus: 1 },
  { id: 'legacy', name: 'Legado do Cafezord', description: '+25% em toda produção', icon: 'pixelarticons:crown', baseCost: 7, maxLevel: 2, branch: 'utility', requires: { id: 'pilgrimage', level: 2 }, globalBonus: 0.25 }
]

const WORLD_STAGES = [
  { name: 'Café do Amanhecer', label: 'CAFETERIA CARIOCA', className: 'world-dawn', stageClass: 'stage-cafe', background: '/backgrounds/level-01-cafe-amanhecer.png' },
  { name: 'Brisa de Coco', label: 'PRAIA TROPICAL', className: 'world-beach', stageClass: 'stage-beach', background: '/backgrounds/level-02-praia-tropical.png' },
  { name: 'Expresso do Oásis', label: 'DESERTO DOURADO', className: 'world-desert', stageClass: 'stage-desert', background: '/backgrounds/level-03-oasis-deserto.png' },
  { name: 'Sakura Latte', label: 'TEMPLO DAS CEREJEIRAS', className: 'world-sakura', stageClass: 'stage-sakura', background: '/backgrounds/level-04-templo-sakura.png' },
  { name: 'Grão dos Faraós', label: 'EGITO ANTIGO', className: 'world-egypt', stageClass: 'stage-egypt', background: '/backgrounds/level-05-egito-antigo.png' },
  { name: 'Café nas Nuvens', label: 'MACHU PICCHU', className: 'world-inca', stageClass: 'stage-inca', background: '/backgrounds/level-06-machu-picchu.png' },
  { name: 'Alquimia da Torra', label: 'CASTELO ALQUIMISTA', className: 'world-castle', stageClass: 'stage-castle', background: '/backgrounds/level-07-castelo-alquimista.png' },
  { name: 'Néctar Encantado', label: 'FLORESTA BIOLUMINESCENTE', className: 'world-forest', stageClass: 'stage-forest', background: '/backgrounds/level-08-floresta-magica.png' },
  { name: 'Dose Lunar', label: 'BASE NA LUA', className: 'world-moon', stageClass: 'stage-moon', background: '/backgrounds/level-09-base-lunar.png' },
  { name: 'Cafezord Infinito', label: 'BORDA DO UNIVERSO', className: 'world-cosmos', stageClass: 'stage-cosmos', background: '/backgrounds/level-10-borda-universo.png' }
]

const MEMBER_LEVEL_TITLES = [
  { minLevel: 1, title: 'Cheirador de Coador', rarity: 'comum', className: 'common', effectClass: 'coador' },
  { minLevel: 3, title: 'Pingado Iniciante', rarity: 'comum', className: 'common', effectClass: 'pingado' },
  { minLevel: 5, title: 'Guardinha da Garrafa', rarity: 'comum', className: 'common', effectClass: 'garrafa' },
  { minLevel: 7, title: 'Fiscal do Copinho', rarity: 'incomum', className: 'uncommon', effectClass: 'copinho' },
  { minLevel: 9, title: 'Moedor de Boletos', rarity: 'incomum', className: 'uncommon', effectClass: 'boletos' },
  { minLevel: 11, title: 'Espumador de Reuniao', rarity: 'incomum', className: 'uncommon', effectClass: 'espuma' },
  { minLevel: 14, title: 'Barista de Planilha', rarity: 'raro', className: 'rare', effectClass: 'planilha' },
  { minLevel: 17, title: 'Xama do Filtro', rarity: 'raro', className: 'rare', effectClass: 'xama' },
  { minLevel: 20, title: 'Latteiro de Guerra', rarity: 'raro', className: 'rare', effectClass: 'latteiro' },
  { minLevel: 24, title: 'Capitao Cappuccino', rarity: 'epico', className: 'epic', effectClass: 'capuccino' },
  { minLevel: 28, title: 'Doutor em Cafeina', rarity: 'epico', className: 'epic', effectClass: 'cafeina' },
  { minLevel: 32, title: 'Senhor do Bule Nervoso', rarity: 'epico', className: 'epic', effectClass: 'bule' },
  { minLevel: 37, title: 'Arqueologo do Po Perdido', rarity: 'lendario', className: 'legendary', effectClass: 'arqueologo' },
  { minLevel: 42, title: 'Oraculo do Pix Torrado', rarity: 'lendario', className: 'legendary', effectClass: 'oraculo' },
  { minLevel: 48, title: 'Imperador do Expresso', rarity: 'lendario', className: 'legendary', effectClass: 'imperador' },
  { minLevel: 55, title: 'Entidade do Cafezinho', rarity: 'mitico', className: 'mythic', effectClass: 'entidade' },
  { minLevel: 63, title: 'Patrono da Garrafa Eterna', rarity: 'mitico', className: 'mythic', effectClass: 'patrono' },
  { minLevel: 72, title: 'Deus do Pix Cafeinado', rarity: 'mitico', className: 'mythic', effectClass: 'pix' },
  { minLevel: 84, title: 'Lenda do Coador Supremo', rarity: 'secreto', className: 'secret', effectClass: 'lenda' },
  { minLevel: 100, title: 'Cafezord Prime do RH', rarity: 'secreto', className: 'secret', effectClass: 'cafezord' }
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

const adminRoleOptions = [
  { value: 'MASTER', label: 'Mestre do Café' },
  { value: 'APPRENTICE', label: 'Aprendiz do Café' }
]

const settings = reactive({ ...DEFAULT_SETTINGS })
const members = ref([])
const activeTab = ref('pay')
const loading = ref(true)
const authReady = ref(false)
const authLoading = ref(false)
const authError = ref('')
const currentUser = ref(null)
const userPhotoFailed = ref(false)

const userPayment = reactive({ dept: '' })
const joinForm = reactive({ dept: '' })
const adminForm = reactive({ ...DEFAULT_SETTINGS })
const adminUser = ref(null)
const managedAdmins = ref([])
const pendingAdminInvites = ref([])
const myAdminInvites = ref([])
const adminInviteAnswering = ref(false)
const adminManagementLoading = ref(false)
const adminManagementError = ref('')
const adminInviteForm = reactive({ email: '', role: 'MASTER' })
const adminRemovalTarget = ref(null)
const paymentRequests = ref([])
const adminNewMember = reactive({ name: '', dept: '' })
const searchMember = ref('')
const filterStatus = ref('ALL')
const receiptSearch = ref('')
const selectedReceipt = ref(null)
const joinModalOpen = ref(false)
const funnyExcuse = ref('"Não paguei ainda porque estou fazendo jejum intermitente de cafeína..."')
const funnyBanner = ref(FUNNY_BANNERS[0])
const loginSatirePhrase = ref(pickLoginSatirePhrase())
const savedClicker = createEmptyClickerSave()
const coffeeCoins = ref(savedClicker.coins)
const totalBrewed = ref(savedClicker.total)
const sceneVariant = ref(savedClicker.sceneVariant)
const coinFes = ref(savedClicker.coinFes)
const rebirths = ref(savedClicker.rebirths)
const lifetimeBrewed = ref(savedClicker.lifetimeBrewed)
const highestGameLevel = ref(savedClicker.highestGameLevel)
const manualClicks = ref(savedClicker.manualClicks)
const criticalClicks = ref(savedClicker.criticalClicks)
const coinFesEarned = ref(savedClicker.coinFesEarned)
const unlockedAchievementIds = ref(new Set(savedClicker.achievements))
const achievementUnlockedAt = ref({ ...savedClicker.achievementUnlockedAt })
const shopView = ref('upgrades')
const rebirthConfirming = ref(false)
const gameStatus = ref('Toque na xícara para preparar')
const clickBursts = ref([])
const manualClickerSaveLoading = ref(false)
const clickerSaveStatus = ref('Aguardando sincronizacao')
const clickerLastSaveAt = ref(null)
const clickerLastLoadAt = ref(null)
const clickerLastError = ref('')
const clickerUpgrades = reactive(CLICKER_UPGRADE_CATALOG.map((upgrade) => ({
  ...upgrade,
  owned: Number(savedClicker.upgrades?.[upgrade.id] || 0)
})))
const skillTree = reactive(SKILL_TREE_CATALOG.map((skill) => ({
  ...skill,
  level: Number(savedClicker.skills?.[skill.id] || 0)
})))
const toasts = ref([])
let unwatchPaymentRequests = () => {}
let unwatchMyAdminInvites = () => {}
let unwatchMyAdminProfile = () => {}
let paymentRequestsReady = false
let funnyBannerTimer = null
let clickerTimer = null
let clickerSaveTimer = null
let loadedClickerUserId = null
let clickerHydrating = false
let clickerSaveFailed = false

const paidMembers = computed(() => members.value.filter((member) => member.status === 'PAID'))
const pendingMembers = computed(() => members.value.filter((member) => member.status === 'PENDING'))
const unpaidCount = computed(() => members.value.length - paidMembers.value.length)
const totalRaised = computed(() => paidMembers.value.length * Number(settings.monthlyFee || 0))
const goalPercentage = computed(() => members.value.length ? Math.round((paidMembers.value.length / members.value.length) * 100) : 0)
const isCoffeeMaster = computed(() => adminUser.value?.role === 'MASTER')
const pendingPaymentRequests = computed(() => selectPendingPaymentRequests(paymentRequests.value))
function selectPendingPaymentRequests(requests) {
  const activePendingMemberIds = new Set(
    members.value
      .filter((member) => member.status === 'PENDING')
      .map((member) => member.id)
  )
  const unique = new Map()

  requests
    .filter((request) => request.status === 'PENDING' && activePendingMemberIds.has(request.memberId))
    .forEach((request) => {
      if (!unique.has(request.memberId)) unique.set(request.memberId, request)
    })

  return [...unique.values()]
}
const pixPayload = computed(() => buildPixPayload())
const qrUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload.value)}&color=1F120B&bgcolor=FFFDF9`)
const adminUnlocked = computed(() => Boolean(adminUser.value))
const signedInWithWrongAccount = computed(() => Boolean(currentUser.value && !adminUnlocked.value))
const isSignedIn = computed(() => Boolean(currentUser.value))
const permanentMultiplier = computed(() => {
  const skillBonus = skillTree.reduce((total, skill) => total + ((skill.globalBonus || 0) * skill.level), 0)
  return 1 + skillBonus + (rebirths.value * 0.08)
})
const clickSkillMultiplier = computed(() => 1 + skillTree.reduce((total, skill) => total + ((skill.clickBonus || 0) * skill.level), 0))
const autoSkillMultiplier = computed(() => 1 + skillTree.reduce((total, skill) => total + ((skill.autoBonus || 0) * skill.level), 0))
const upgradeDiscount = computed(() => Math.min(0.35, skillTree.reduce((total, skill) => total + ((skill.discountBonus || 0) * skill.level), 0)))
const criticalChance = computed(() => Math.min(0.4, skillTree.reduce((total, skill) => total + ((skill.criticalBonus || 0) * skill.level), 0)))
const clickPower = computed(() => (1 + clickerUpgrades.reduce((total, upgrade) => total + (upgrade.clickBonus * upgrade.owned), 0)) * clickSkillMultiplier.value * permanentMultiplier.value)
const autoBrew = computed(() => clickerUpgrades.reduce((total, upgrade) => total + (upgrade.autoBonus * upgrade.owned), 0) * autoSkillMultiplier.value * permanentMultiplier.value)
const clickerLevel = computed(() => gameLevelForTotal(totalBrewed.value))
const levelStart = computed(() => coffeeThresholdForLevel(clickerLevel.value))
const levelTarget = computed(() => coffeeThresholdForLevel(clickerLevel.value + 1))
const levelProgress = computed(() => {
  const range = levelTarget.value - levelStart.value
  return Math.min(100, Math.max(0, ((totalBrewed.value - levelStart.value) / range) * 100))
})
const currentWorld = computed(() => WORLD_STAGES[Math.min(WORLD_STAGES.length - 1, clickerLevel.value - 1)])
const worldClass = computed(() => currentWorld.value.className)
const signedInUserName = computed(() => (
  currentUser.value?.displayName?.trim() || currentUser.value?.email?.split('@')[0] || ''
))
const currentMember = computed(() => findCurrentMember())
const currentUserAlreadyJoined = computed(() => Boolean(currentMember.value))
const currentMemberLevel = computed(() => calculateMemberLevel(currentMember.value))
const currentMemberTitle = computed(() => memberLevelTitle(currentMemberLevel.value))
const currentMemberPaymentCount = computed(() => memberPaymentCount(currentMember.value))
const ownedUpgradeCount = computed(() => clickerUpgrades.reduce((total, upgrade) => total + upgrade.owned, 0))
const purchasedSkillLevels = computed(() => skillTree.reduce((total, skill) => total + skill.level, 0))
const allSkillsMaxed = computed(() => skillTree.every((skill) => skill.level >= skill.maxLevel))
const achievements = computed(() => ACHIEVEMENT_CATALOG.map((achievement) => {
  const current = achievementCurrentValue(achievement.metric)
  const unlocked = unlockedAchievementIds.value.has(achievement.id)
  return {
    ...achievement,
    current: unlocked ? Math.max(current, achievement.target) : current,
    progress: unlocked ? 100 : Math.min(100, Math.max(0, (current / achievement.target) * 100)),
    unlocked,
    unlockedAt: achievementUnlockedAt.value[achievement.id] || null
  }
}))
const unlockedAchievementCount = computed(() => unlockedAchievementIds.value.size)
const canRebirth = computed(() => clickerLevel.value >= REBIRTH_LEVEL)
const rebirthSkillBonus = computed(() => skillTree.reduce((total, skill) => total + ((skill.rebirthBonus || 0) * skill.level), 0))
const rebirthBillions = computed(() => Math.floor(totalBrewed.value / REBIRTH_THRESHOLD))
const rebirthBillionBonus = computed(() => Math.max(0, rebirthBillions.value - 1))
const rebirthReward = computed(() => canRebirth.value
  ? 2 + rebirths.value + Math.floor((clickerLevel.value - REBIRTH_LEVEL) / 3) + rebirthSkillBonus.value + rebirthBillionBonus.value
  : 0)
const rebirthProgress = computed(() => {
  if (!canRebirth.value) return Math.min(100, (totalBrewed.value / REBIRTH_THRESHOLD) * 100)
  return ((totalBrewed.value % REBIRTH_THRESHOLD) / REBIRTH_THRESHOLD) * 100
})
const rebirthNextBillionTarget = computed(() => (rebirthBillions.value + 1) * REBIRTH_THRESHOLD)
const filteredMembers = computed(() => {
  const search = searchMember.value.trim().toLowerCase()
  return members.value.filter((member) => {
    const matchesSearch = !search || member.name.toLowerCase().includes(search) || (member.dept || '').toLowerCase().includes(search)
    const matchesFilter = filterStatus.value === 'ALL' || member.status === filterStatus.value
    return matchesSearch && matchesFilter
  })
})

onMounted(async () => {
  observeAuth(async (user) => {
    unwatchPaymentRequests()
    unwatchMyAdminInvites()
    unwatchMyAdminProfile()
    paymentRequestsReady = false
    if (currentUser.value?.uid !== user?.uid) userPhotoFailed.value = false
    if (currentUser.value?.uid && currentUser.value.uid !== user?.uid) await saveClickerProgress()
    currentUser.value = user
    await hydrateClickerUser(user)
    authReady.value = true
    adminUser.value = await resolveAdminProfile(user)
    if (user && adminUser.value) startMyAdminProfileWatcher(user)
    myAdminInvites.value = []
    if (user?.email && !adminUser.value) {
      unwatchMyAdminInvites = watchMyAdminInvites(user.email, (invites) => {
        myAdminInvites.value = invites
        if (invites.length) playMailSound()
      })
    }
    paymentRequests.value = []
    if (adminUser.value) startAdminPaymentWatcher()
    if (adminUser.value?.role === 'MASTER') await refreshAdminManagement(false)
  })

  try {
    const [loadedSettings, loadedMembers] = await Promise.all([
      loadSettings(loadLocalSettings()),
      loadMembers()
    ])
    Object.assign(settings, loadedSettings)
    Object.assign(adminForm, loadedSettings)
    members.value = loadedMembers
  } catch (error) {
    showToast('Não foi possível carregar os dados do Firestore.', 'error')
  } finally {
    loading.value = false
  }

  funnyBannerTimer = window.setInterval(() => {
    funnyBanner.value = FUNNY_BANNERS[Math.floor(Math.random() * FUNNY_BANNERS.length)]
  }, 5000)

  clickerTimer = window.setInterval(() => {
    if (!autoBrew.value) return
    addCoffee(autoBrew.value / 4, false)
  }, 250)

  clickerSaveTimer = window.setInterval(saveClickerProgress, CLICKER_AUTO_SAVE_INTERVAL)
})

onBeforeUnmount(() => {
  unwatchPaymentRequests()
  unwatchMyAdminInvites()
  unwatchMyAdminProfile()
  window.clearInterval(funnyBannerTimer)
  window.clearInterval(clickerTimer)
  window.clearInterval(clickerSaveTimer)
  saveClickerProgress()
})

function requireAdmin() {
  if (adminUnlocked.value) return true
  showToast('Sua conta Google não possui um cargo administrativo ativo.', 'error')
  return false
}

function requireSignedIn() {
  if (isSignedIn.value) return true
  showToast('Entre com Google para usar o Cafe Pass.', 'error')
  return false
}

function pickLoginSatirePhrase() {
  const storageKey = 'passcafe_last_login_phrase'
  let storage = null
  let lastIndex = -1

  try {
    storage = typeof sessionStorage === 'undefined' ? null : sessionStorage
    lastIndex = Number(storage?.getItem(storageKey) ?? -1)
  } catch {
    storage = null
  }

  let nextIndex = Math.floor(Math.random() * LOGIN_SATIRE_PHRASES.length)

  if (LOGIN_SATIRE_PHRASES.length > 1 && nextIndex === lastIndex) {
    nextIndex = (nextIndex + 1) % LOGIN_SATIRE_PHRASES.length
  }

  try {
    storage?.setItem(storageKey, String(nextIndex))
  } catch {
    // Browsers can block storage; the phrase still works as a plain random pick.
  }

  return LOGIN_SATIRE_PHRASES[nextIndex]
}

function createEmptyClickerSave() {
  return {
    coins: 0,
    total: 0,
    lifetimeBrewed: 0,
    highestGameLevel: 1,
    sceneVariant: 0,
    coinFes: 0,
    coinFesEarned: 0,
    rebirths: 0,
    manualClicks: 0,
    criticalClicks: 0,
    upgrades: {},
    skills: {},
    achievements: [],
    achievementUnlockedAt: {}
  }
}

function summarizeClickerSave(save) {
  return {
    coins: Math.floor(Number(save.coins) || 0),
    total: Math.floor(Number(save.total) || 0),
    lifetimeBrewed: Math.floor(Number(save.lifetimeBrewed) || 0),
    highestGameLevel: Math.floor(Number(save.highestGameLevel) || 1),
    sceneVariant: Number(save.sceneVariant) || 0,
    coinFes: Number(save.coinFes) || 0,
    coinFesEarned: Number(save.coinFesEarned) || 0,
    rebirths: Number(save.rebirths) || 0,
    manualClicks: Number(save.manualClicks) || 0,
    criticalClicks: Number(save.criticalClicks) || 0,
    upgrades: save.upgrades || {},
    skills: save.skills || {},
    achievements: Array.isArray(save.achievements) ? save.achievements : []
  }
}

function clickerRemotePath(userId) {
  return userId ? `clickerSaves/${userId}` : 'clickerSaves/<sem-usuario>'
}

function sanitizeRemoteProviderText(value) {
  return String(value || '')
    .replace(/Firebase Authentication/gi, 'login Google')
    .replace(/FirebaseError/gi, 'Erro remoto')
    .replace(/Firebase/gi, 'servico remoto')
}

function remoteErrorDetails(error) {
  return {
    name: sanitizeRemoteProviderText(error?.name || null),
    code: error?.code || null,
    message: sanitizeRemoteProviderText(error?.message || String(error))
  }
}

function logClickerSave(level, event, details = {}) {
  const entry = {
    event,
    at: new Date().toISOString(),
    hasRemoteConfig: hasFirebaseConfig,
    activeTab: activeTab.value,
    authReady: authReady.value,
    currentUid: currentUser.value?.uid || null,
    currentEmail: currentUser.value?.email || null,
    ...details
  }

  try {
    window.__passCafeClickerLogs = [...(window.__passCafeClickerLogs || []), entry].slice(-80)
  } catch {
    // Debug history is optional; console logging below is the source of truth.
  }

  const logger = console[level] || console.info
  logger('[PassCafe Clicker Save]', entry)
}

function formatClickerSaveTime(isoDate) {
  if (!isoDate) return 'ainda nao salvo'
  return new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function buildClickerSavePayload(userId) {
  const upgrades = Object.fromEntries(clickerUpgrades.map((upgrade) => [upgrade.id, upgrade.owned]))
  const skills = Object.fromEntries(skillTree.map((skill) => [skill.id, skill.level]))
  return {
    uid: userId,
    coins: coffeeCoins.value,
    total: totalBrewed.value,
    lifetimeBrewed: lifetimeBrewed.value,
    highestGameLevel: highestGameLevel.value,
    sceneVariant: sceneVariant.value,
    coinFes: coinFes.value,
    coinFesEarned: coinFesEarned.value,
    rebirths: rebirths.value,
    manualClicks: manualClicks.value,
    criticalClicks: criticalClicks.value,
    upgrades,
    skills,
    achievements: [...unlockedAchievementIds.value],
    achievementUnlockedAt: achievementUnlockedAt.value,
    updatedAt: new Date().toISOString()
  }
}

function normalizeClickerSave(saved = {}) {
  const total = Math.max(0, Number(saved.total) || 0)
  const rebirthCount = Math.max(0, Number(saved.rebirths) || 0)
  const inferredHighestLevel = rebirthCount > 0 ? REBIRTH_LEVEL : gameLevelForTotal(total)
  const savedAchievements = Array.isArray(saved.achievements)
    ? [...new Set(saved.achievements.filter((id) => ACHIEVEMENT_IDS.has(id)))]
    : []
  const savedAchievementDates = saved.achievementUnlockedAt && typeof saved.achievementUnlockedAt === 'object'
    ? Object.fromEntries(Object.entries(saved.achievementUnlockedAt).filter(([id]) => ACHIEVEMENT_IDS.has(id)))
    : {}
  return {
    coins: Math.max(0, Number(saved.coins) || 0),
    total,
    lifetimeBrewed: Math.max(total, Number(saved.lifetimeBrewed) || 0),
    highestGameLevel: Math.max(inferredHighestLevel, Number(saved.highestGameLevel) || 1),
    sceneVariant: Math.max(0, Number(saved.sceneVariant) || 0),
    coinFes: Math.max(0, Number(saved.coinFes) || 0),
    coinFesEarned: Math.max(Number(saved.coinFes) || 0, rebirthCount * 2, Number(saved.coinFesEarned) || 0),
    rebirths: rebirthCount,
    manualClicks: Math.max(0, Number(saved.manualClicks) || 0),
    criticalClicks: Math.max(0, Number(saved.criticalClicks) || 0),
    upgrades: saved.upgrades || {},
    skills: saved.skills || {},
    achievements: savedAchievements,
    achievementUnlockedAt: savedAchievementDates
  }
}

function applyClickerSave(saved) {
  coffeeCoins.value = saved.coins
  totalBrewed.value = saved.total
  lifetimeBrewed.value = saved.lifetimeBrewed
  highestGameLevel.value = saved.highestGameLevel
  sceneVariant.value = saved.sceneVariant
  coinFes.value = saved.coinFes
  coinFesEarned.value = saved.coinFesEarned
  rebirths.value = saved.rebirths
  manualClicks.value = saved.manualClicks
  criticalClicks.value = saved.criticalClicks
  unlockedAchievementIds.value = new Set(saved.achievements || [])
  achievementUnlockedAt.value = { ...(saved.achievementUnlockedAt || {}) }
  clickerUpgrades.forEach((upgrade) => { upgrade.owned = Number(saved.upgrades?.[upgrade.id] || 0) })
  skillTree.forEach((skill) => { skill.level = Number(saved.skills?.[skill.id] || 0) })
  clickBursts.value = []
  rebirthConfirming.value = false
  gameStatus.value = 'Toque na xícara para preparar'
}

async function hydrateClickerUser(user) {
  const userId = user?.uid || null
  if (userId === loadedClickerUserId) {
    logClickerSave('info', 'load:skip:same-user', { path: clickerRemotePath(userId) })
    return
  }
  loadedClickerUserId = userId
  clickerHydrating = true
  clickerLastError.value = ''
  clickerSaveStatus.value = userId ? 'Carregando save da nuvem' : 'Sem usuário logado'
  logClickerSave('info', 'load:start', {
    path: clickerRemotePath(userId),
    userEmail: user?.email || null
  })
  applyClickerSave(createEmptyClickerSave())
  try {
    const loadedSave = userId
      ? await loadFirestoreClickerSave(userId, createEmptyClickerSave())
      : createEmptyClickerSave()
    const normalizedSave = normalizeClickerSave(loadedSave)
    applyClickerSave(normalizedSave)
    evaluateAchievements({ announce: false, persist: false })
    clickerSaveFailed = false
    clickerLastLoadAt.value = new Date().toISOString()
    clickerSaveStatus.value = userId ? 'Save carregado da nuvem' : 'Modo sem save'
    logClickerSave('info', 'load:success', {
      path: clickerRemotePath(userId),
      hasRemoteSave: Boolean(userId && loadedSave?.updatedAt),
      remoteUpdatedAt: loadedSave?.updatedAt || null,
      save: summarizeClickerSave(normalizedSave)
    })
  } catch (error) {
    const details = remoteErrorDetails(error)
    applyClickerSave(createEmptyClickerSave())
    clickerLastError.value = `${details.code || details.name || 'erro'}: ${details.message}`
    clickerSaveStatus.value = 'Falha ao carregar save'
    logClickerSave('error', 'load:error', {
      path: clickerRemotePath(userId),
      error: details
    })
    showToast(`Nao foi possivel carregar seu progresso do clicker na nuvem. ${details.code || ''}`, 'error')
  } finally {
    clickerHydrating = false
  }
}

async function saveClickerProgress() {
  const userId = currentUser.value?.uid
  if (!userId) {
    logClickerSave('warn', 'save:skip:no-user', { path: clickerRemotePath(userId) })
    return false
  }
  if (clickerHydrating) {
    logClickerSave('warn', 'save:skip:hydrating', { path: clickerRemotePath(userId) })
    return false
  }

  const payload = buildClickerSavePayload(userId)
  clickerSaveStatus.value = 'Salvando na nuvem'
  clickerLastError.value = ''
  logClickerSave('info', 'save:start', {
    path: clickerRemotePath(userId),
    save: summarizeClickerSave(payload)
  })

  try {
    await saveClickerSave(userId, payload)
    clickerSaveFailed = false
    clickerLastSaveAt.value = payload.updatedAt
    clickerSaveStatus.value = 'Save confirmado na nuvem'
    logClickerSave('info', 'save:success', {
      path: clickerRemotePath(userId),
      updatedAt: payload.updatedAt
    })
    return true
  } catch (error) {
    const details = remoteErrorDetails(error)
    clickerLastError.value = `${details.code || details.name || 'erro'}: ${details.message}`
    clickerSaveStatus.value = 'Falha ao salvar na nuvem'
    logClickerSave('error', 'save:error', {
      path: clickerRemotePath(userId),
      error: details,
      save: summarizeClickerSave(payload)
    })
    if (!clickerSaveFailed) {
      clickerSaveFailed = true
      showToast(`Nao foi possivel salvar o progresso do clicker na nuvem. ${details.code || ''}`, 'error')
    }
    return false
  }
}

async function saveClickerProgressManually() {
  if (manualClickerSaveLoading.value) return
  manualClickerSaveLoading.value = true
  const saved = await saveClickerProgress()
  manualClickerSaveLoading.value = false
  if (!saved) return
  showToast('Save manual do clicker enviado para a nuvem.', 'success')
  playPowerUpSound()
}

function formatGameNumber(value) {
  const amount = Math.floor(Number(value) || 0)
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toLocaleString('pt-BR')
}

function coffeeThresholdForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1))

  if (normalizedLevel <= LEVEL_TOTAL_REQUIREMENTS.length) {
    return LEVEL_TOTAL_REQUIREMENTS[normalizedLevel - 1]
  }

  return Math.round(
    LEVEL_TOTAL_REQUIREMENTS.at(-1) *
    Math.pow(POST_FINAL_LEVEL_MULTIPLIER, normalizedLevel - LEVEL_TOTAL_REQUIREMENTS.length)
  )
}

function gameLevelForTotal(total) {
  const brewed = Math.max(0, Number(total) || 0)
  const finalRequirement = LEVEL_TOTAL_REQUIREMENTS.at(-1)

  if (brewed >= finalRequirement) {
    return LEVEL_TOTAL_REQUIREMENTS.length + Math.floor(
      Math.log(brewed / finalRequirement) / Math.log(POST_FINAL_LEVEL_MULTIPLIER)
    )
  }

  let level = 1
  while (brewed >= coffeeThresholdForLevel(level + 1)) level += 1

  return level
}

function achievementCurrentValue(metric) {
  if (metric.startsWith('upgrade:')) {
    return Number(findUpgrade(metric.slice('upgrade:'.length))?.owned || 0)
  }

  const values = {
    lifetimeBrewed: lifetimeBrewed.value,
    manualClicks: manualClicks.value,
    criticalClicks: criticalClicks.value,
    clickPower: clickPower.value,
    autoBrew: autoBrew.value,
    totalUpgrades: ownedUpgradeCount.value,
    skillLevels: purchasedSkillLevels.value,
    maxedSkills: allSkillsMaxed.value ? 1 : 0,
    highestGameLevel: highestGameLevel.value,
    rebirths: rebirths.value,
    coinFesEarned: coinFesEarned.value
  }
  return Math.max(0, Number(values[metric]) || 0)
}

function findUpgrade(upgradeId) {
  return clickerUpgrades.find((upgrade) => upgrade.id === upgradeId)
}

function evaluateAchievements({ announce = true, persist = true } = {}) {
  const newlyUnlocked = ACHIEVEMENT_CATALOG.filter((achievement) => (
    !unlockedAchievementIds.value.has(achievement.id) &&
    achievementCurrentValue(achievement.metric) >= achievement.target
  ))

  if (!newlyUnlocked.length) return []

  const unlockedAt = new Date().toISOString()
  const nextIds = new Set(unlockedAchievementIds.value)
  const nextDates = { ...achievementUnlockedAt.value }
  newlyUnlocked.forEach((achievement) => {
    nextIds.add(achievement.id)
    nextDates[achievement.id] = unlockedAt
  })
  unlockedAchievementIds.value = nextIds
  achievementUnlockedAt.value = nextDates

  if (announce) {
    newlyUnlocked.forEach((achievement) => {
      showToast(achievement.title, 'success', { achievement, duration: 5200 })
    })
    playPowerUpSound()
  }
  if (persist) saveClickerProgress()
  return newlyUnlocked
}

function addCoffee(amount, announceLevel = true) {
  const previousLevel = clickerLevel.value
  coffeeCoins.value += amount
  totalBrewed.value += amount
  lifetimeBrewed.value += amount
  highestGameLevel.value = Math.max(highestGameLevel.value, clickerLevel.value)
  const leveledUp = clickerLevel.value > previousLevel

  if (leveledUp) {
    sceneVariant.value += 1
    gameStatus.value = `Nível ${clickerLevel.value}! Novo cenário desbloqueado`
    if (announceLevel) playPowerUpSound()
  }

  evaluateAchievements()

  return leveledUp
}

function brewCoffee(event) {
  const critical = criticalChance.value > 0 && Math.random() < criticalChance.value
  manualClicks.value += 1
  if (critical) criticalClicks.value += 1
  const earned = clickPower.value * (critical ? 5 : 1)
  const leveledUp = addCoffee(earned)
  if (!leveledUp) gameStatus.value = critical
    ? `DOSE CRÍTICA! +${formatGameNumber(earned)}`
    : `Expresso perfeito! +${formatGameNumber(earned)}`
  const burst = {
    id: `${Date.now()}-${Math.random()}`,
    x: event.offsetX,
    y: event.offsetY,
    value: earned,
    critical
  }
  clickBursts.value.push(burst)
  window.setTimeout(() => {
    clickBursts.value = clickBursts.value.filter((item) => item.id !== burst.id)
  }, 700)
  playCoinSound()
}

function upgradeCost(upgrade) {
  return Math.max(1, Math.floor(upgrade.baseCost * Math.pow(1.68, upgrade.owned) * (1 - upgradeDiscount.value)))
}

function buyClickerUpgrade(upgrade) {
  const cost = upgradeCost(upgrade)
  if (coffeeCoins.value < cost) {
    gameStatus.value = `Faltam ${formatGameNumber(cost - coffeeCoins.value)} cafés`
    playBumpSound()
    return
  }

  coffeeCoins.value -= cost
  upgrade.owned += 1
  sceneVariant.value += 1
  gameStatus.value = `${upgrade.name} atualizado para o nível ${upgrade.owned}`
  evaluateAchievements({ persist: false })
  saveClickerProgress()
  playPowerUpSound()
}

function skillCost(skill) {
  return skill.baseCost + skill.level
}

function findSkill(skillId) {
  return skillTree.find((skill) => skill.id === skillId)
}

function isSkillUnlocked(skill) {
  if (!skill.requires) return true
  return (findSkill(skill.requires.id)?.level || 0) >= skill.requires.level
}

function buySkill(skill) {
  if (!isSkillUnlocked(skill) || skill.level >= skill.maxLevel) {
    playBumpSound()
    return
  }

  const cost = skillCost(skill)
  if (coinFes.value < cost) {
    gameStatus.value = `Você precisa de mais ${cost - coinFes.value} CoinFé`
    playBumpSound()
    return
  }

  coinFes.value -= cost
  skill.level += 1
  sceneVariant.value += 1
  gameStatus.value = `${skill.name} desbloqueada no nível ${skill.level}`
  evaluateAchievements({ persist: false })
  saveClickerProgress()
  playPowerUpSound()
}

function requestRebirth() {
  if (!canRebirth.value) {
    gameStatus.value = `Chegue ao nível ${REBIRTH_LEVEL} para renascer`
    playBumpSound()
    return
  }

  if (!rebirthConfirming.value) {
    rebirthConfirming.value = true
    gameStatus.value = 'Confirme: só o nível do game, cafés e upgrades serão reiniciados; seu perfil permanece'
    playOpenSound()
    window.setTimeout(() => { rebirthConfirming.value = false }, 5000)
    return
  }

  const reward = rebirthReward.value
  coinFes.value += reward
  coinFesEarned.value += reward
  rebirths.value += 1
  coffeeCoins.value = 0
  totalBrewed.value = 0
  clickerUpgrades.forEach((upgrade) => { upgrade.owned = 0 })
  rebirthConfirming.value = false
  sceneVariant.value += 1
  shopView.value = 'skills'
  gameStatus.value = `Renascimento ${rebirths.value} concluído! Perfil preservado e +${reward} CoinFé${reward > 1 ? 's' : ''}`
  evaluateAchievements({ persist: false })
  saveClickerProgress()
  playPowerUpSound()
}

function findCurrentMember() {
  if (!currentUser.value) return null
  const email = currentUser.value.email?.toLowerCase() || ''
  const displayName = currentUser.value.displayName?.trim().toLowerCase() || ''
  return members.value.find((member) => (
    member.createdByUid === currentUser.value.uid ||
    member.createdByEmail?.toLowerCase() === email ||
    (!member.createdByUid && !member.createdByEmail && displayName && member.name?.trim().toLowerCase() === displayName)
  )) || null
}

function memberPaymentCount(member) {
  if (!member) return 0
  const confirmed = Number(member.paymentCount || 0)
  if (confirmed > 0) return confirmed
  return member.status === 'PAID' ? 1 : 0
}

function calculateMemberLevel(member) {
  // O perfil representa a carreira permanente. A mensalidade é a fonte principal;
  // o game contribui apenas com renascimentos e marcos do melhor nível já alcançado.
  const paymentScore = memberPaymentCount(member) * 5
  const rebirthScore = rebirths.value
  const gameMilestoneScore = Math.floor(highestGameLevel.value / 10)
  return Math.max(1, paymentScore + rebirthScore + gameMilestoneScore + 1)
}

function memberLevelTitle(level) {
  return [...MEMBER_LEVEL_TITLES].reverse().find((item) => level >= item.minLevel) || MEMBER_LEVEL_TITLES[0]
}

function nextMemberLevelTitle(level) {
  return MEMBER_LEVEL_TITLES.find((item) => item.minLevel > level) || null
}

function approveMemberLevelPayment(member, existingMember = null) {
  const amount = Number(settings.monthlyFee || 0)
  const referenceMonth = String(settings.month || '').trim()
  const alreadyCountedThisMonth = Boolean(referenceMonth && existingMember?.lastProfilePaymentMonth === referenceMonth)
  member.paymentCount = Number(existingMember?.paymentCount || member.paymentCount || 0) + (alreadyCountedThisMonth ? 0 : 1)
  member.totalContributed = Number(existingMember?.totalContributed || member.totalContributed || 0) + (alreadyCountedThisMonth ? 0 : amount)
  member.lastProfilePaymentMonth = referenceMonth || null
  member.lastApprovedPaymentAt = new Date().toISOString()
}

function currentActor() {
  const protectedAdmin = Boolean(adminUser.value?.protected)
  return {
    uid: currentUser.value?.uid || null,
    email: protectedAdmin ? null : (currentUser.value?.email || null),
    name: protectedAdmin ? 'Mestre Supremo' : (currentUser.value?.displayName || currentUser.value?.email || null)
  }
}

function adminReviewIdentity() {
  if (adminUser.value?.protected) return 'Mestre Supremo'
  return adminUser.value?.email || 'Brigada do Café'
}

function withMemberAudit(member, existingMember = null) {
  const actor = currentActor()
  const now = new Date().toISOString()
  return {
    ...member,
    createdByUid: existingMember?.createdByUid || member.createdByUid || actor.uid,
    createdByEmail: adminUser.value?.protected ? null : (existingMember?.createdByEmail || member.createdByEmail || actor.email),
    createdAt: existingMember?.createdAt || member.createdAt || now,
    updatedByUid: actor.uid,
    updatedByEmail: actor.email,
    updatedAt: now
  }
}

async function auditAction(action, details = {}) {
  const actor = currentActor()
  await createAuditLog({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorName: actor.name,
    createdAt: new Date().toISOString(),
    details
  })
}

function loadLocalSettings() {
  return JSON.parse(localStorage.getItem('cafe_settings') || 'null') || DEFAULT_SETTINGS
}

function saveLocalState() {
  localStorage.setItem('cafe_settings', JSON.stringify(settings))
}

function switchTab(tabId) {
  if (activeTab.value === 'game' && tabId !== 'game') saveClickerProgress()
  activeTab.value = tabId
  playClickSound()
}

function openJoinModal() {
  if (currentUserAlreadyJoined.value) {
    showToast('Você já participa da lista deste mês.', 'info')
    playBumpSound()
    return
  }
  joinForm.dept = ''
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

async function persistMember(member, existingMember = null) {
  Object.assign(member, withMemberAudit(member, existingMember))
  saveLocalState()
  await saveMember(member)
}

async function requestPaymentApproval(member) {
  const actor = currentActor()
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
    reviewedBy: null,
    requestedByUid: actor.uid,
    requestedByEmail: actor.email,
    requestedByName: actor.name
  }

  await createPaymentRequest(request)
  await auditAction('PAYMENT_REQUEST_CREATED', {
    requestId: request.id,
    memberId: member.id,
    memberName: member.name,
    amount: request.amount,
    month: request.month
  })
}

async function handleUserPayment() {
  if (!requireSignedIn()) return
  const name = signedInUserName.value
  const dept = userPayment.dept.trim() || 'Geral'
  if (!name) return

  let member = currentMember.value
  const existingMember = member ? { ...member } : null
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
    member = { id: currentUser.value.uid, name, dept, status: 'PENDING', paidAt: null }
    members.value.push(member)
  }

  await persistMember(member, existingMember)
  await requestPaymentApproval(member)
  showToast(`Pedido enviado para a brigada do café. Agora é perícia do Pix!`, 'success')
  playMailSound()
  userPayment.dept = ''
}

async function markAsPaidFromList(id) {
  if (!requireSignedIn()) return
  const member = members.value.find((item) => item.id === id)
  if (!member) return
  if (!isCurrentUserMember(member)) {
    showToast('Você só pode enviar o seu próprio pagamento para conferência.', 'error')
    playErrorSound()
    return
  }
  const existingMember = { ...member }
  if (member.status === 'PENDING') {
    showToast(`${member.name} já está aguardando carimbo da brigada.`, 'info')
    playBumpSound()
    return
  }
  member.status = 'PENDING'
  member.paidAt = null
  await persistMember(member, existingMember)
  await requestPaymentApproval(member)
  showToast(`${member.name} entrou na fila de conferência do Pix.`, 'success')
  playMailSound()
}

async function removeMember(id) {
  if (!requireSignedIn()) return
  const member = members.value.find((item) => item.id === id)
  if (!canRemoveMember(member)) {
    showToast(removeMemberBlockedReason(member), 'error')
    playErrorSound()
    return
  }
  if (adminUnlocked.value) await closePendingPaymentRequestsForMember(member)
  members.value = members.value.filter((item) => item.id !== id)
  saveLocalState()
  await auditAction('MEMBER_REMOVED', {
    memberId: id,
    memberName: member?.name || null,
    memberDept: member?.dept || null
  })
  await deleteFirestoreMember(id)
  if (member) showToast(`Colega ${member.name} saiu da vaquinha deste mês.`, 'info')
  playRemoveSound()
}

async function closePendingPaymentRequestsForMember(member) {
  if (!member) return
  const pendingRequests = paymentRequests.value.filter((request) => (
    request.memberId === member.id && request.status === 'PENDING'
  ))
  if (!pendingRequests.length) return

  const reviewedAt = new Date().toISOString()
  const reviewedBy = adminReviewIdentity()
  await Promise.all(pendingRequests.map((request) => updatePaymentRequest(request.id, {
    ...request,
    status: 'REJECTED',
    reviewedAt,
    reviewedBy
  })))
  const closedIds = new Set(pendingRequests.map((request) => request.id))
  paymentRequests.value = paymentRequests.value.map((request) => (
    closedIds.has(request.id) ? { ...request, status: 'REJECTED', reviewedAt, reviewedBy } : request
  ))
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
  if (code.includes('auth/unauthorized-domain')) return 'Este domínio ainda não foi autorizado para o login Google.'
  if (code.includes('auth/operation-not-allowed')) return 'O login Google ainda não está habilitado.'
  if (code.includes('auth/too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  return 'Não foi possível entrar com o Google. Tente novamente.'
}

function adminFunctionError(error) {
  const message = String(error?.message || '')
    .replace(/^FirebaseError:\s*/i, '')
    .replace(/^internal\s*/i, '')
    .trim()
  return message || 'Não foi possível concluir a operação administrativa.'
}

async function resolveAdminProfile(user) {
  if (!user) return null
  adminManagementError.value = ''
  try {
    const profile = await loadMyAdminProfile(user)
    if (!profile) return null
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: profile.role,
      protected: Boolean(profile.protected)
    }
  } catch (error) {
    console.error('[PassCafe Admin]', error)
    adminManagementError.value = adminFunctionError(error)
    return null
  }
}

function startAdminPaymentWatcher() {
  unwatchPaymentRequests()
  paymentRequestsReady = false
  unwatchPaymentRequests = watchPaymentRequests((requests) => {
    const previousPending = pendingPaymentRequests.value.length
    paymentRequests.value = requests
    const nextPending = selectPendingPaymentRequests(requests).length
    if (paymentRequestsReady && nextPending > previousPending) {
      showToast('Notificação da brigada: tem Pix novo pedindo carimbo.', 'info')
      playMailSound()
    }
    paymentRequestsReady = true
  })
}

function startMyAdminProfileWatcher(user) {
  unwatchMyAdminProfile()
  unwatchMyAdminProfile = watchMyAdminProfile(user.uid, (profile) => {
    if (!profile) {
      adminUser.value = null
      paymentRequests.value = []
      unwatchPaymentRequests()
      if (activeTab.value === 'admin') activeTab.value = 'pay'
      showToast('Seu acesso administrativo foi removido.', 'info')
      return
    }
    if (!adminUser.value) return
    const previousRole = adminUser.value.role
    adminUser.value = {
      ...adminUser.value,
      role: profile.role,
      protected: Boolean(profile.protected)
    }
    if (profile.role === 'MASTER' && previousRole !== 'MASTER') refreshAdminManagement(false)
  })
}

async function signInToApp() {
  if (!hasFirebaseConfig) {
    showToast('Acesso remoto ainda não configurado. Login Google indisponível.', 'error')
    playErrorSound()
    return
  }

  try {
    authLoading.value = true
    authError.value = ''
    const credential = await signInWithGoogle()
    userPhotoFailed.value = false
    currentUser.value = credential.user
    await hydrateClickerUser(credential.user)
    adminUser.value = await resolveAdminProfile(credential.user)
    if (adminUser.value) {
      showToast(`Entrada liberada. Cargo reconhecido: ${roleLabel(adminUser.value.role)}.`, 'success')
      playAdminUnlockSound()
      if (adminUser.value.role === 'MASTER') await refreshAdminManagement(false)
    } else {
      showToast('Entrada liberada com Google.', 'success')
      playPowerUpSound()
    }
  } catch (error) {
    authError.value = authErrorMessage(error)
    showToast(authError.value, 'error')
    playErrorSound()
  } finally {
    authLoading.value = false
  }
}

async function unlockAdmin() {
  await signInToApp()
}

async function lockAdmin() {
  await saveClickerProgress()
  await signOutUser()
  currentUser.value = null
  await hydrateClickerUser(null)
  adminUser.value = null
  managedAdmins.value = []
  pendingAdminInvites.value = []
  myAdminInvites.value = []
  adminRemovalTarget.value = null
  paymentRequests.value = []
  unwatchPaymentRequests()
  unwatchMyAdminInvites()
  showToast('Sessão encerrada.', 'info')
  playLockSound()
}

function roleLabel(role) {
  return role === 'MASTER' ? 'Mestre do Café' : 'Aprendiz do Café'
}

async function refreshAdminManagement(announce = true) {
  if (adminUser.value?.role !== 'MASTER' || adminManagementLoading.value) return
  adminManagementLoading.value = true
  adminManagementError.value = ''
  try {
    const result = await loadRemoteAdminManagement()
    managedAdmins.value = (result?.admins || []).map((admin) => ({
      ...admin,
      isSelf: admin.uid === adminUser.value?.uid
    }))
    pendingAdminInvites.value = result?.invites || []
    if (announce) showToast('Cargos administrativos atualizados.', 'info')
  } catch (error) {
    adminManagementError.value = adminFunctionError(error)
    if (announce) showToast(adminManagementError.value, 'error')
  } finally {
    adminManagementLoading.value = false
  }
}

async function submitAdminInvite() {
  if (!isCoffeeMaster.value || adminManagementLoading.value) return
  const email = adminInviteForm.email.trim().toLowerCase()
  if (!email) return
  adminManagementLoading.value = true
  adminManagementError.value = ''
  try {
    await createAdminInvite(email, adminInviteForm.role, adminUser.value.uid)
    adminInviteForm.email = ''
    showToast(`Convite registrado para ${email}. O acesso será ativado no primeiro login Google.`, 'success')
    adminManagementLoading.value = false
    await refreshAdminManagement(false)
  } catch (error) {
    adminManagementError.value = adminFunctionError(error)
    showToast(adminManagementError.value, 'error')
  } finally {
    adminManagementLoading.value = false
  }
}

async function updateManagedAdminRole(admin, role) {
  if (!isCoffeeMaster.value || admin.isSelf || role === admin.role) return
  adminManagementLoading.value = true
  adminManagementError.value = ''
  try {
    await changeRemoteAdminRole(admin.uid, role, adminUser.value.uid)
    admin.role = role
    showToast(`Cargo de ${admin.email} alterado para ${roleLabel(role)}.`, 'success')
  } catch (error) {
    adminManagementError.value = adminFunctionError(error)
    showToast(adminManagementError.value, 'error')
  } finally {
    adminManagementLoading.value = false
  }
}

function requestManagedAccessRemoval(type, entry) {
  if (!isCoffeeMaster.value || entry.isSelf || adminManagementLoading.value) return
  adminRemovalTarget.value = { type, entry }
}

function closeAdminRemovalModal() {
  if (!adminManagementLoading.value) adminRemovalTarget.value = null
}

async function confirmManagedAccessRemoval() {
  const target = adminRemovalTarget.value
  if (!target || adminManagementLoading.value) return
  const { type, entry } = target
  adminManagementLoading.value = true
  adminManagementError.value = ''
  try {
    await removeRemoteAdminAccess(type, type === 'invite' ? entry.id : entry.uid)
    showToast(type === 'invite' ? 'Convite cancelado.' : 'Acesso administrativo removido.', 'success')
    adminRemovalTarget.value = null
    adminManagementLoading.value = false
    await refreshAdminManagement(false)
  } catch (error) {
    adminManagementError.value = adminFunctionError(error)
    showToast(adminManagementError.value, 'error')
  } finally {
    adminManagementLoading.value = false
  }
}

async function answerMyAdminInvite(invite, accepted) {
  if (!currentUser.value || adminInviteAnswering.value) return
  adminInviteAnswering.value = true
  adminManagementError.value = ''
  try {
    if (accepted) {
      const profile = await acceptAdminInvite(invite, currentUser.value)
      adminUser.value = {
        uid: currentUser.value.uid,
        email: currentUser.value.email,
        displayName: currentUser.value.displayName,
        photoURL: currentUser.value.photoURL,
        role: profile.role,
        protected: false
      }
      myAdminInvites.value = myAdminInvites.value.filter((item) => item.id !== invite.id)
      unwatchMyAdminInvites()
      startMyAdminProfileWatcher(currentUser.value)
      startAdminPaymentWatcher()
      if (profile.role === 'MASTER') await refreshAdminManagement(false)
      showToast(`Convite aceito! Você agora é ${roleLabel(profile.role)}.`, 'success')
      playAdminUnlockSound()
    } else {
      await declineAdminInvite(invite.id, currentUser.value.uid)
      myAdminInvites.value = myAdminInvites.value.filter((item) => item.id !== invite.id)
      showToast('Convite administrativo recusado.', 'info')
      playLockSound()
    }
  } catch (error) {
    adminManagementError.value = adminFunctionError(error)
    showToast(adminManagementError.value, 'error')
    playErrorSound()
  } finally {
    adminInviteAnswering.value = false
  }
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

function isMemberOwner(member) {
  return Boolean(currentUser.value?.uid && member?.createdByUid === currentUser.value.uid)
}

function isCurrentUserMember(member) {
  return Boolean(member?.id && currentMember.value?.id === member.id)
}

function canRemoveMember(member) {
  if (!member || !isSignedIn.value) return false
  if (isCoffeeMaster.value) return true
  return isMemberOwner(member) && member.status !== 'PAID'
}

function removeMemberBlockedReason(member) {
  if (!isSignedIn.value) return 'Entre com Google para sair da vaquinha'
  if (member?.status === 'PAID' && isMemberOwner(member)) return 'Pagamento confirmado: saida liberada apenas no proximo mes'
  return 'Apenas quem entrou na lista ou o Mestre do Cafe pode remover'
}

async function refreshPaymentRequests() {
  paymentRequests.value = await loadPaymentRequests()
  showToast('Fila de Pix auditada novamente. O coador foi sacudido.', 'info')
  playClickSound()
}

async function approvePaymentRequest(request) {
  const existingMember = members.value.find((item) => item.id === request.memberId)
  const member = existingMember || {
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
  approveMemberLevelPayment(member, existingMember)
  if (wasNewMember) members.value.push(member)

  await persistMember(member, existingMember ? { ...existingMember } : null)
  await updatePaymentRequest(request.id, {
    ...request,
    status: 'APPROVED',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminReviewIdentity()
  })
  paymentRequests.value = paymentRequests.value.map((item) => (
    item.id === request.id
      ? { ...item, status: 'APPROVED', reviewedAt: new Date().toISOString(), reviewedBy: adminReviewIdentity() }
      : item
  ))
  await auditAction('PAYMENT_REQUEST_APPROVED', {
    requestId: request.id,
    memberId: request.memberId,
    memberName: request.name
  })
  showToast(`${request.name} aprovado. Café liberado sem recurso ao RH.`, 'success')
  playSuccessSound()
}

async function rejectPaymentRequest(request) {
  const member = members.value.find((item) => item.id === request.memberId)
  if (member && member.status === 'PENDING') {
    const existingMember = { ...member }
    member.status = 'UNPAID'
    member.paidAt = null
    await persistMember(member, existingMember)
  }

  await updatePaymentRequest(request.id, {
    ...request,
    status: 'REJECTED',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminReviewIdentity()
  })
  paymentRequests.value = paymentRequests.value.map((item) => (
    item.id === request.id
      ? { ...item, status: 'REJECTED', reviewedAt: new Date().toISOString(), reviewedBy: adminReviewIdentity() }
      : item
  ))
  await auditAction('PAYMENT_REQUEST_REJECTED', {
    requestId: request.id,
    memberId: request.memberId,
    memberName: request.name
  })
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
  await auditAction('SETTINGS_UPDATED', { settings: { ...settings } })
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
  await auditAction('MEMBER_ADDED_BY_ADMIN', {
    memberId: member.id,
    memberName: member.name,
    memberDept: member.dept
  })
  adminNewMember.name = ''
  adminNewMember.dept = ''
  showToast(`${name} entrou na lista do café.`, 'success')
  playJoinSound()
}

async function handleJoinSubmit() {
  if (!requireSignedIn()) return
  const name = signedInUserName.value
  if (!name) return
  if (currentUserAlreadyJoined.value) {
    showToast('Você já participa da vaquinha deste mês!', 'info')
    joinModalOpen.value = false
    playBumpSound()
    return
  }
  const member = { id: currentUser.value.uid, name, dept: joinForm.dept.trim() || 'Geral', status: 'UNPAID', paidAt: null }
  members.value.push(member)
  await persistMember(member)
  await auditAction('MEMBER_JOINED', {
    memberId: member.id,
    memberName: member.name,
    memberDept: member.dept
  })
  joinForm.dept = ''
  joinModalOpen.value = false
  showToast('Entrada confirmada. Agora só falta pagar o café!', 'success')
  playJoinSound()
}

async function resetMonthlyPayments() {
  if (!requireAdmin()) return
  members.value = members.value.map((member) => {
    const migratedPaymentCount = member.status === 'PAID' && Number(member.paymentCount || 0) === 0
      ? 1
      : Number(member.paymentCount || 0)
    const migratedContribution = member.status === 'PAID' && Number(member.totalContributed || 0) === 0
      ? Number(settings.monthlyFee || 0)
      : Number(member.totalContributed || 0)
    return withMemberAudit({
      ...member,
      status: 'UNPAID',
      paidAt: null,
      paymentCount: migratedPaymentCount,
      totalContributed: migratedContribution,
      lastProfilePaymentMonth: member.lastProfilePaymentMonth || (member.status === 'PAID' ? settings.month : null)
    }, member)
  })
  saveLocalState()
  await saveMembers(members.value)
  await auditAction('MONTHLY_PAYMENTS_RESET', { memberCount: members.value.length })
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

let toastSequence = 0

function showToast(message, type = 'info', options = {}) {
  const id = `${Date.now()}-${toastSequence += 1}`
  const { achievement = null, duration = 3200 } = options
  toasts.value.push({ id, message, type, achievement })
  setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }, duration)
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
    <div class="toast-stack fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="app-toast comic-border shadow-comic rounded-xl px-4 py-3 text-sm font-bold bg-foam"
        :class="[{ 'achievement-toast': toast.achievement }, { 'text-emerald-700': toast.type === 'success', 'text-red-700': toast.type === 'error', 'text-mocha': toast.type === 'info' }]"
      >
        <img
          v-if="toast.achievement"
          :src="toast.achievement.image"
          :alt="`Arte da conquista ${toast.achievement.title}`"
          class="achievement-toast-image"
        >
        <span class="toast-copy">
          <span v-if="toast.achievement" class="achievement-toast-label">CONQUISTA DESBLOQUEADA</span>
          <strong>{{ toast.message }}</strong>
          <small v-if="toast.achievement">{{ toast.achievement.phrase }}</small>
        </span>
      </div>
    </div>

    <main
      v-if="!authReady || !isSignedIn"
      class="clicker-login"
      :class="[worldClass, `scene-variant-${sceneVariant % 4}`]"
    >
      <div class="pixel-world" aria-hidden="true">
        <div class="pixel-sun"></div>
        <div class="pixel-cloud cloud-one"></div>
        <div class="pixel-cloud cloud-two"></div>
        <div class="pixel-stars"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="pixel-city city-back"></div>
        <div class="pixel-city city-front"></div>
        <div class="pixel-street"></div>
        <div v-if="ownedUpgradeCount" class="delivery-scooter"></div>
      </div>

      <header class="clicker-topbar">
        <div class="clicker-brand-mark">
          <Icon icon="pixelarticons:coffee" />
          <span>CAFÉ PASS</span>
        </div>
        <div class="clicker-meta">
          <div class="coinfe-chip" title="Moeda permanente adquirida ao renascer">
            <Icon icon="pixelarticons:coin" />
            <strong>{{ formatGameNumber(coinFes) }}</strong> <span>COINFÉS</span>
          </div>
          <div class="world-chip">
            <span class="world-live-dot"></span>
            {{ currentWorld.label }} · GAME NV. {{ clickerLevel }}
          </div>
        </div>
      </header>

      <div class="clicker-layout">
        <section class="access-panel">
          <div class="access-eyebrow">CAFETERIA DA FIRMA</div>
          <h1>CAFÉ<br><span>PASS</span></h1>
          <p class="login-satire">{{ loginSatirePhrase }}</p>

          <div class="guest-save-notice">
            <Icon icon="pixelarticons:save" />
            <p><strong>MODO DEMONSTRAÇÃO</strong><span>A pontuação desta tela não será salva. Entre com Google para manter seu progresso.</span></p>
          </div>

          <div class="access-divider"><span>CONTINUAR</span></div>

          <button type="button" class="google-login-btn" :disabled="!authReady || authLoading || !hasFirebaseConfig" @click="signInToApp">
            <svg class="google-g" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.02 1.53 7.4 2.81l5.4-5.27C33.49 3.95 29.17 2 24 2 14.62 2 6.51 7.38 2.56 15.22l6.63 5.15C10.77 15.68 16.03 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.63-.15-3.2-.42-4.7H24v8.9h12.62c-.54 2.9-2.18 5.36-4.66 7.01l7.21 5.59c4.22-3.89 7.33-9.62 7.33-16.8z" />
              <path fill="#FBBC05" d="M9.19 28.37A14.44 14.44 0 0 1 8.43 24c0-1.52.27-2.99.76-4.37l-6.63-5.15A21.94 21.94 0 0 0 .25 24c0 3.5.84 6.81 2.31 9.52l6.63-5.15z" />
              <path fill="#34A853" d="M24 46c6.05 0 11.13-1.99 14.84-5.42l-7.21-5.59c-2 1.34-4.56 2.13-7.63 2.13-5.84 0-10.79-3.94-12.56-9.25l-6.63 5.15C8.73 40.86 16.84 46 24 46z" />
            </svg>
            <span>{{ authLoading ? 'Conectando...' : 'Entrar com Google' }}</span>
            <Icon icon="pixelarticons:chevron-right" class="google-arrow" />
          </button>
          <p v-if="authError" class="access-error">{{ authError }}</p>
          <p v-else-if="!hasFirebaseConfig" class="access-error">Configure o acesso remoto para liberar o login Google.</p>
          <p v-else-if="!authReady" class="access-loading">Verificando sessão...</p>
        </section>

        <CafeClickerGame
          :auto-brew="autoBrew"
          :can-rebirth="canRebirth"
          :click-bursts="clickBursts"
          :clicker-level="clickerLevel"
          :clicker-upgrades="clickerUpgrades"
          :click-power="clickPower"
          :coffee-coins="coffeeCoins"
          :coin-fes="coinFes"
          :current-world="currentWorld"
          :game-status="gameStatus"
          :is-skill-unlocked="isSkillUnlocked"
          :level-progress="levelProgress"
          :level-target="levelTarget"
          :rebirth-billion-bonus="rebirthBillionBonus"
          :rebirth-billions="rebirthBillions"
          :rebirth-confirming="rebirthConfirming"
          :rebirth-level="REBIRTH_LEVEL"
          :rebirth-next-billion-target="rebirthNextBillionTarget"
          :rebirth-progress="rebirthProgress"
          :rebirth-reward="rebirthReward"
          :rebirths="rebirths"
          :shop-view="shopView"
          :skill-cost="skillCost"
          :skill-tree="skillTree"
          :total-brewed="totalBrewed"
          :upgrade-cost="upgradeCost"
          @brew="brewCoffee"
          @buy-upgrade="buyClickerUpgrade"
          @buy-skill="buySkill"
          @rebirth="requestRebirth"
          @update-shop-view="shopView = $event"
        />
      </div>

      <div class="scene-flash" :key="sceneVariant" aria-hidden="true"></div>
    </main>

    <header v-if="authReady && isSignedIn" class="app-header bg-mocha text-crema comic-border-lg border-b-8 border-espresso shadow-comic-lg sticky top-0 z-40">
      <div class="app-header-shell">
        <div class="app-header-main">
          <div class="app-header-brand" @click="switchTab('pay')">
            <div class="app-header-logo">
              <span class="steam-line">~</span>
              <span class="steam-line steam-2">~</span>
              <span class="steam-line steam-3">~</span>
              <Icon icon="pixelarticons:coffee" />
            </div>
            <div>
              <h1>CAFÉ PASS <span>v1.2</span></h1>
              <p>"A lei do cafezinho da firma é clara: pagou, tomou!"</p>
            </div>
          </div>

          <div class="user-account-badge" :class="[{ 'is-master': isCoffeeMaster }, `rank-${currentMemberTitle.effectClass}`]">
            <span class="profile-external-border" aria-hidden="true"></span>
            <div class="user-avatar" :class="[{ 'is-master': isCoffeeMaster }, `rank-${currentMemberTitle.effectClass}`]">
              <img
                v-if="currentUser.photoURL && !userPhotoFailed"
                :src="currentUser.photoURL"
                :alt="`Foto de ${currentUser.displayName || 'usuário'}`"
                referrerpolicy="no-referrer"
                @error="userPhotoFailed = true"
              >
              <Icon v-else icon="pixelarticons:user" />
              <span v-if="isCoffeeMaster" class="avatar-crown"><Icon icon="pixelarticons:crown" /></span>
            </div>
            <div class="user-account-copy">
              <span class="user-role-label">
                <Icon :icon="isCoffeeMaster ? 'pixelarticons:crown' : 'pixelarticons:coffee'" />
                {{ isCoffeeMaster ? 'MESTRE DO CAFÉ' : 'MEMBRO CAFEINADO' }}
              </span>
              <div class="user-account-name">
                <strong>{{ currentUser.displayName || currentUser.email }}</strong>
                <span
                  class="account-level-inline"
                  :class="`rank-${currentMemberTitle.effectClass}`"
                  :title="`Nível de perfil permanente: ${currentMemberPaymentCount} mensalidade(s) × 5, ${rebirths} renascimento(s) × 1 e marcos do melhor nível do game`"
                >PERFIL LV {{ currentMemberLevel }}</span>
                <span
                  class="account-title-hover"
                  :class="[`is-${currentMemberTitle.className}`, `rank-${currentMemberTitle.effectClass}`]"
                  :data-tooltip="`${currentMemberTitle.title} | Raridade: ${currentMemberTitle.rarity}`"
                  :aria-label="`${currentMemberTitle.title} | Raridade: ${currentMemberTitle.rarity}`"
                >
                  <span class="account-title-text">{{ currentMemberTitle.title }}</span>
                </span>
              </div>
              <div class="account-quick-actions">
                <button v-if="adminUnlocked" type="button" class="account-admin-link" @click="switchTab('admin')">
                  <Icon icon="pixelarticons:shield" /> PAINEL DO CAFÉ
                </button>
                <button
                  type="button"
                  class="account-game-link"
                  :class="{ active: activeTab === 'game' }"
                  title="Café Clicker"
                  aria-label="Abrir Café Clicker"
                  @click="switchTab('game')"
                >
                  <Icon icon="pixelarticons:gamepad" />
                </button>
                <button
                  type="button"
                  class="account-achievements-link"
                  :class="{ active: activeTab === 'achievements' }"
                  :title="`Conquistas (${unlockedAchievementCount}/${ACHIEVEMENT_CATALOG.length})`"
                  aria-label="Abrir conquistas"
                  @click="switchTab('achievements')"
                >
                  <Icon icon="pixelarticons:trophy" />
                </button>
                <button type="button" class="account-logout" title="Sair da conta" aria-label="Sair da conta" @click="lockAdmin">
                  <Icon icon="pixelarticons:logout" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav class="app-header-nav no-scrollbar">
          <button v-for="tab in [
            ['pay', 'pixelarticons:wallet', 'Pagar Cota'],
            ['list', 'pixelarticons:users', 'Lista dos Cafeinados'],
            ['receipts', 'pixelarticons:receipt', 'Segundas Vias']
          ]" :key="tab[0]" @click="switchTab(tab[0])" class="nav-btn font-bold px-4 py-2 rounded-xl comic-border shadow-comic hover:shadow-comic-hover transition-all flex items-center gap-2 text-sm whitespace-nowrap" :class="activeTab === tab[0] ? 'bg-caramel text-espresso' : tab[0] === 'admin' ? 'bg-roast text-latte' : 'bg-crema text-espresso'" :aria-label="tab[2]" :title="tab[2]">
            <span class="nav-icon"><Icon :icon="tab[1]" /></span><span class="nav-label">{{ tab[2] }}</span>
          </button>
        </nav>
      </div>
    </header>

    <div v-if="authReady && isSignedIn" class="app-banner bg-caramel comic-border-lg border-t-0 border-x-0 py-1.5 px-4 text-center font-bold text-xs sm:text-sm text-espresso overflow-hidden shadow-sm">
      <span class="inline-flex items-center justify-center gap-2"><Icon icon="pixelarticons:warning-box" class="text-lg" /> {{ funnyBanner }}</span>
    </div>

    <div v-if="myAdminInvites.length" class="fixed inset-0 z-50 bg-espresso/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-crema p-6 sm:p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-lg w-full text-center space-y-5">
        <div class="w-20 h-20 mx-auto bg-caramel text-espresso rounded-2xl comic-border shadow-comic grid place-items-center text-4xl">
          <Icon icon="pixelarticons:mail-check" />
        </div>
        <div>
          <span class="text-[10px] font-black text-caramel uppercase font-mono">Convite da Brigada</span>
          <h2 class="text-2xl font-black text-espresso mt-1">Você foi convidado!</h2>
          <p class="text-sm text-mocha font-medium mt-2">Um Mestre do Café convidou sua conta Google para assumir o cargo de <strong class="text-espresso">{{ roleLabel(myAdminInvites[0].role) }}</strong>.</p>
        </div>
        <div class="bg-foam p-3 rounded-xl comic-border text-xs text-mocha font-mono break-all">{{ currentUser.email }}</div>
        <div class="grid grid-cols-2 gap-3">
          <CafeButton variant="chili" size="md" block icon="pixelarticons:close" :disabled="adminInviteAnswering" @click="answerMyAdminInvite(myAdminInvites[0], false)">RECUSAR</CafeButton>
          <CafeButton variant="mint" size="md" block icon="pixelarticons:check" :disabled="adminInviteAnswering" @click="answerMyAdminInvite(myAdminInvites[0], true)">{{ adminInviteAnswering ? 'PROCESSANDO' : 'ACEITAR' }}</CafeButton>
        </div>
        <p class="text-[10px] text-mocha/70">O acesso só será ativado se você aceitar. Nenhuma senha é compartilhada.</p>
      </div>
    </div>

    <main
      v-if="authReady && isSignedIn"
      class="app-main flex-1 w-full"
      :class="activeTab === 'game' ? 'game-main' : 'mx-auto max-w-5xl px-4 py-6'"
    >
      <div v-if="loading" class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl text-center font-black">Carregando café...</div>

      <section
        v-show="!loading && activeTab === 'game'"
        class="clicker-login signed-game-view"
        :class="[worldClass, `scene-variant-${sceneVariant % 4}`]"
      >
        <div class="pixel-world" aria-hidden="true">
          <div class="pixel-sun"></div>
          <div class="pixel-cloud cloud-one"></div>
          <div class="pixel-cloud cloud-two"></div>
          <div class="pixel-stars"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="pixel-city city-back"></div>
          <div class="pixel-city city-front"></div>
          <div class="pixel-street"></div>
          <div v-if="ownedUpgradeCount" class="delivery-scooter"></div>
        </div>

        <div class="signed-game-toolbar">
          <div class="signed-save-status">
            <Icon icon="pixelarticons:save" />
            <span>
              <strong>{{ clickerSaveStatus }}</strong>
              <em>Auto a cada 30 min · ultimo save: {{ formatClickerSaveTime(clickerLastSaveAt) }}</em>
              <small v-if="clickerLastError">{{ clickerLastError }}</small>
            </span>
          </div>
          <div class="signed-game-actions">
            <span class="coinfe-chip"><Icon icon="pixelarticons:coin" /><strong>{{ formatGameNumber(coinFes) }}</strong><span>COINFÉS</span></span>
            <span class="world-chip"><span class="world-live-dot"></span>{{ currentWorld.label }} · GAME NV. {{ clickerLevel }}</span>
            <button type="button" class="manual-save-button" :disabled="manualClickerSaveLoading" @click="saveClickerProgressManually">
              <Icon :icon="manualClickerSaveLoading ? 'pixelarticons:loader' : 'pixelarticons:save'" /> {{ manualClickerSaveLoading ? 'SALVANDO' : 'SALVAR' }}
            </button>
            <button type="button" class="back-to-pix-button" @click="switchTab('pay')">
              <Icon icon="pixelarticons:wallet" /> VOLTAR AO PIX
            </button>
          </div>
        </div>

        <div class="signed-clicker-shell">
          <CafeClickerGame
            :auto-brew="autoBrew"
            :can-rebirth="canRebirth"
            :click-bursts="clickBursts"
            :clicker-level="clickerLevel"
            :clicker-upgrades="clickerUpgrades"
            :click-power="clickPower"
            :coffee-coins="coffeeCoins"
            :coin-fes="coinFes"
            :current-world="currentWorld"
            :game-status="gameStatus"
            :is-skill-unlocked="isSkillUnlocked"
            :level-progress="levelProgress"
            :level-target="levelTarget"
            :rebirth-billion-bonus="rebirthBillionBonus"
            :rebirth-billions="rebirthBillions"
            :rebirth-confirming="rebirthConfirming"
            :rebirth-level="REBIRTH_LEVEL"
            :rebirth-next-billion-target="rebirthNextBillionTarget"
            :rebirth-progress="rebirthProgress"
            :rebirth-reward="rebirthReward"
            :rebirths="rebirths"
            :shop-view="shopView"
            :skill-cost="skillCost"
            :skill-tree="skillTree"
            :total-brewed="totalBrewed"
            :upgrade-cost="upgradeCost"
            @brew="brewCoffee"
            @buy-upgrade="buyClickerUpgrade"
            @buy-skill="buySkill"
            @rebirth="requestRebirth"
            @update-shop-view="shopView = $event"
          />
        </div>
        <div class="scene-flash" :key="sceneVariant" aria-hidden="true"></div>
      </section>

      <AchievementGallery
        v-show="!loading && activeTab === 'achievements'"
        :achievements="achievements"
        :unlocked-count="unlockedAchievementCount"
      />

      <section v-show="!loading && activeTab === 'pay'" class="tab-content space-y-6">
        <div class="pay-card bg-crema rounded-3xl p-6 sm:p-8 comic-border-lg shadow-comic-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 text-mocha/10 text-9xl pointer-events-none select-none">
            <Icon icon="pixelarticons:coffee-alt" />
          </div>

          <div class="pix-card md:col-span-5 bg-foam p-5 rounded-2xl comic-border shadow-comic text-center flex flex-col items-center">
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
            <div class="monthly-fee mt-4 bg-roast text-foam px-4 py-2 rounded-xl comic-border w-full flex items-center justify-between">
              <span class="text-xs font-bold text-latte">Cota Mensal:</span>
              <span class="text-2xl font-black text-caramel font-mono">{{ formatMoney(settings.monthlyFee) }}</span>
            </div>
            <div class="mt-3 w-full">
              <p class="text-xs font-bold text-mocha text-left mb-1">Chave cadastrada (<span>{{ settings.pixType }}</span>):</p>
              <div class="pix-key-row flex items-center gap-1">
                <input type="text" readonly :value="settings.pixKey" class="w-full bg-latte/50 text-espresso text-xs font-mono font-bold p-2.5 rounded-lg comic-border focus:outline-none select-all">
                <button @click="copyPixKey" title="Copiar Chave Pix" class="bg-caramel hover:bg-amber-600 text-espresso p-2.5 rounded-lg comic-border shadow-comic hover:shadow-comic-hover active:translate-x-0.5 active:translate-y-0.5 transition-all">
                  <Icon icon="pixelarticons:copy" class="text-lg" />
                </button>
              </div>
              <p class="text-[10px] text-mocha/80 text-left mt-1 font-medium">Titular: <span class="font-bold">{{ settings.pixOwner }}</span></p>
            </div>
          </div>

          <div class="payment-panel md:col-span-7 flex flex-col justify-between h-full">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="bg-chili text-foam text-xs px-2 py-0.5 rounded-md comic-border font-bold uppercase tracking-wider">Sem Fila & Sem Senha</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-black text-espresso mb-2">Já fez a transferência?</h2>
              <p class="text-sm text-mocha font-medium mb-6">
                Seu nome é identificado pelo login Google. Informe apenas o setor para registrar o pagamento e liberar sua <strong>Licença de Cafeína MENSAL</strong>!
              </p>
              <form @submit.prevent="handleUserPayment" class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-espresso uppercase mb-1">Seu Nome (Login Google)</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-mocha/60"><Icon icon="pixelarticons:user" class="text-lg" /></span>
                    <input :value="signedInUserName" type="text" disabled class="w-full bg-latte/50 text-mocha font-bold pl-10 pr-4 py-3 rounded-xl comic-border cursor-not-allowed opacity-80">
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

        <div class="pay-rules grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div class="member-list-card bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
          <div class="member-toolbar flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-2xl font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:checklist" class="text-caramel text-3xl" /> Lista Oficial dos Cafeinados</h2>
              <p class="text-xs text-mocha font-medium">Mês de <span class="font-bold">{{ settings.month }}</span> • Todo mês a lista se renova!</p>
            </div>
            <div class="member-filters flex flex-wrap items-center gap-2">
              <div class="relative flex-1 sm:w-64">
                <input v-model="searchMember" type="text" placeholder="Buscar colega..." class="w-full bg-foam text-xs font-bold pl-8 pr-3 py-2 rounded-xl comic-border focus:outline-none">
                <Icon icon="pixelarticons:search" class="absolute left-2.5 top-2.5 text-sm text-mocha/50" />
              </div>
              <CafeSelect v-model="filterStatus" :options="statusOptions" class="sm:w-56" />
              <CafeButton variant="caramel" size="sm" icon="pixelarticons:plus" :disabled="currentUserAlreadyJoined" @click="openJoinModal">
                {{ currentUserAlreadyJoined ? 'Você já participa' : 'Entrar Este Mês' }}
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
                      <button v-else-if="isCurrentUserMember(member)" @click="markAsPaidFromList(member.id)" title="Enviar meu pagamento para conferência" class="bg-mint hover:bg-emerald-600 text-foam text-xs font-bold p-1.5 px-2.5 rounded-lg comic-border shadow-comic inline-flex items-center gap-1"><Icon icon="pixelarticons:check" /> Já paguei</button>
                      <button v-if="canRemoveMember(member)" @click="removeMember(member.id)" title="Sair da vaquinha neste mês" class="bg-roast hover:bg-espresso text-latte text-xs font-bold p-1.5 px-2 rounded-lg comic-border shadow-comic"><Icon icon="pixelarticons:user-minus" /></button>
                      <button v-else type="button" disabled :title="removeMemberBlockedReason(member)" class="bg-mocha/20 text-mocha/60 text-xs font-bold p-1.5 px-2 rounded-lg comic-border cursor-not-allowed"><Icon icon="pixelarticons:lock" /></button>
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
        <div class="receipts-card bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
          <div class="mb-6">
            <h2 class="text-2xl font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:card-id" class="text-caramel text-3xl" /> Emissor & Consultor de Licença de Cafeína</h2>
            <p class="text-xs text-mocha font-medium">Esfregue na cara de quem duvidar que você contribuiu para o café do mês!</p>
          </div>
          <div class="receipt-search-card bg-foam p-5 rounded-2xl comic-border shadow-comic mb-6 max-w-xl">
            <label class="block text-xs font-bold text-espresso uppercase mb-2">Digite o Nome do Colega Quitado:</label>
            <div class="receipt-search-row flex gap-2">
              <input v-model="receiptSearch" type="text" placeholder="Ex: Carlinhos do T.I." class="w-full bg-crema text-espresso font-bold px-4 py-2.5 rounded-xl comic-border focus:outline-none">
              <CafeButton variant="caramel" size="md" icon="pixelarticons:search" @click="searchAndShowReceipt">Gerar Recibo</CafeButton>
            </div>
          </div>
          <div v-if="selectedReceipt">
            <div id="printable-receipt" class="bg-foam p-6 sm:p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-2xl mx-auto relative overflow-hidden text-espresso">
              <div class="receipt-stamp absolute top-6 right-6 font-mono font-black text-xl px-4 py-2 rounded-xl uppercase tracking-widest stamp-approved pointer-events-none select-none z-10 inline-flex items-center gap-2">QUITADO <Icon icon="pixelarticons:coffee" /></div>
              <div class="receipt-header border-b-4 border-espresso pb-4 mb-4 flex items-center gap-3">
                <div class="w-12 h-12 bg-caramel rounded-xl comic-border flex items-center justify-center text-espresso text-3xl"><Icon icon="pixelarticons:coffee" /></div>
                <div><h3 class="text-xl font-black text-espresso tracking-tight">LICENÇA OFICIAL DE CONSUMO DE CAFÉ</h3><p class="text-[11px] font-mono font-bold text-mocha">REPUBLICA CAFEEIRA DA FIRMA S.A. • EDITAL MENSAL</p></div>
              </div>
              <div class="receipt-details space-y-4 font-mono text-xs sm:text-sm my-6">
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">Nº DA LICENÇA:</span><span class="font-bold text-espresso">CAF-2026-{{ selectedReceipt.id.slice(-4) }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">BENEFICIÁRIO(A):</span><span class="font-bold text-espresso text-sm uppercase">{{ selectedReceipt.name }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">SETOR:</span><span class="font-bold text-espresso">{{ selectedReceipt.dept || 'GERAL' }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">MÊS DE REFERÊNCIA:</span><span class="font-bold text-espresso">{{ settings.month }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">VALOR CONTRIBUÍDO:</span><span class="font-bold text-emerald-700 text-base">{{ formatMoney(settings.monthlyFee) }}</span></div>
                <div class="flex justify-between border-b border-espresso/20 pb-2"><span class="text-mocha font-bold">DATA DE REGISTRO:</span><span class="font-bold text-espresso">{{ selectedReceipt.paidAt || '14/08/2026 12:00' }}</span></div>
              </div>
              <div class="bg-latte/50 p-3 rounded-xl comic-border text-[11px] font-sans font-medium text-mocha mb-6"><strong>PARECER TÉCNICO:</strong> O portador deste documento possui passe livre para até 4 xícaras diárias de café puro ou com leite. Proibido colocar açúcar no bule coletivo. Válido até o último dia do mês corrente.</div>
              <div class="receipt-barcode text-center pt-2 border-t-2 border-dashed border-espresso/30"><div class="font-mono text-2xl font-black tracking-widest text-espresso mb-1 select-none">||||| | |||| ||| |||||| | ||||| ||| |||</div><p class="text-[9px] font-mono text-mocha uppercase">AUTENTICAÇÃO MECÂNICA DA CAFETEIRA DA FIRMA</p></div>
              <div class="receipt-actions mt-6 flex justify-end gap-2 print:hidden"><CafeButton variant="mint" size="md" icon="pixelarticons:printer" @click="printReceipt">Imprimir / Salvar PDF</CafeButton></div>
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
          <p v-if="adminManagementError" class="text-[11px] text-chili font-bold">Falha ao verificar o cargo: {{ adminManagementError }}</p>
          <p v-else-if="signedInWithWrongAccount" class="text-[11px] text-chili font-bold">Conta conectada sem permissão: {{ currentUser.email }}</p>
          <p v-else-if="authError" class="text-[11px] text-chili font-bold">{{ authError }}</p>
          <p v-else-if="!hasFirebaseConfig" class="text-[11px] text-chili font-bold">Configure o acesso remoto do app para liberar o login.</p>
          <p v-else class="text-[10px] text-mocha/70 italic">O acesso é liberado automaticamente para contas Google previamente convidadas.</p>
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

          <div v-if="isCoffeeMaster" class="bg-crema p-6 rounded-3xl comic-border-lg shadow-comic-xl">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b-2 border-espresso/20 pb-3">
              <div>
                <h3 class="text-lg font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:star" class="text-caramel text-2xl" /> Menu de Badges dos Levels</h3>
                <p class="text-xs text-mocha font-medium">Previa dos titulos, raridades e efeitos usados no perfil dos integrantes.</p>
              </div>
              <span class="bg-roast text-caramel text-[10px] font-black px-3 py-1 rounded-full comic-border uppercase font-mono">Mestre</span>
            </div>

            <div class="level-preview-grid">
              <div
                v-for="title in MEMBER_LEVEL_TITLES"
                :key="`${title.minLevel}-${title.title}`"
                class="level-preview-item comic-border"
                :class="`rank-${title.effectClass}`"
              >
                <span class="profile-external-border" aria-hidden="true"></span>
                <span class="level-preview-level" :class="`rank-${title.effectClass}`">LV {{ title.minLevel }}+</span>
                <span
                  class="user-avatar level-preview-avatar"
                  :class="`rank-${title.effectClass}`"
                  :title="`Prévia da borda: ${title.title}`"
                  aria-hidden="true"
                >
                  <Icon icon="pixelarticons:user" />
                </span>
                <span class="level-preview-badge" :class="[`is-${title.className}`, `rank-${title.effectClass}`]">
                  <span>{{ title.title }}</span>
                </span>
                <span class="level-preview-rarity">{{ title.rarity }}</span>
              </div>
            </div>
          </div>

          <div v-if="isCoffeeMaster" class="bg-crema p-4 sm:p-6 rounded-3xl comic-border-lg shadow-comic-xl space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-espresso/20 pb-3">
              <div>
                <h3 class="text-lg font-black text-espresso flex items-center gap-2"><Icon icon="pixelarticons:users" class="text-caramel text-2xl" /> Brigada Administrativa</h3>
                <p class="text-xs text-mocha font-medium">Convide uma conta Google, defina o cargo e revogue o acesso quando necessário.</p>
              </div>
              <CafeButton variant="foam" size="sm" icon="pixelarticons:reload" :disabled="adminManagementLoading" @click="refreshAdminManagement()">
                {{ adminManagementLoading ? 'CARREGANDO' : 'ATUALIZAR' }}
              </CafeButton>
            </div>

            <form class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-end bg-foam p-4 rounded-2xl comic-border" @submit.prevent="submitAdminInvite">
              <div>
                <label class="block text-xs font-bold text-espresso uppercase mb-1">E-mail da conta Google</label>
                <input v-model="adminInviteForm.email" type="email" autocomplete="off" placeholder="colega@gmail.com" required class="w-full bg-crema text-espresso font-bold p-2.5 rounded-xl comic-border text-sm font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-espresso uppercase mb-1">Cargo</label>
                <CafeSelect v-model="adminInviteForm.role" :options="adminRoleOptions" />
              </div>
              <CafeButton type="submit" variant="mint" size="md" icon="pixelarticons:user-plus" :disabled="adminManagementLoading">CONVIDAR</CafeButton>
            </form>

            <p class="text-[11px] text-mocha font-medium">O convite fica pendente até o colega entrar no Café Pass com exatamente essa conta Google. Nenhuma senha é criada ou compartilhada.</p>
            <p v-if="adminManagementError" class="text-xs text-chili font-bold">{{ adminManagementError }}</p>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div class="bg-foam rounded-2xl comic-border overflow-visible">
                <div class="px-4 py-3 bg-roast text-foam rounded-t-xl flex items-center justify-between gap-2">
                  <strong class="text-xs uppercase">Acessos ativos</strong>
                  <span class="text-[10px] font-mono text-caramel">{{ managedAdmins.length }}</span>
                </div>
                <div v-if="managedAdmins.length === 0" class="p-4 text-xs font-bold text-mocha">Nenhum outro administrador gerenciável.</div>
                <div v-for="admin in managedAdmins" :key="admin.uid" class="p-4 border-b-2 border-espresso/10 last:border-b-0 space-y-3">
                  <div class="min-w-0">
                    <p class="font-mono font-black text-sm text-espresso truncate">{{ admin.email }}</p>
                    <p class="text-[10px] font-bold text-caramel">{{ admin.isSelf ? 'VOCÊ' : roleLabel(admin.role) }}</p>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                    <CafeSelect :model-value="admin.role" :options="adminRoleOptions" @update:model-value="updateManagedAdminRole(admin, $event)" />
                    <CafeButton variant="chili" size="sm" icon="pixelarticons:trash" :disabled="admin.isSelf || adminManagementLoading" @click="requestManagedAccessRemoval('admin', admin)">REMOVER</CafeButton>
                  </div>
                </div>
              </div>

              <div class="bg-foam rounded-2xl comic-border overflow-visible">
                <div class="px-4 py-3 bg-roast text-foam rounded-t-xl flex items-center justify-between gap-2">
                  <strong class="text-xs uppercase">Convites pendentes</strong>
                  <span class="text-[10px] font-mono text-caramel">{{ pendingAdminInvites.length }}</span>
                </div>
                <div v-if="pendingAdminInvites.length === 0" class="p-4 text-xs font-bold text-mocha">Nenhum convite aguardando login.</div>
                <div v-for="invite in pendingAdminInvites" :key="invite.id" class="p-4 border-b-2 border-espresso/10 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-mono font-black text-sm text-espresso truncate">{{ invite.email }}</p>
                    <p class="text-[10px] font-bold text-caramel">{{ roleLabel(invite.role) }} · AGUARDANDO LOGIN</p>
                  </div>
                  <CafeButton variant="chili" size="sm" icon="pixelarticons:close" :disabled="adminManagementLoading" @click="requestManagedAccessRemoval('invite', invite)">CANCELAR</CafeButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <div
      v-if="adminRemovalTarget"
      class="fixed inset-0 bg-espresso/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-removal-title"
      @click.self="closeAdminRemovalModal"
    >
      <div class="bg-crema p-6 sm:p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-md w-full space-y-5 relative text-center">
        <button
          type="button"
          class="absolute top-4 right-4 bg-foam text-espresso rounded-xl w-8 h-8 comic-border flex items-center justify-center font-bold disabled:opacity-50"
          aria-label="Fechar confirmação"
          :disabled="adminManagementLoading"
          @click="closeAdminRemovalModal"
        >
          <Icon icon="pixelarticons:close" />
        </button>

        <div class="w-20 h-20 mx-auto bg-chili text-foam rounded-2xl comic-border shadow-comic grid place-items-center text-4xl">
          <Icon :icon="adminRemovalTarget.type === 'invite' ? 'pixelarticons:mail-delete' : 'pixelarticons:user-minus'" />
        </div>

        <div>
          <span class="text-[10px] font-black text-chili uppercase font-mono">Ação administrativa</span>
          <h2 id="admin-removal-title" class="text-2xl font-black text-espresso mt-1">
            {{ adminRemovalTarget.type === 'invite' ? 'Cancelar convite?' : 'Remover Mestre do Café?' }}
          </h2>
          <p class="text-sm text-mocha font-medium mt-2">
            {{ adminRemovalTarget.type === 'invite'
              ? 'Este convite deixará de aparecer para a conta Google informada.'
              : 'Esta conta perderá imediatamente o acesso ao Painel do Café.' }}
          </p>
        </div>

        <div class="bg-foam p-3 rounded-xl comic-border text-xs text-espresso font-mono font-black break-all">
          {{ adminRemovalTarget.entry.email }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CafeButton variant="foam" size="md" icon="pixelarticons:close" :disabled="adminManagementLoading" @click="closeAdminRemovalModal">
            VOLTAR
          </CafeButton>
          <CafeButton variant="chili" size="md" icon="pixelarticons:trash" :disabled="adminManagementLoading" @click="confirmManagedAccessRemoval">
            {{ adminManagementLoading ? 'REMOVENDO...' : (adminRemovalTarget.type === 'invite' ? 'CANCELAR CONVITE' : 'REMOVER ACESSO') }}
          </CafeButton>
        </div>
      </div>
    </div>

    <div v-if="joinModalOpen" class="fixed inset-0 bg-espresso/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-crema p-6 sm:p-8 rounded-3xl comic-border-lg shadow-comic-xl max-w-md w-full space-y-4 relative">
        <button @click="joinModalOpen = false" class="absolute top-4 right-4 bg-chili text-foam rounded-xl w-8 h-8 comic-border flex items-center justify-center font-bold"><Icon icon="pixelarticons:close" /></button>
        <h3 class="text-2xl font-black text-espresso flex items-center gap-2">Entrar na Vaquinha <Icon icon="pixelarticons:coffee" class="text-caramel" /></h3>
        <p class="text-xs text-mocha font-medium">Você pode entrar e sair nos meses que quiser sem ressentimentos!</p>
        <form @submit.prevent="handleJoinSubmit" class="space-y-3 pt-2">
          <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Seu Nome (Login Google)</label><input :value="signedInUserName" type="text" disabled class="w-full bg-latte/50 text-mocha font-bold p-3 rounded-xl comic-border cursor-not-allowed opacity-80"></div>
          <div><label class="block text-xs font-bold text-espresso uppercase mb-1">Seu Setor</label><input v-model="joinForm.dept" type="text" placeholder="Ex: Compras" class="w-full bg-foam text-espresso font-bold p-3 rounded-xl comic-border focus:outline-none"></div>
          <CafeButton type="submit" variant="mint" size="md" block icon="pixelarticons:user-plus">CONFIRMAR MINHA ENTRADA</CafeButton>
        </form>
      </div>
    </div>

    <footer v-if="authReady && isSignedIn" class="bg-roast text-latte comic-border-lg border-b-0 border-x-0 py-6 px-4 mt-auto">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs">
        <div class="flex items-center gap-3"><span class="text-3xl text-caramel"><Icon icon="pixelarticons:coffee" /></span><div><p class="font-bold text-foam text-sm">Café Pass - O Guardião do Coador</p><p class="text-latte/70">Feito para acabar com as briguinhas de quem tomou e não pagou.</p></div></div>
        <p class="font-mono text-caramel font-bold">Sem cota = Sem cafeína © 2026</p>
      </div>
    </footer>
  </div>
</template>
