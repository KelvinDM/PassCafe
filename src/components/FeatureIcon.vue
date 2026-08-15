<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  icon: { type: String, required: true },
  tone: { type: String, default: 'coffee' }
})
</script>

<template>
  <div class="feature-icon" :class="`feature-icon--${props.tone}`">
    <Icon :icon="props.icon" class="feature-icon__main" />
  </div>
</template>
