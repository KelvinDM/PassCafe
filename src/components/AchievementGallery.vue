<script setup>
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { ACHIEVEMENT_CATEGORIES } from '../data/achievements'

const props = defineProps({
  achievements: { type: Array, required: true },
  unlockedCount: { type: Number, required: true }
})

const selectedCategory = ref('Todas')
const showLocked = ref(true)

const filteredAchievements = computed(() => props.achievements.filter((achievement) => (
  (selectedCategory.value === 'Todas' || achievement.category === selectedCategory.value) &&
  (showLocked.value || achievement.unlocked)
)))

const completion = computed(() => Math.round((props.unlockedCount / props.achievements.length) * 100))

function formatNumber(value) {
  const number = Math.floor(Number(value) || 0)
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}K`
  return number.toLocaleString('pt-BR')
}

function unlockDate(value) {
  if (!value) return 'Conquista retroativa'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Conquista desbloqueada'
  return `Desbloqueada em ${date.toLocaleDateString('pt-BR')}`
}
</script>

<template>
  <section class="achievements-page" aria-labelledby="achievements-title">
    <header class="achievements-hero">
      <div class="achievements-hero-icon"><Icon icon="pixelarticons:trophy" /></div>
      <div class="achievements-hero-copy">
        <span>DIÁRIO DO CAFEZORD</span>
        <h2 id="achievements-title">CONQUISTAS</h2>
        <p>Cada xícara conta uma história. Continue preparando para completar sua coleção.</p>
      </div>
      <div class="achievement-total" :aria-label="`${unlockedCount} de ${achievements.length} conquistas desbloqueadas`">
        <strong>{{ unlockedCount }}<small>/{{ achievements.length }}</small></strong>
        <span>DESBLOQUEADAS</span>
      </div>
      <div class="achievement-completion-track" aria-hidden="true"><i :style="{ width: `${completion}%` }"></i></div>
      <strong class="achievement-completion-label">{{ completion }}% COMPLETO</strong>
    </header>

    <div class="achievement-toolbar">
      <div class="achievement-filters no-scrollbar" role="tablist" aria-label="Filtrar conquistas por categoria">
        <button
          v-for="category in ACHIEVEMENT_CATEGORIES"
          :key="category"
          type="button"
          :class="{ active: selectedCategory === category }"
          @click="selectedCategory = category"
        >{{ category }}</button>
      </div>
      <button type="button" class="achievement-lock-toggle" :class="{ active: showLocked }" @click="showLocked = !showLocked">
        <Icon :icon="showLocked ? 'pixelarticons:eye' : 'pixelarticons:eye-closed'" />
        {{ showLocked ? 'OCULTAR BLOQUEADAS' : 'MOSTRAR BLOQUEADAS' }}
      </button>
    </div>

    <div class="achievement-grid">
      <article
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        class="achievement-card"
        :class="[`rarity-${achievement.rarity}`, { unlocked: achievement.unlocked, locked: !achievement.unlocked }]"
      >
        <div class="achievement-art-wrap">
          <img :src="achievement.image" :alt="`Arte pixelada da conquista ${achievement.title}`" class="achievement-art">
          <span v-if="!achievement.unlocked" class="achievement-lock" aria-label="Conquista bloqueada"><Icon icon="pixelarticons:lock" /></span>
          <span v-else class="achievement-check" aria-label="Conquista desbloqueada"><Icon icon="pixelarticons:check" /></span>
          <span class="achievement-number">#{{ String(achievement.order).padStart(2, '0') }}</span>
        </div>
        <div class="achievement-card-body">
          <div class="achievement-card-meta">
            <span>{{ achievement.category }}</span>
            <b>{{ achievement.rarity }}</b>
          </div>
          <h3>{{ achievement.title }}</h3>
          <p>{{ achievement.phrase }}</p>
          <div class="achievement-progress-copy">
            <span>{{ achievement.unlocked ? unlockDate(achievement.unlockedAt) : 'PROGRESSO' }}</span>
            <strong>{{ formatNumber(achievement.current) }} / {{ formatNumber(achievement.target) }}</strong>
          </div>
          <div class="achievement-progress" :aria-label="`${Math.floor(achievement.progress)}% concluído`">
            <i :style="{ width: `${achievement.progress}%` }"></i>
          </div>
        </div>
      </article>
    </div>

    <div v-if="!filteredAchievements.length" class="achievement-empty">
      <Icon icon="pixelarticons:coffee-alt" />
      <strong>Nenhuma conquista neste filtro.</strong>
      <span>Tente outra categoria ou mostre as bloqueadas.</span>
    </div>
  </section>
</template>
