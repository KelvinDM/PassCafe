<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  autoBrew: { type: Number, required: true },
  canRebirth: { type: Boolean, required: true },
  clickBursts: { type: Array, required: true },
  clickerLevel: { type: Number, required: true },
  clickerUpgrades: { type: Array, required: true },
  clickPower: { type: Number, required: true },
  coffeeCoins: { type: Number, required: true },
  coinFes: { type: Number, required: true },
  currentWorld: { type: Object, required: true },
  gameStatus: { type: String, required: true },
  isSkillUnlocked: { type: Function, required: true },
  levelProgress: { type: Number, required: true },
  levelTarget: { type: Number, required: true },
  rebirthBillionBonus: { type: Number, required: true },
  rebirthBillions: { type: Number, required: true },
  rebirthConfirming: { type: Boolean, required: true },
  rebirthLevel: { type: Number, required: true },
  rebirthNextBillionTarget: { type: Number, required: true },
  rebirthProgress: { type: Number, required: true },
  rebirthReward: { type: Number, required: true },
  rebirths: { type: Number, required: true },
  shopView: { type: String, required: true },
  skillCost: { type: Function, required: true },
  skillTree: { type: Array, required: true },
  totalBrewed: { type: Number, required: true },
  upgradeCost: { type: Function, required: true }
})

defineEmits(['brew', 'buy-upgrade', 'buy-skill', 'rebirth', 'update-shop-view'])

const LEVEL_PERSONAS = Object.freeze([
  { aura: 'CALOR DO EXPRESSO', face: 'SORRISO CLÁSSICO' },
  { aura: 'MARÉ AZUL', face: 'KAWAII' },
  { aura: 'FOGO DO OÁSIS', face: 'MODO FÚRIA' },
  { aura: 'VENTO SAKURA', face: 'POKER FACE' },
  { aura: 'OURO DOS FARAÓS', face: 'MEWING DOURADO' },
  { aura: 'FORÇA DA TERRA', face: 'MODO ZEN' },
  { aura: 'ARCANO VIOLETA', face: 'SIDE EYE' },
  { aura: 'ENERGIA VERDE', face: 'CAOS CAFEINADO' },
  { aura: 'PLASMA LUNAR', face: 'CHOQUE TOTAL' },
  { aura: 'COSMOS INFINITO', face: 'BOSS FINAL' }
])

function levelPersona(level) {
  return LEVEL_PERSONAS[Math.min(LEVEL_PERSONAS.length - 1, Math.max(0, Number(level) - 1))]
}

function formatLevel(level) {
  return String(Math.max(1, Math.floor(Number(level) || 1))).padStart(2, '0')
}

function formatGameNumber(value) {
  const amount = Math.floor(Number(value) || 0)
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toLocaleString('pt-BR')
}
</script>

<template>
  <section class="brew-panel" aria-label="Café Clicker">
    <div class="brew-heading">
      <div>
        <span class="brew-kicker">{{ currentWorld.name }}</span>
        <h2>ESTAÇÃO DE PREPARO</h2>
      </div>
      <div class="brew-heading-status">
        <span :key="`heading-level-${clickerLevel}`" class="brew-level-chip"><small>NÍVEL</small><strong>{{ formatLevel(clickerLevel) }}</strong></span>
        <span class="brew-rate">+{{ formatGameNumber(autoBrew) }}/s</span>
      </div>
    </div>

    <div class="game-stats">
      <div><span>SALDO</span><strong>{{ formatGameNumber(coffeeCoins) }}</strong></div>
      <div><span>POR CLIQUE</span><strong>+{{ formatGameNumber(clickPower) }}</strong></div>
      <div><span>PRODUZIDOS</span><strong>{{ formatGameNumber(totalBrewed) }}</strong></div>
    </div>

    <div
      class="brew-stage"
      :class="[currentWorld.stageClass, `stage-level-${Math.min(clickerLevel, 10)}`]"
    >
      <img
        :key="currentWorld.background"
        class="stage-backdrop"
        :src="currentWorld.background"
        alt=""
        aria-hidden="true"
      >
      <div class="stage-atmosphere" aria-hidden="true">
        <i v-for="particle in 12" :key="particle"></i>
      </div>
      <div class="stage-nameplate" aria-hidden="true">
        <Icon icon="pixelarticons:map" />
        <span><small>DESTINO NV. {{ Math.min(clickerLevel, 10) }}</small><b>{{ currentWorld.label }}</b></span>
      </div>
      <div :key="`level-display-${clickerLevel}`" class="stage-level-display" aria-live="polite">
        <span>GAME LEVEL</span>
        <strong>{{ formatLevel(clickerLevel) }}</strong>
        <b>{{ levelPersona(clickerLevel).aura }}</b>
        <small>{{ levelPersona(clickerLevel).face }}</small>
      </div>
      <div v-if="clickerUpgrades[1].owned" class="barista-bot" aria-hidden="true"><i></i><b></b></div>
      <div v-if="clickerUpgrades[0].owned" class="pixel-grinder" aria-hidden="true"><i></i></div>
      <div v-if="clickerUpgrades[3].owned" class="pro-machine" aria-hidden="true"><i></i><b></b></div>
      <div v-if="clickerLevel >= 2" class="level-companion cloud-buddy" title="Pingo - desbloqueado no nível 2"><i></i><b></b></div>
      <div v-if="clickerLevel >= 4" class="level-companion koi-buddy" title="Koi - desbloqueada no nível 4"><i></i><b></b><em></em></div>
      <div v-if="clickerLevel >= 6" class="level-companion quetzal-buddy" title="Quetzal - desbloqueado no nível 6"><i></i><b></b><em></em></div>
      <div v-if="clickerLevel >= 8" class="level-companion mushroom-buddy" title="Cogumelo-luz - desbloqueado no nível 8"><i></i><b></b></div>
      <div v-if="clickerLevel >= 10" class="level-companion star-buddy" title="Estelinha - desbloqueada no nível 10"><i></i><b></b></div>
      <div v-if="clickerLevel >= 3" class="level-companion sugar-buddy" title="Cubinho - desbloqueado no nível 3"><i></i><b></b></div>
      <div v-if="clickerLevel >= 5" class="level-companion cookie-buddy" title="Biscoito - desbloqueado no nível 5"><i></i><b></b><em></em></div>
      <div v-if="clickerLevel >= 7" class="level-companion milk-buddy" title="Leitinho - desbloqueado no nível 7"><i></i><b></b></div>
      <div v-if="clickerLevel >= 9" class="level-companion bean-buddy" title="Grãozinho - desbloqueado no nível 9"><i></i><b></b></div>
      <div v-if="clickerLevel >= 12" class="level-companion donut-buddy" title="Donut - desbloqueado no nível 12"><i></i><b></b></div>
      <button
        type="button"
        class="brew-button"
        :class="[`cup-level-${Math.min(clickerLevel, 10)}`, { 'cup-ascended': clickerLevel >= 10 }]"
        :aria-label="`Preparar café no nível ${clickerLevel}`"
        @click="$emit('brew', $event)"
      >
        <span :key="`aura-${clickerLevel}`" class="cup-aura" aria-hidden="true">
          <b class="aura-ring"></b>
          <em class="aura-emblem"></em>
          <i v-for="auraParticle in 12" :key="auraParticle"></i>
        </span>
        <span class="cup-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="cup-steam steam-a"></span>
        <span class="cup-steam steam-b"></span>
        <span class="cup-steam steam-c"></span>
        <span :key="clickerLevel" class="brew-cup">
          <span class="cup-face" aria-hidden="true"><i></i><b></b><em></em></span>
          <Icon icon="pixelarticons:coffee-alt" />
        </span>
        <span class="tap-label">CLIQUE PARA PREPARAR</span>
        <span
          v-for="burst in clickBursts"
          :key="burst.id"
          class="coffee-burst"
          :class="{ 'is-critical': burst.critical }"
          :style="{ left: `${burst.x}px`, top: `${burst.y}px` }"
        >+{{ formatGameNumber(burst.value) }}</span>
      </button>
    </div>

    <div class="level-track">
      <div class="level-copy"><span>{{ gameStatus }}</span><strong>{{ Math.floor(levelProgress) }}%</strong></div>
      <div class="level-bar"><i :style="{ width: `${levelProgress}%` }"></i></div>
      <div class="level-goal">PRÓXIMO NÍVEL DO GAME EM {{ formatGameNumber(levelTarget - totalBrewed) }} CAFÉS</div>
    </div>
  </section>

  <aside class="upgrade-shop">
    <div class="shop-heading">
      <div>
        <span>{{ shopView === 'upgrades' ? 'POWER-UPS' : 'PROGRESSO PERMANENTE' }}</span>
        <h2>{{ shopView === 'upgrades' ? 'LOJA DE UPGRADES' : 'ÁRVORE DE HABILIDADES' }}</h2>
      </div>
      <Icon :icon="shopView === 'upgrades' ? 'pixelarticons:shopping-bag' : 'pixelarticons:tree'" />
    </div>

    <div class="shop-tabs" role="tablist" aria-label="Progressão do clicker">
      <button type="button" :class="{ active: shopView === 'upgrades' }" @click="$emit('update-shop-view', 'upgrades')">
        <Icon icon="pixelarticons:shopping-bag" /> UPGRADES
      </button>
      <button type="button" :class="{ active: shopView === 'skills' }" @click="$emit('update-shop-view', 'skills')">
        <Icon icon="pixelarticons:tree" /> HABILIDADES
      </button>
    </div>

    <div class="shop-scroll">
    <div v-if="shopView === 'upgrades'" class="upgrade-list">
      <button
        v-for="upgrade in clickerUpgrades"
        :key="upgrade.id"
        type="button"
        class="upgrade-button"
        :class="{ 'can-buy': coffeeCoins >= upgradeCost(upgrade) }"
        @click="$emit('buy-upgrade', upgrade)"
      >
        <span class="upgrade-icon"><Icon :icon="upgrade.icon" /></span>
        <span class="upgrade-info">
          <strong>{{ upgrade.name }}</strong>
          <small>{{ upgrade.description }}</small>
        </span>
        <span class="upgrade-price">
          <b>{{ formatGameNumber(upgradeCost(upgrade)) }}</b>
          <small>NV. {{ upgrade.owned }}</small>
        </span>
      </button>
    </div>

    <div v-else class="skill-tree">
      <div class="coinfe-balance">
        <Icon icon="pixelarticons:coin" />
        <span>Saldo permanente</span>
        <strong>{{ formatGameNumber(coinFes) }} CoinFés</strong>
      </div>
      <button
        v-for="skill in skillTree"
        :key="skill.id"
        type="button"
        class="skill-node"
        :class="[`branch-${skill.branch}`, { locked: !isSkillUnlocked(skill), maxed: skill.level >= skill.maxLevel }]"
        :disabled="!isSkillUnlocked(skill)"
        @click="$emit('buy-skill', skill)"
      >
        <span class="skill-node-icon"><Icon :icon="isSkillUnlocked(skill) ? skill.icon : 'pixelarticons:lock'" /></span>
        <span class="skill-node-copy"><strong>{{ skill.name }}</strong><small>{{ skill.description }}</small></span>
        <span class="skill-node-level">
          <b>{{ skill.level }}/{{ skill.maxLevel }}</b>
          <small v-if="skill.level < skill.maxLevel">{{ skillCost(skill) }} CF</small>
          <small v-else>MAX</small>
        </span>
      </button>
    </div>

    <div class="rebirth-card" :class="{ ready: canRebirth }">
      <div class="rebirth-title">
        <span><Icon icon="pixelarticons:repeat" /> RENASCIMENTO {{ rebirths }}</span>
        <strong v-if="canRebirth">+{{ rebirthReward }} CoinFé{{ rebirthReward > 1 ? 's' : '' }}</strong>
        <strong v-else>NÍVEL {{ rebirthLevel }}</strong>
      </div>
      <div class="rebirth-bar"><i :style="{ width: `${rebirthProgress}%` }"></i></div>
      <div v-if="canRebirth" class="rebirth-farm-status">
        <span><Icon icon="pixelarticons:coin" /> {{ rebirthBillions }} bilh{{ rebirthBillions === 1 ? 'ão' : 'ões' }} contabilizado{{ rebirthBillions === 1 ? '' : 's' }}</span>
        <strong>+{{ rebirthBillionBonus }} CF de farm</strong>
        <small>Próximo +1 CoinFé em {{ formatGameNumber(Math.max(0, rebirthNextBillionTarget - totalBrewed)) }} cafés</small>
      </div>
      <button type="button" class="rebirth-button" :class="{ confirming: rebirthConfirming }" @click="$emit('rebirth')">
        <Icon :icon="canRebirth ? 'pixelarticons:repeat' : 'pixelarticons:lock'" />
        {{ rebirthConfirming ? 'CONFIRMAR RENASCIMENTO' : canRebirth ? 'RENASCER AGORA' : `DESBLOQUEIA NO NÍVEL ${rebirthLevel}` }}
      </button>
      <small class="rebirth-rule">Reinicia somente a rodada do game. Perfil, renascimentos, habilidades e CoinFés são permanentes. Cada bilhão adicional produzido antes de renascer concede +1 CoinFé.</small>
    </div>

    <div class="shop-tip">
      <Icon :icon="shopView === 'upgrades' ? 'pixelarticons:trending-up' : 'pixelarticons:coin'" />
      <span>{{ shopView === 'upgrades' ? 'Só o game e seus upgrades reiniciam; o nível do perfil nunca é zerado.' : 'Habilidades, CoinFés e nível do perfil permanecem após cada renascimento.' }}</span>
    </div>
    </div>
  </aside>
</template>
