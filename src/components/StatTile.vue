<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: String, default: '' },
  tone: { type: String, default: 'foam' }
})
</script>

<template>
  <div class="stat-tile comic-border text-center" :class="`stat-tile--${props.tone}`">
    <span class="stat-tile__label">
      <Icon v-if="props.icon" :icon="props.icon" />
      {{ props.label }}
    </span>
    <span class="stat-tile__value">{{ props.value }}</span>
  </div>
</template>
